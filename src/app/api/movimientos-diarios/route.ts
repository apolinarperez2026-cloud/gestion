import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

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
      : { sucursalId: decoded.sucursalId }

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

    // Crear fecha específica para evitar problemas de zona horaria
    const fechaEspecifica = new Date(fecha + 'T12:00:00.000Z') // Mediodía UTC para evitar cambios de día
    
    // Calcular gastos del día desde la tabla movimientos usando la misma fecha específica
    const fechaInicio = new Date(fechaEspecifica)
    fechaInicio.setHours(0, 0, 0, 0)
    
    const fechaFin = new Date(fechaEspecifica)
    fechaFin.setHours(23, 59, 59, 999)

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

    // Calcular total de fondos de caja del día desde movimientos
    const fondosCajaDelDia = await prisma.movimiento.findMany({
      where: {
        tipo: 'FONDO_CAJA',
        sucursalId: sucursalId,
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        }
      }
    })

    const totalFondosCaja = fondosCajaDelDia.reduce((sum, fondo) => sum + fondo.monto, 0)
    
    console.log('Fondos de caja encontrados:', {
      cantidad: fondosCajaDelDia.length,
      fondos: fondosCajaDelDia.map(f => ({ id: f.id, fecha: f.fecha, monto: f.monto, descripcion: f.descripcion })),
      totalFondosCaja
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

    // Calcular el saldo del día (incluyendo fondos de caja como ingreso)
    const saldoDia = parseFloat(ventasBrutas) - totalGastos + totalFondosCaja
    
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
        fondoCaja: totalFondosCaja, // Cargado automáticamente desde movimientos
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
