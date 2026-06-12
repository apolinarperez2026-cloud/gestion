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
    const anio = parseInt(searchParams.get('anio') || String(new Date().getFullYear()))

    let where: any = { anio }
    if (decoded.rol !== 'Administrador') {
      where.usuarioId = decoded.userId
    }

    const configs = await prisma.configVacaciones.findMany({
      where,
      include: { usuario: { select: { id: true, nombre: true } } }
    })

    return NextResponse.json({ configs })
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

    const { usuarioId, anio, diasAsignados } = await request.json()

    const config = await prisma.configVacaciones.upsert({
      where: { usuarioId_anio: { usuarioId: parseInt(usuarioId), anio: parseInt(anio) } },
      update: { diasAsignados: parseInt(diasAsignados) },
      create: { usuarioId: parseInt(usuarioId), anio: parseInt(anio), diasAsignados: parseInt(diasAsignados) }
    })

    return NextResponse.json({ config })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
