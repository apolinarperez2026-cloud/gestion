import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const userId = decoded.userId

    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      include: { sucursal: true }
    })

    if (!user || !user.sucursal) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const movimientosDiarios = await prisma.movimientoDiario.findMany({
      where: { sucursalId: user.sucursal.id },
      include: {
        ventas: {
          include: { tipoVenta: true }
        },
        gastos: {
          include: { tipoGasto: true }
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
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const userId = decoded.userId

    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      include: { sucursal: true }
    })

    if (!user || !user.sucursal) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const {
      fecha,
      totalVentas,
      totalEfectivo,
      totalCredito,
      totalAbonosCredito,
      totalRecargas,
      totalPagoTarjeta,
      totalTransferencias,
      totalGastos,
      depositoManual,
      saldoDia
    } = await request.json()

    // Verificar si ya existe un movimiento para esta fecha
    const movimientoExistente = await prisma.movimientoDiario.findFirst({
      where: {
        sucursalId: user.sucursal.id,
        fecha: new Date(fecha)
      }
    })

    if (movimientoExistente) {
      return NextResponse.json(
        { error: 'Ya existe un movimiento para esta fecha' },
        { status: 400 }
      )
    }

    const movimientoDiario = await prisma.movimientoDiario.create({
      data: {
        fecha: new Date(fecha),
        sucursalId: user.sucursal.id,
        totalVentas,
        totalEfectivo,
        totalCredito,
        totalAbonosCredito,
        totalRecargas,
        totalPagoTarjeta,
        totalTransferencias,
        totalGastos,
        depositoManual,
        saldoDia
      }
    })

    return NextResponse.json({ movimientoDiario })
  } catch (error) {
    console.error('Error al crear movimiento diario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
