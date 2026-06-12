import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { parseDateOnly, createDateRange, createMonthRange } from '@/lib/dateUtils'
import { roundCurrency } from '@/lib/formatters'
import { calculateSaldoDia, getMovimientoDiarioAssociatedTotals } from '@/lib/movimientoDiarioCalculations'

const prisma = new PrismaClient()
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Obtener el token del header Authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    // Obtener parámetros de la URL
    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month')
    const fechaInicioParam = searchParams.get('fechaInicio')
    const fechaFinParam = searchParams.get('fechaFin')
    const sucursalIdParam = searchParams.get('sucursalId')
    const bloqueIdParam = searchParams.get('bloqueId')

    // Administrador siempre ve todos los datos (filtrado client-side en resumen)
    // ?sucursalId= o ?bloqueId= pueden restringir opcionalmente
    let whereClause: any = decoded.rol === 'Administrador'
      ? (sucursalIdParam
          ? { sucursalId: parseInt(sucursalIdParam) }
          : bloqueIdParam
            ? {} // se resuelve abajo
            : {})
      : decoded.sucursalId
        ? { sucursalId: decoded.sucursalId }
        : {}

    // Filtro por bloque: resolvemos las sucursales que pertenecen al bloque
    if (bloqueIdParam && decoded.rol === 'Administrador') {
      const bloqueSucursales = await prisma.bloqueSucursal.findMany({
        where: { bloqueId: parseInt(bloqueIdParam) },
        select: { sucursalId: true }
      })
      const ids = bloqueSucursales.map(bs => bs.sucursalId)
      whereClause = ids.length > 0 ? { sucursalId: { in: ids } } : { sucursalId: -1 }
    }

    // Prioridad: fechaInicio+fechaFin > month
    if (fechaInicioParam && fechaFinParam) {
      const { fechaInicio } = createDateRange(fechaInicioParam)
      const { fechaFin } = createDateRange(fechaFinParam)
      whereClause.fecha = { gte: fechaInicio, lte: fechaFin }
    } else if (monthParam) {
      const [year, month] = monthParam.split('-')
      if (year && month) {
        const { fechaInicio, fechaFin } = createMonthRange(parseInt(year), parseInt(month))
        whereClause.fecha = { gte: fechaInicio, lte: fechaFin }
      }
    }

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
    
    const associatedTotals = await getMovimientoDiarioAssociatedTotals(prisma, fechaEspecifica, sucursalId)
    const {
      totalGastos,
      totalPagoTarjeta,
      totalDepositos,
      totalFondoInicial,
      gastosEncontrados,
      cobrosTpvEncontrados,
      depositosEncontrados,
      fondoInicialEncontrado,
    } = associatedTotals

    // Calcular el saldo del día (incluyendo depósitos como ingreso y fondo inicial)
    const ventasBrutasFinal = roundCurrency(ventasBrutas)
    const efectivoFinal = roundCurrency(efectivo)
    const creditoFinal = roundCurrency(credito)
    const abonosCreditoFinal = roundCurrency(abonosCredito)
    const recargasFinal = roundCurrency(recargas)
    const transferenciasFinal = roundCurrency(transferencias)
    const saldoDia = calculateSaldoDia(ventasBrutasFinal, totalGastos, totalDepositos, totalFondoInicial)
    
    const movimientoDiario = await prisma.movimientoDiario.create({
      data: {
        fecha: fechaEspecifica,
        ventasBrutas: ventasBrutasFinal,
        efectivo: efectivoFinal,
        credito: creditoFinal,
        abonosCredito: abonosCreditoFinal,
        recargas: recargasFinal,
        pagoTarjeta: totalPagoTarjeta, // Cargado automáticamente desde cobros TPV
        transferencias: transferenciasFinal,
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
      gastosEncontrados,
      totalGastosCalculado: totalGastos,
      depositosEncontrados,
      totalDepositosCalculado: totalDepositos,
      fondoInicialEncontrado,
      totalFondoInicialCalculado: totalFondoInicial,
      cobrosTpvEncontrados,
      totalTpvCalculado: totalPagoTarjeta
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
