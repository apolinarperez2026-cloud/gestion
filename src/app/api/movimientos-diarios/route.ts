import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { parseDateOnly, createDateRange } from '@/lib/dateUtils'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Obtener el token del header Authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    // Si es administrador sin sucursal específica, mostrar todos los movimientos diarios
    // Si tiene sucursal específica, filtrar por esa sucursal
    const whereClause = decoded.rol === 'Administrador' && !decoded.sucursalId 
      ? {} 
      : decoded.sucursalId 
        ? { sucursalId: decoded.sucursalId }
        : {}

    const movimientosDiarios = await prisma.movimientoDiario.findMany({
      where: whereClause,
      include: {
        sucursal: true,
        usuario: {
          include: {
            rol: true
          }
        }
      },
      orderBy: { fecha: 'desc' }
    })

    return NextResponse.json({ movimientosDiarios })
  } catch (error) {
    console.error('Error al obtener movimientos diarios:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      fecha,
      ventasBrutas,
      efectivo,
      credito,
      abonosCredito,
      recargas,
      pagoTarjeta,
      transferencias,
      observaciones,
      sucursalId,
      usuarioId 
    } = await request.json()

    console.log('Datos recibidos:', { 
      fecha,
      fechaOriginal: fecha,
      fechaComoDate: new Date(fecha),
      fechaISO: new Date(fecha).toISOString(),
      ventasBrutas,
      efectivo,
      credito,
      abonosCredito,
      recargas,
      pagoTarjeta,
      transferencias,
      observaciones,
      sucursalId,
      usuarioId 
    })

    if (!fecha || !sucursalId) {
      console.log('Validación fallida:', {
        fecha: !!fecha,
        sucursalId: !!sucursalId
      })
      return NextResponse.json(
        { error: 'Fecha y sucursal son campos requeridos' },
        { status: 400 }
      )
    }

    // Crear fecha específica sin horario
    const fechaEspecifica = parseDateOnly(fecha)
    
    // Crear rango de fechas para el día
    const { fechaInicio, fechaFin } = createDateRange(fecha)

    const gastosDelDia = await prisma.movimiento.findMany({
      where: {
        tipo: 'GASTO',
        sucursalId: sucursalId,
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        }
      }
    })

    const totalGastos = gastosDelDia.reduce((sum, gasto) => sum + gasto.monto, 0)
    
    console.log('Gastos encontrados:', {
      cantidad: gastosDelDia.length,
      gastos: gastosDelDia.map(g => ({ id: g.id, fecha: g.fecha, monto: g.monto, descripcion: g.descripcion })),
      totalGastos
    })

    // Calcular total de depósitos bancarios del día desde la tabla Deposito
    const depositosDelDia = await prisma.deposito.findMany({
      where: {
        sucursalId: sucursalId,
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        }
      }
    })

    const totalDepositos = depositosDelDia.reduce((sum, deposito) => sum + deposito.monto, 0)
    
    console.log('Depósitos bancarios encontrados:', {
      cantidad: depositosDelDia.length,
      depositos: depositosDelDia.map(d => ({ id: d.id, fecha: d.fecha, monto: d.monto })),
      totalDepositos
    })

    // Calcular fondo inicial de caja del día
    const fondoInicialDelDia = await prisma.fondoCajaInicial.findFirst({
      where: {
        sucursalId: sucursalId,
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        }
      }
    })

    const totalFondoInicial = fondoInicialDelDia ? fondoInicialDelDia.monto : 0
    
    console.log('Fondo inicial encontrado:', {
      existe: !!fondoInicialDelDia,
      fondo: fondoInicialDelDia ? { id: fondoInicialDelDia.id, fecha: fondoInicialDelDia.fecha, monto: fondoInicialDelDia.monto } : null,
      totalFondoInicial
    })

    // Calcular total de cobros TPV del día
    const cobrosTpvDelDia = await prisma.tpv.findMany({
      where: {
        sucursalId: sucursalId,
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        },
        estado: 'exitoso' // Solo contar cobros exitosos
      }
    })

    const totalTpvDelDia = cobrosTpvDelDia.reduce((sum, tpv) => sum + tpv.monto, 0)

    // Calcular el saldo del día (incluyendo depósitos como ingreso y fondo inicial)
    const saldoDia = parseFloat(ventasBrutas) - totalGastos + totalDepositos + totalFondoInicial
    
    const movimientoDiario = await prisma.movimientoDiario.create({
      data: {
        fecha: fechaEspecifica,
        ventasBrutas: parseFloat(ventasBrutas) || 0,
        efectivo: parseFloat(efectivo) || 0,
        credito: parseFloat(credito) || 0,
        abonosCredito: parseFloat(abonosCredito) || 0,
        recargas: parseFloat(recargas) || 0,
        pagoTarjeta: totalTpvDelDia, // Cargado automáticamente desde cobros TPV
        transferencias: parseFloat(transferencias) || 0,
        gastos: totalGastos, // Cargado automáticamente desde movimientos
        depositos: totalDepositos, // Suma de depósitos del día
        fondoInicial: totalFondoInicial, // Fondo inicial de caja del día
        saldoDia,
        observaciones: observaciones || null,
        sucursalId,
        usuarioId: usuarioId || null
      },
      include: {
        sucursal: true,
        usuario: {
          include: {
            rol: true
          }
        }
      }
    })

    return NextResponse.json({ 
      movimientoDiario,
      gastosEncontrados: gastosDelDia.length,
      totalGastosCalculado: totalGastos,
      depositosEncontrados: depositosDelDia.length,
      totalDepositosCalculado: totalDepositos,
      fondoInicialEncontrado: !!fondoInicialDelDia,
      totalFondoInicialCalculado: totalFondoInicial,
      cobrosTpvEncontrados: cobrosTpvDelDia.length,
      totalTpvCalculado: totalTpvDelDia
    }, { status: 201 })
  } catch (error: any) {
    // Si es un error de constraint único (fecha + sucursal)
    if (error.code === 'P2002') {
      console.log('Movimiento diario ya existe para esta fecha y sucursal')
      return NextResponse.json(
        { error: 'Ya existe un movimiento diario para esta fecha y sucursal' },
        { status: 409 }
      )
    }
    
    console.error('Error al crear movimiento diario:', error)
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
