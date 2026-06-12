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
    const usuarioId = searchParams.get('usuarioId')
    const anio = searchParams.get('anio') || new Date().getFullYear().toString()

    let where: any = {}
    if (decoded.rol === 'Administrador') {
      if (usuarioId) where.usuarioId = parseInt(usuarioId)
    } else {
      where.usuarioId = decoded.userId
    }

    const solicitudes = await prisma.solicitudVacaciones.findMany({
      where,
      include: {
        usuario: { select: { id: true, nombre: true } },
        aprobador: { select: { id: true, nombre: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calcular días usados del año
    const diasUsadosAnio = solicitudes
      .filter(s => s.estado === 'Aprobado' && new Date(s.fechaInicio).getFullYear() === parseInt(anio))
      .reduce((sum, s) => sum + s.dias, 0)

    // Config de vacaciones del usuario
    let config = null
    const userId = usuarioId ? parseInt(usuarioId) : decoded.userId
    config = await prisma.configVacaciones.findUnique({
      where: { usuarioId_anio: { usuarioId: userId, anio: parseInt(anio) } }
    })

    return NextResponse.json({
      solicitudes,
      diasUsados: diasUsadosAnio,
      diasAsignados: config?.diasAsignados ?? 0,
      saldoDisponible: (config?.diasAsignados ?? 0) - diasUsadosAnio
    })
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

    const { fechaInicio, dias, observaciones } = await request.json()
    if (!fechaInicio || !dias) {
      return NextResponse.json({ error: 'Fecha y días requeridos' }, { status: 400 })
    }

    const solicitud = await prisma.solicitudVacaciones.create({
      data: {
        usuarioId: decoded.userId,
        fechaInicio: new Date(fechaInicio),
        dias: parseInt(dias),
        observaciones: observaciones || null,
        estado: 'Borrador'
      },
      include: {
        usuario: { select: { id: true, nombre: true } }
      }
    })

    return NextResponse.json({ solicitud }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
