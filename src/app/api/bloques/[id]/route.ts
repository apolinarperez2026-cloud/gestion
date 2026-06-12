import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }
    const decoded = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET!) as any
    if (decoded.rol !== 'Administrador') {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    const { id: idParam } = await params
    const id = parseInt(idParam)
    const { nombre, descripcion, sucursalIds } = await request.json()

    const bloque = await prisma.$transaction(async (tx) => {
      // Eliminar asignaciones existentes y recrear
      await tx.bloqueSucursal.deleteMany({ where: { bloqueId: id } })
      return tx.bloque.update({
        where: { id },
        data: {
          nombre,
          descripcion: descripcion || null,
          sucursales: {
            create: (sucursalIds || []).map((sid: number) => ({ sucursalId: sid }))
          }
        },
        include: {
          sucursales: { include: { sucursal: { select: { id: true, nombre: true } } } }
        }
      })
    })

    return NextResponse.json({ bloque })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un bloque con ese nombre' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }
    const decoded = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET!) as any
    if (decoded.rol !== 'Administrador') {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    const { id: idParam } = await params
    const id = parseInt(idParam)

    await prisma.bloque.delete({ where: { id } })
    return NextResponse.json({ message: 'Bloque eliminado' })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
