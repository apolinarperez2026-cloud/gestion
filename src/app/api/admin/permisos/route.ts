import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Devuelve todos los permisos y cuáles tiene cada rol
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }
    const decoded = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET!) as any
    if (decoded.rol !== 'Administrador') {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    const [permisos, roles] = await Promise.all([
      prisma.permiso.findMany({ orderBy: [{ categoria: 'asc' }, { codigo: 'asc' }] }),
      prisma.rol.findMany({
        include: { permisos: { include: { permiso: true } } },
        orderBy: { nivel: 'desc' }
      })
    ])

    return NextResponse.json({ permisos, roles })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// Actualiza los permisos de un rol (reemplaza completo)
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }
    const decoded = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET!) as any
    if (decoded.rol !== 'Administrador') {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    const { rolId, permisoIds, nivel } = await request.json()
    if (!rolId || !Array.isArray(permisoIds)) {
      return NextResponse.json({ error: 'rolId y permisoIds requeridos' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      // Actualizar nivel si se provee
      if (nivel !== undefined) {
        await tx.rol.update({ where: { id: rolId }, data: { nivel } })
      }
      // Reemplazar permisos
      await tx.rolPermiso.deleteMany({ where: { rolId } })
      if (permisoIds.length > 0) {
        await tx.rolPermiso.createMany({
          data: permisoIds.map((pid: number) => ({ rolId, permisoId: pid }))
        })
      }
    })

    const rol = await prisma.rol.findUnique({
      where: { id: rolId },
      include: { permisos: { include: { permiso: true } } }
    })

    return NextResponse.json({ rol })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
