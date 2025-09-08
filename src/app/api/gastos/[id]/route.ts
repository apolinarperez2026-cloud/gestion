import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar token de autenticación
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    const { id: idParam } = await params
    const id = parseInt(idParam)

    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const body = await request.json()
    const { fecha, tipoGastoId, monto, descripcion, referencia } = body

    // Validar datos requeridos
    if (!fecha || !tipoGastoId || !monto || !descripcion) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    // Usar la sucursal del token JWT
    const sucursalId = decoded.sucursalId

    if (!sucursalId) {
      return NextResponse.json({ error: 'No se puede determinar la sucursal' }, { status: 400 })
    }

    // Actualizar el gasto
    const gasto = await prisma.gasto.update({
      where: { id },
      data: {
        fecha: new Date(fecha),
        tipoGastoId: parseInt(tipoGastoId),
        monto: parseFloat(monto),
        descripcion,
        referencia: referencia || null
      },
      include: {
        tipoGasto: true
      }
    })

    return NextResponse.json(gasto)

  } catch (error) {
    console.error('Error al actualizar gasto:', error)
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
    // Verificar token de autenticación
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    const { id: idParam } = await params
    const id = parseInt(idParam)

    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    // Usar la sucursal del token JWT
    const sucursalId = decoded.sucursalId

    if (!sucursalId) {
      return NextResponse.json({ error: 'No se puede determinar la sucursal' }, { status: 400 })
    }

    // Eliminar el gasto
    await prisma.gasto.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Gasto eliminado correctamente' })

  } catch (error) {
    console.error('Error al eliminar gasto:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
