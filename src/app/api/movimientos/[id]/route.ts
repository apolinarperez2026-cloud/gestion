import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { 
      descripcion, 
      monto, 
      tipo, 
      formaDePagoId, 
      tipoGastoId 
    } = await request.json()

    console.log('Actualizando movimiento:', { 
      id,
      descripcion, 
      monto, 
      tipo, 
      formaDePagoId, 
      tipoGastoId 
    })

    if (!descripcion || !monto || !tipo) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // Validar que si es VENTA tenga formaDePagoId, si es GASTO tenga tipoGastoId
    if (tipo === 'VENTA' && !formaDePagoId) {
      return NextResponse.json(
        { error: 'Las ventas requieren una forma de pago' },
        { status: 400 }
      )
    }

    if (tipo === 'GASTO' && !tipoGastoId) {
      return NextResponse.json(
        { error: 'Los gastos requieren un tipo de gasto' },
        { status: 400 }
      )
    }

    const movimiento = await prisma.movimiento.update({
      where: { id: parseInt(id) },
      data: {
        descripcion,
        monto,
        tipo,
        formaDePagoId: tipo === 'VENTA' ? formaDePagoId : null,
        tipoGastoId: tipo === 'GASTO' ? tipoGastoId : null
      },
      include: {
        formaDePago: true,
        tipoGasto: true,
        sucursal: true
      }
    })

    return NextResponse.json({ movimiento })
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
    const { id } = await params

    console.log('Eliminando movimiento:', { id })

    await prisma.movimiento.delete({
      where: { id: parseInt(id) }
    })

    return NextResponse.json({ message: 'Movimiento eliminado exitosamente' })
  } catch (error) {
    console.error('Error al eliminar movimiento:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}