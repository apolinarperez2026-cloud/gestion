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
    const { estado } = body

    // Validar estado
    const estadosValidos = ['En Proceso', 'Recibido', 'Cancelado', 'Entregado']
    if (!estado || !estadosValidos.includes(estado)) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 }
      )
    }

    // Usar transacción para actualizar estado y crear auditoría
    const result = await prisma.$transaction(async (tx) => {
      // Obtener pedido actual para comparar
      const pedidoActual = await tx.pedidoEspecial.findFirst({
        where: {
          id,
          sucursalId: decoded.sucursalId
        }
      })

      if (!pedidoActual) {
        throw new Error('Pedido no encontrado')
      }

      // Actualizar el pedido
      const pedidoActualizado = await tx.pedidoEspecial.update({
        where: { id },
        data: {
          estado,
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
      const accionMap = {
        'Cancelado': 'CANCELADO',
        'Recibido': 'RECIBIDO',
        'Entregado': 'ENTREGADO'
      }

      await tx.pedidoEspecialHistorial.create({
        data: {
          pedidoId: id,
          accion: accionMap[estado] || 'ACTUALIZADO',
          descripcion: `Estado cambiado de "${pedidoActual.estado}" a "${estado}"`,
          datosAnteriores: { estado: pedidoActual.estado },
          datosNuevos: { estado },
          usuarioId: decoded.userId
        }
      })

      return pedidoActualizado
    })

    return NextResponse.json({
      message: 'Estado actualizado exitosamente',
      pedido: result
    })

  } catch (error) {
    console.error('Error al actualizar estado del pedido:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
