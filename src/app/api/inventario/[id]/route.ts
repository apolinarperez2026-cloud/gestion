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
    jwt.verify(authHeader.substring(7), process.env.JWT_SECRET!)

    const { id: idParam } = await params
    const id = parseInt(idParam)

    const sesion = await prisma.inventarioSesion.findUnique({
      where: { id },
      include: {
        sucursal: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true } },
        items: { orderBy: { sku: 'asc' } },
        incidencias: {
          include: { usuario: { select: { id: true, nombre: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!sesion) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ sesion })
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

    // Actualizar items individuales si se proveen
    if (body.items) {
      for (const item of body.items) {
        if (item.id && item.cantidadFisica !== undefined) {
          const cantFisica = parseFloat(item.cantidadFisica)
          const itemActual = await prisma.inventarioItem.findUnique({ where: { id: item.id } })
          if (itemActual) {
            await prisma.inventarioItem.update({
              where: { id: item.id },
              data: {
                cantidadFisica: cantFisica,
                diferencia: cantFisica - itemActual.cantidadSistema,
                estado: cantFisica === itemActual.cantidadSistema ? 'OK' : 'Incidencia'
              }
            })
          }
        }
      }
    }

    // Actualizar estado de sesión
    if (body.estado) {
      // Al cerrar: verificar items negativos y crear incidencias automáticas si no existen
      if (body.estado === 'Cerrado') {
        const itemsNegativos = await prisma.inventarioItem.findMany({
          where: { sesionId: id, diferencia: { lt: 0 } }
        })
        for (const item of itemsNegativos) {
          const yaExiste = await prisma.inventarioIncidencia.findFirst({
            where: { sesionId: id, itemId: item.id }
          })
          if (!yaExiste) {
            await prisma.inventarioIncidencia.create({
              data: {
                sesionId: id,
                itemId: item.id,
                descripcion: `Faltante automático: SKU ${item.sku} — diferencia ${item.diferencia} (sistema: ${item.cantidadSistema}, físico: ${item.cantidadFisica})`,
                estado: 'Pendiente',
                usuarioId: decoded.userId
              }
            })
          }
        }
        // Bitácora del cierre
        await prisma.bitacoraEdicion.create({
          data: {
            modulo: 'Inventario', registroId: id,
            campoModificado: 'estado', valorAnterior: 'En Proceso', valorNuevo: 'Cerrado',
            usuarioId: decoded.userId
          }
        })
      }

      await prisma.inventarioSesion.update({
        where: { id },
        data: {
          estado: body.estado,
          fechaFin: body.estado === 'Cerrado' ? new Date() : undefined,
          ...(body.fotoFirmada !== undefined && { fotoFirmada: body.fotoFirmada })
        }
      })
    }

    const sesion = await prisma.inventarioSesion.findUnique({
      where: { id },
      include: {
        sucursal: { select: { id: true, nombre: true } },
        items: { orderBy: { sku: 'asc' } },
        _count: { select: { items: true, incidencias: true } }
      }
    })

    return NextResponse.json({ sesion })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
