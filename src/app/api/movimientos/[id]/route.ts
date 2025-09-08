import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Token vacío' }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const body = await request.json()
    const { id: idParam } = await params
    const id = parseInt(idParam)

    const movimiento = await prisma.movimiento.update({
      where: { id },
      data: {
        fecha: body.fecha,
        tipo: 'MOVIMIENTO',
        categoria: body.tipoPago || 'ventasBrutas',
        monto: body.monto,
        descripcion: `Venta Bruta: $${body.ventasBrutas}${body.tipoPago ? `, ${body.tipoPago}: $${body.importeTipoPago}` : ''}${body.depositoManual ? `, Depósito Manual: $${body.depositoManual}` : ''}`,
        ventasBrutas: body.ventasBrutas,
        credito: body.credito,
        abonosCredito: body.abonosCredito,
        recargas: body.recargas,
        pagoTarjeta: body.pagoTarjeta,
        transferencias: body.transferencias,
        gastos: body.gastos,
        depositoManual: body.depositoManual,
      }
    })

    return NextResponse.json({
      message: 'Movimiento actualizado exitosamente',
      movimiento
    })
  } catch (error) {
    console.error('Error al actualizar movimiento:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Token vacío' }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const { id: idParam } = await params
    const id = parseInt(idParam)

    await prisma.movimiento.delete({
      where: { id }
    })

    return NextResponse.json({
      message: 'Movimiento eliminado exitosamente'
    })
  } catch (error) {
    console.error('Error al eliminar movimiento:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
