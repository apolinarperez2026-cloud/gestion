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
    const { comprobante } = body

    // Validar que se proporcione el comprobante
    if (!comprobante) {
      return NextResponse.json(
        { error: 'Comprobante de entrega es requerido' },
        { status: 400 }
      )
    }

    // Verificar que el pedido existe y pertenece a la sucursal del usuario
    const pedido = await prisma.pedidoEspecial.findFirst({
      where: {
        id,
        sucursalId: decoded.sucursalId
      }
    })

    if (!pedido) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    // Usar transacción para actualizar entrega y crear auditoría
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

      // Actualizar el pedido con la información de entrega
      const pedidoActualizado = await tx.pedidoEspecial.update({
        where: { id },
        data: {
          estado: 'Entregado',
          fechaEntrega: new Date(),
          comprobante,
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
          accion: 'ENTREGADO',
          descripcion: `Pedido entregado con comprobante`,
          datosAnteriores: { 
            estado: pedidoActual.estado,
            fechaEntrega: pedidoActual.fechaEntrega,
            comprobante: pedidoActual.comprobante
          },
          datosNuevos: { 
            estado: 'Entregado',
            fechaEntrega: new Date(),
            comprobante
          },
          usuarioId: decoded.userId
        }
      })

      return pedidoActualizado
    })

    return NextResponse.json({
      message: 'Pedido entregado exitosamente',
      pedido: result
    })

  } catch (error) {
    console.error('Error al entregar pedido:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
