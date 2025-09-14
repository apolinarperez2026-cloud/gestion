import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const movimientosDiarios = await prisma.movimientoDiario.findMany({
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

    // Calcular gastos del día desde la tabla movimientos
    const fechaInicio = new Date(fecha)
    fechaInicio.setHours(0, 0, 0, 0)
    
    const fechaFin = new Date(fecha)
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

    // Calcular el saldo del día
    const saldoDia = parseFloat(ventasBrutas) - totalGastos

    const movimientoDiario = await prisma.movimientoDiario.create({
      data: {
        fecha: new Date(fecha),
        ventasBrutas: parseFloat(ventasBrutas) || 0,
        efectivo: parseFloat(efectivo) || 0,
        credito: parseFloat(credito) || 0,
        abonosCredito: parseFloat(abonosCredito) || 0,
        recargas: parseFloat(recargas) || 0,
        pagoTarjeta: parseFloat(pagoTarjeta) || 0,
        transferencias: parseFloat(transferencias) || 0,
        gastos: totalGastos, // Cargado automáticamente desde movimientos
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
      totalGastosCalculado: totalGastos
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
