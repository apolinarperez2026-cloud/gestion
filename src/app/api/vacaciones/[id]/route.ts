import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

export async function GET(
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
    const id = parseInt(idParam)

    const solicitud = await prisma.solicitudVacaciones.findUnique({
      where: { id },
      include: {
        usuario: { select: { id: true, nombre: true } },
        aprobador: { select: { id: true, nombre: true } }
      }
    })

    if (!solicitud) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    const esAdmin = decoded.rol === 'Administrador'
    const esPropietario = solicitud.usuarioId === decoded.userId
    if (!esAdmin && !esPropietario) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    return NextResponse.json({ solicitud })
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
    const id = parseInt(idParam)
    const body = await request.json()

    const solicitud = await prisma.solicitudVacaciones.findUnique({ where: { id } })
    if (!solicitud) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    // Validar permisos
    const esAdmin = decoded.rol === 'Administrador'
    const esPropietario = solicitud.usuarioId === decoded.userId

    if (!esAdmin && !esPropietario) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    const data: any = {}

    // Empleado puede subir comprobante y cambiar a "Pendiente Aprobación"
    if (body.comprobanteUrl !== undefined) data.comprobanteUrl = body.comprobanteUrl
    if (body.estado && (esAdmin || body.estado === 'Pendiente Aprobacion')) {
      data.estado = body.estado
    }
    if (body.observaciones !== undefined) data.observaciones = body.observaciones

    // Solo admin puede aprobar/rechazar
    if (esAdmin && body.estado === 'Aprobado') {
      data.estado = 'Aprobado'
      data.fechaAprobacion = new Date()
      data.aprobadoPor = decoded.userId
    }
    if (esAdmin && body.estado === 'Rechazado') {
      data.estado = 'Rechazado'
      data.aprobadoPor = decoded.userId
    }

    const updated = await prisma.solicitudVacaciones.update({
      where: { id },
      data,
      include: {
        usuario: { select: { id: true, nombre: true } },
        aprobador: { select: { id: true, nombre: true } }
      }
    })

    return NextResponse.json({ solicitud: updated })
  } catch (error) {
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

    const { id: idParam } = await params
    const id = parseInt(idParam)

    const solicitud = await prisma.solicitudVacaciones.findUnique({ where: { id } })
    if (!solicitud) {
      return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
    }

    if (decoded.rol !== 'Administrador' && solicitud.usuarioId !== decoded.userId) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    if (!['Borrador', 'Rechazado'].includes(solicitud.estado)) {
      return NextResponse.json({ error: 'Solo se pueden eliminar solicitudes en Borrador o Rechazadas' }, { status: 400 })
    }

    await prisma.solicitudVacaciones.delete({ where: { id } })
    return NextResponse.json({ message: 'Eliminado' })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
