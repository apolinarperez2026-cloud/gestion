import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }
    const decoded = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET!) as any

    const { searchParams } = new URL(request.url)
    const sucursalId = searchParams.get('sucursalId')

    let where: any = {}
    if (decoded.rol !== 'Administrador') {
      where.sucursalId = decoded.sucursalId
    } else if (sucursalId) {
      where.sucursalId = parseInt(sucursalId)
    }

    const sesiones = await prisma.inventarioSesion.findMany({
      where,
      include: {
        sucursal: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true } },
        _count: { select: { items: true, incidencias: true } }
      },
      orderBy: { fechaInicio: 'desc' }
    })

    return NextResponse.json({ sesiones })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }
    const decoded = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET!) as any

    const body = await request.json()
    const { nombre, sucursalId, items } = body

    if (!nombre || !sucursalId) {
      return NextResponse.json({ error: 'Nombre y sucursal requeridos' }, { status: 400 })
    }

    const sesion = await prisma.inventarioSesion.create({
      data: {
        nombre,
        sucursalId: parseInt(sucursalId),
        usuarioId: decoded.userId,
        items: items ? {
          create: items.map((item: any) => ({
            sku: item.sku,
            descripcion: item.descripcion,
            cantidadSistema: parseFloat(item.cantidadSistema || 0)
          }))
        } : undefined
      },
      include: {
        sucursal: { select: { id: true, nombre: true } },
        _count: { select: { items: true } }
      }
    })

    return NextResponse.json({ sesion }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
