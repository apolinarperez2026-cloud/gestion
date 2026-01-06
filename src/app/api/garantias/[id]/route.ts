import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { parseDateOnly } from '@/lib/dateUtils'

// DELETE - Eliminar garantía
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    // Verificar que el usuario es administrador
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
      include: { rol: true }
    })

    if (!usuario || usuario.rol.nombre !== 'Administrador') {
      return NextResponse.json(
        { error: 'No tienes permisos para eliminar garantías' },
        { status: 403 }
      )
    }

    const { id } = await params
    const garantiaId = parseInt(id)

    // Verificar que la garantía existe y pertenece a la sucursal del usuario
    const garantiaExistente = await prisma.garantia.findFirst({
      where: {
        id: garantiaId,
        sucursalId: decoded.sucursalId
      }
    })

    if (!garantiaExistente) {
      return NextResponse.json(
        { error: 'Garantía no encontrada' },
        { status: 404 }
      )
    }

    // Eliminar la garantía
    await prisma.garantia.delete({
      where: { id: garantiaId }
    })

    return NextResponse.json({ 
      message: 'Garantía eliminada exitosamente'
    }, { status: 200 })

  } catch (error) {
    console.error('Error al eliminar garantía:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar garantía
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    const body = await request.json()
    const {
      fechaRegistro,
      cliente,
      marca,
      sku,
      cantidad,
      descripcion,
      estado
    } = body

    const { id } = await params
    const garantiaId = parseInt(id)

    // Verificar que la garantía existe y pertenece a la sucursal del usuario
    const garantiaExistente = await prisma.garantia.findFirst({
      where: {
        id: garantiaId,
        sucursalId: decoded.sucursalId
      }
    })

    if (!garantiaExistente) {
      return NextResponse.json(
        { error: 'Garantía no encontrada' },
        { status: 404 }
      )
    }

    // Actualizar solo los campos básicos de la garantía
    const updateData: any = {}
    
    if (fechaRegistro !== undefined) {
      updateData.fechaRegistro = fechaRegistro ? parseDateOnly(fechaRegistro) : garantiaExistente.fechaRegistro
    }
    
    if (cliente !== undefined) {
      updateData.cliente = cliente
    }
    
    if (marca !== undefined) {
      updateData.marca = marca
    }
    
    if (sku !== undefined) {
      updateData.sku = sku
    }
    
    if (cantidad !== undefined) {
      const parsedCantidad = parseInt(cantidad)
      if (!isNaN(parsedCantidad) && parsedCantidad > 0) {
        updateData.cantidad = parsedCantidad
      }
    }
    
    if (descripcion !== undefined) {
      updateData.descripcion = descripcion
    }

    if (estado !== undefined) {
      updateData.estado = estado
    }

    const garantia = await prisma.garantia.update({
      where: { id: garantiaId },
      data: updateData,
      include: {
        sucursal: true,
        usuario: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    })

    return NextResponse.json({ garantia })
  } catch (error) {
    console.error('Error al actualizar garantía:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
