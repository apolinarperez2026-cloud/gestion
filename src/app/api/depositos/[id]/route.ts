import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { recalcularMovimientoDiario } from '@/lib/recalcularMovimientoDiario'
import { parseDateOnly } from '@/lib/dateUtils'
import { findLegacyDepositMovementForDeposito } from '@/lib/depositoLegacySync'

export async function PATCH(
  request: NextRequest,
  context: any
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    const params = typeof context.params?.then === 'function'
      ? await context.params
      : context.params

    const idNum = parseInt(params.id, 10)
    if (Number.isNaN(idNum)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const deposito = await prisma.deposito.findUnique({ where: { id: idNum } })
    if (!deposito) {
      return NextResponse.json({ error: 'Depósito no encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const data: { monto?: number; fecha?: Date; imagen?: string | null } = {}

    if (body.monto !== undefined) data.monto = parseFloat(body.monto)
    if (body.fecha) data.fecha = parseDateOnly(body.fecha)
    if (body.imagen !== undefined) data.imagen = body.imagen

    const legacyMovimiento = await findLegacyDepositMovementForDeposito(deposito, prisma)

    const updated = await prisma.deposito.update({
      where: { id: idNum },
      data,
    })

    if (legacyMovimiento) {
      await prisma.movimiento.update({
        where: { id: legacyMovimiento.id },
        data: {
          fecha: data.fecha ?? deposito.fecha,
          monto: data.monto ?? deposito.monto,
          imagen: data.imagen !== undefined ? data.imagen : legacyMovimiento.imagen,
        },
      })
    }

    await recalcularMovimientoDiario(deposito.fecha, deposito.sucursalId, prisma)
    if (data.fecha && data.fecha.toISOString().slice(0, 10) !== deposito.fecha.toISOString().slice(0, 10)) {
      await recalcularMovimientoDiario(data.fecha, deposito.sucursalId, prisma)
    }

    // Bitácora
    if (data.monto !== undefined && data.monto !== deposito.monto) {
      await prisma.bitacoraEdicion.create({ data: { modulo: 'deposito', registroId: idNum, campoModificado: 'monto', valorAnterior: String(deposito.monto), valorNuevo: String(data.monto), usuarioId: decoded.userId } })
    }
    if (data.fecha && data.fecha.toISOString().slice(0,10) !== deposito.fecha.toISOString().slice(0,10)) {
      await prisma.bitacoraEdicion.create({ data: { modulo: 'deposito', registroId: idNum, campoModificado: 'fecha', valorAnterior: deposito.fecha.toISOString().slice(0,10), valorNuevo: data.fecha.toISOString().slice(0,10), usuarioId: decoded.userId } })
    }

    return NextResponse.json({
      message: 'Depósito actualizado correctamente',
      deposito: updated,
    })
  } catch (error) {
    console.error('Error al actualizar depósito:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: any
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    jwt.verify(token, process.env.JWT_SECRET!) as any

    const params = typeof context.params?.then === 'function'
      ? await context.params
      : context.params

    const idNum = parseInt(params.id, 10)
    if (Number.isNaN(idNum)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const deposito = await prisma.deposito.findUnique({ where: { id: idNum } })
    if (!deposito) {
      return NextResponse.json({ error: 'Depósito no encontrado' }, { status: 404 })
    }

    const legacyMovimiento = await findLegacyDepositMovementForDeposito(deposito, prisma)

    await prisma.deposito.delete({ where: { id: idNum } })

    if (legacyMovimiento) {
      await prisma.movimiento.delete({ where: { id: legacyMovimiento.id } })
    }

    await recalcularMovimientoDiario(deposito.fecha, deposito.sucursalId, prisma)

    return NextResponse.json({ message: 'Depósito eliminado correctamente' })
  } catch (error) {
    console.error('Error al eliminar depósito:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
