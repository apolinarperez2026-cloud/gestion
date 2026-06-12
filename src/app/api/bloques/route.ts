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
    jwt.verify(authHeader.substring(7), process.env.JWT_SECRET!)

    const bloques = await prisma.bloque.findMany({
      include: {
        sucursales: {
          include: { sucursal: { select: { id: true, nombre: true } } }
        }
      },
      orderBy: { nombre: 'asc' }
    })

    return NextResponse.json({ bloques })
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
    if (decoded.rol !== 'Administrador') {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    const { nombre, descripcion, sucursalIds } = await request.json()
    if (!nombre) {
      return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    }

    const bloque = await prisma.bloque.create({
      data: {
        nombre,
        descripcion: descripcion || null,
        sucursales: {
          create: (sucursalIds || []).map((id: number) => ({ sucursalId: id }))
        }
      },
      include: {
        sucursales: { include: { sucursal: { select: { id: true, nombre: true } } } }
      }
    })

    return NextResponse.json({ bloque }, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un bloque con ese nombre' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
