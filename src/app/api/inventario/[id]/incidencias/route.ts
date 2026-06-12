import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }
    const decoded = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET!) as any

    const { id: idParam } = await params
    const sesionId = parseInt(idParam)
    const { itemId, descripcion, foto, conclusion } = await request.json()

    if (!descripcion) {
      return NextResponse.json({ error: 'Descripción requerida' }, { status: 400 })
    }

    const incidencia = await prisma.inventarioIncidencia.create({
      data: {
        sesionId,
        itemId: itemId || null,
        descripcion,
        foto: foto || null,
        conclusion: conclusion || null,
        usuarioId: decoded.userId
      },
      include: { usuario: { select: { id: true, nombre: true } } }
    })

    return NextResponse.json({ incidencia }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }
    const decoded = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET!) as any

    const { id: idParam } = await params
    const sesionId = parseInt(idParam)
    const { incidenciaId, conclusion, estado, foto } = await request.json()

    if (!incidenciaId) {
      return NextResponse.json({ error: 'incidenciaId requerido' }, { status: 400 })
    }

    const updated = await prisma.inventarioIncidencia.update({
      where: { id: incidenciaId, sesionId },
      data: {
        ...(conclusion !== undefined && { conclusion }),
        ...(estado !== undefined && { estado }),
        ...(foto !== undefined && { foto })
      }
    })

    // Al resolver una incidencia ligada a un ítem, ajustar cantidadSistema = cantidadFisica
    if (estado === 'Resuelta' && updated.itemId) {
      const item = await prisma.inventarioItem.findUnique({ where: { id: updated.itemId } })
      if (item && item.cantidadFisica !== null && item.cantidadFisica !== undefined) {
        await prisma.inventarioItem.update({
          where: { id: updated.itemId },
          data: { cantidadSistema: item.cantidadFisica, diferencia: 0, estado: 'OK' }
        })
      }
    }

    return NextResponse.json({ incidencia: updated })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
