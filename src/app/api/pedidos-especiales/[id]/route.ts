import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

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

    // Verificar que el pedido existe y pertenece a la sucursal del usuario
    const pedidoExistente = await prisma.pedidoEspecial.findFirst({
      where: {
        id,
        sucursalId: decoded.sucursalId
      }
    })

    if (!pedidoExistente) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    // No permitir editar pedidos entregados
    if (pedidoExistente.estado === 'Entregado') {
      return NextResponse.json(
        { error: 'No se puede editar un pedido entregado' },
        { status: 400 }
      )
    }

    // Usar transacción para actualizar pedido y crear auditoría
    const result = await prisma.$transaction(async (tx) => {
      // Actualizar el pedido
      const pedidoActualizado = await tx.pedidoEspecial.update({
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
          usuario: {
            select: {
              id: true,
              nombre: true
            }
          }
        }
      })

      // Crear registro de auditoría
      await tx.pedidoEspecialHistorial.create({
        data: {
          pedidoId: id,
          accion: 'ACTUALIZADO',
          descripcion: `Pedido actualizado: ${marca} - ${codigo}`,
          datosAnteriores: {
            marca: pedidoExistente.marca,
            codigo: pedidoExistente.codigo,
            cantidad: pedidoExistente.cantidad,
            descripcion: pedidoExistente.descripcion,
            precioVenta: pedidoExistente.precioVenta,
            total: pedidoExistente.total,
            anticipo: pedidoExistente.anticipo,
            fechaPedido: pedidoExistente.fechaPedido
          },
          datosNuevos: {
            marca,
            codigo,
            cantidad: parseInt(cantidad),
            descripcion,
            precioVenta: parseFloat(precioVenta),
            total: parseFloat(total),
            anticipo: parseFloat(anticipo),
            fechaPedido: new Date(fechaPedido)
          },
          usuarioId: decoded.userId
        }
      })

      return pedidoActualizado
    })

    return NextResponse.json({
      message: 'Pedido actualizado exitosamente',
      pedido: result
    })

  } catch (error) {
    console.error('Error al actualizar pedido:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
