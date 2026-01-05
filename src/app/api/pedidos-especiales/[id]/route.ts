import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

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
    const { id: idParam } = await params
    const id = parseInt(idParam)

    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    // Solo los administradores pueden eliminar pedidos
    if (decoded.rol !== 'Administrador') {
      return NextResponse.json(
        { error: 'No tienes permisos para eliminar pedidos' },
        { status: 403 }
      )
    }

    // Verificar que el pedido existe
    // Si el usuario es administrador, puede ver cualquier pedido
    // Si no es administrador, solo puede ver pedidos de sus sucursales asignadas
    let whereClause: any = { id }
    
    if (decoded.rol !== 'Administrador') {
      if (decoded.sucursalId) {
        whereClause.sucursalId = decoded.sucursalId
      } else {
        // Si no tiene sucursalId, verificar sus sucursales asignadas
        const usuarioConSucursales = await prisma.usuario.findUnique({
          where: { id: decoded.userId },
          include: {
            sucursales: {
              select: { sucursalId: true }
            }
          }
        })
        
        if (usuarioConSucursales && usuarioConSucursales.sucursales.length > 0) {
          whereClause.sucursalId = {
            in: usuarioConSucursales.sucursales.map(s => s.sucursalId)
          }
        } else {
          // Si no tiene sucursales asignadas, usar la sucursal principal
          whereClause.sucursalId = decoded.sucursalId
        }
      }
    }

    const pedidoExistente = await prisma.pedidoEspecial.findFirst({
      where: whereClause,
      include: {
        creador: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    })

    if (!pedidoExistente) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    // Usar transacción para eliminar pedido y crear auditoría
    await prisma.$transaction(async (tx) => {
      // Eliminar historial del pedido primero (por la relación foreign key)
      await tx.pedidoEspecialHistorial.deleteMany({
        where: { pedidoId: id }
      })

      // Eliminar el pedido
      await tx.pedidoEspecial.delete({
        where: { id }
      })

      // Crear registro de auditoría (en una tabla separada si existe)
      // Opcional: podrías guardar un log de eliminación en una tabla de auditoría general
    })

    return NextResponse.json({
      message: 'Pedido eliminado exitosamente'
    })

  } catch (error) {
    console.error('Error al eliminar pedido:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

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
    const { id: idParam } = await params
    const id = parseInt(idParam)

    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const body = await request.json()
    const { marca, codigo, cantidad, descripcion, precioVenta, total, anticipo, fechaPedido } = body

    // Validar datos requeridos
    if (!marca || !codigo || !cantidad || !descripcion || !precioVenta || !anticipo || !fechaPedido) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      )
    }

// Verificar que el pedido existe
    // Si el usuario es administrador, puede ver cualquier pedido
    // Si no es administrador, solo puede ver pedidos de sus sucursales asignadas
    let whereClause: any = { id }
    
    if (decoded.rol !== 'Administrador') {
      if (decoded.sucursalId) {
        whereClause.sucursalId = decoded.sucursalId
      } else {
        // Si no tiene sucursalId, verificar sus sucursales asignadas
        const usuarioConSucursales = await prisma.usuario.findUnique({
          where: { id: decoded.userId },
          include: {
            sucursales: {
              select: { sucursalId: true }
            }
          }
        })
        
        if (usuarioConSucursales && usuarioConSucursales.sucursales.length > 0) {
          whereClause.sucursalId = {
            in: usuarioConSucursales.sucursales.map(s => s.sucursalId)
          }
        } else {
          // Si no tiene sucursales asignadas, usar la sucursal principal
          whereClause.sucursalId = decoded.sucursalId
        }
      }
    }

    const pedidoExistente = await prisma.pedidoEspecial.findFirst({
      where: whereClause,
      include: {
        creador: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    })

    if (!pedidoExistente) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    // No permitir editar pedidos entregados, excepto para administradores
    if (pedidoExistente.estado === 'Entregado' && decoded.rol !== 'Administrador') {
      return NextResponse.json(
        { error: 'No se puede editar un pedido entregado' },
        { status: 400 }
      )
    }

// Actualizar el pedido (sin transacción por ahora para aislar el error)
    const pedidoActualizado = await prisma.pedidoEspecial.update({
      where: { id },
      data: {
        marca,
        codigo,
        cantidad: parseInt(cantidad),
        descripcion,
        precioVenta: parseFloat(precioVenta),
        total: parseFloat(total),
        anticipo: parseFloat(anticipo),
        fechaPedido: new Date(fechaPedido),
        actualizadoPor: decoded.userId,
        actualizadoEn: new Date()
      },
      include: {
        creador: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    })

return NextResponse.json({
      message: 'Pedido actualizado exitosamente',
      pedido: pedidoActualizado
    })

} catch (error) {
    console.error('Error al actualizar pedido:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
