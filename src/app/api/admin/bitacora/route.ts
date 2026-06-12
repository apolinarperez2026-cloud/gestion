import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }
    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    if (decoded.rol !== 'Administrador') {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const modulo = searchParams.get('modulo')
    const registroId = searchParams.get('registroId')

    const where: any = {}
    if (modulo) where.modulo = modulo
    if (registroId) where.registroId = parseInt(registroId)

    const entradas = await prisma.bitacoraEdicion.findMany({
      where,
      include: { usuario: { select: { id: true, nombre: true } } },
      orderBy: { fechaCambio: 'desc' },
      take: 200
    })

    return NextResponse.json({ entradas })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
