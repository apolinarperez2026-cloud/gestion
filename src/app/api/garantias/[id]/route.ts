import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { parseDateOnly } from '@/lib/dateUtils'

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
      fechaEntregaFabricante,
      fechaRegresoFabricante,
      fechaEntregaCliente,
      fotoReciboEntrega,
      estado,
      comentarios
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

    // Actualizar solo los campos proporcionados
    const updateData: any = {}
    
    if (fechaEntregaFabricante !== undefined) {
      updateData.fechaEntregaFabricante = fechaEntregaFabricante ? parseDateOnly(fechaEntregaFabricante) : null
    }
    
    if (fechaRegresoFabricante !== undefined) {
      updateData.fechaRegresoFabricante = fechaRegresoFabricante ? parseDateOnly(fechaRegresoFabricante) : null
    }
    
    if (fechaEntregaCliente !== undefined) {
      updateData.fechaEntregaCliente = fechaEntregaCliente ? parseDateOnly(fechaEntregaCliente) : null
    }
    
    if (fotoReciboEntrega !== undefined) {
      updateData.fotoReciboEntrega = fotoReciboEntrega || null
    }

    if (estado !== undefined) {
      updateData.estado = estado
    }

    if (comentarios !== undefined) {
      updateData.comentarios = comentarios || null
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
