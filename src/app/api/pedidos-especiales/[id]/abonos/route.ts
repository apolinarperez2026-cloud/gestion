import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }
    const token = authHeader.substring(7)
    jwt.verify(token, process.env.JWT_SECRET!) as any

    const { id: idParam } = await params
    const pedidoId = parseInt(idParam)
    if (isNaN(pedidoId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const abonos = await prisma.abonoPedido.findMany({
      where: { pedidoId },
      include: { usuario: { select: { id: true, nombre: true } } },
      orderBy: { fecha: 'desc' }
    })

    return NextResponse.json({ abonos })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }
    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    const { id: idParam } = await params
    const pedidoId = parseInt(idParam)
    if (isNaN(pedidoId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const { monto, imagen } = await request.json()
    if (!monto || isNaN(parseFloat(monto))) {
      return NextResponse.json({ error: 'Monto requerido' }, { status: 400 })
    }

    const pedido = await prisma.pedidoEspecial.findUnique({ where: { id: pedidoId } })
    if (!pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    const abono = await prisma.$transaction(async (tx) => {
      const nuevoAbono = await tx.abonoPedido.create({
        data: {
          pedidoId,
          monto: parseFloat(monto),
          imagen: imagen || null,
          usuarioId: decoded.userId
        }
      })

      // Actualizar abonosCredito del movimientoDiario del día si existe
      const hoy = new Date()
      const fechaStr = hoy.toISOString().split('T')[0]
      const fechaInicio = new Date(fechaStr + 'T00:00:00.000Z')
      const fechaFin = new Date(fechaStr + 'T23:59:59.999Z')

      const movDiario = await tx.movimientoDiario.findFirst({
        where: {
          sucursalId: pedido.sucursalId,
          fecha: { gte: fechaInicio, lte: fechaFin }
        }
      })
      if (movDiario) {
        await tx.movimientoDiario.update({
          where: { id: movDiario.id },
          data: { abonosCredito: { increment: parseFloat(monto) } }
        })
      }

      await tx.pedidoEspecialHistorial.create({
        data: {
          pedidoId,
          accion: 'ABONO',
          descripcion: `Abono registrado: $${monto}`,
          datosNuevos: { monto: parseFloat(monto) },
          usuarioId: decoded.userId
        }
      })

      return nuevoAbono
    })

    return NextResponse.json({ abono }, { status: 201 })
  } catch (error) {
    console.error('Error al registrar abono:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
