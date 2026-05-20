import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { createDateRange, parseDateOnly } from '@/lib/dateUtils'
import { roundCurrency } from '@/lib/formatters'
import { calculateSaldoDia, getMovimientoDiarioAssociatedTotals } from '@/lib/movimientoDiarioCalculations'

const prisma = new PrismaClient()
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID invalido' },
        { status: 400 }
      )
    }

    const movimientoDiario = await prisma.movimientoDiario.findUnique({
      where: { id },
      include: {
        sucursal: true,
        usuario: {
          include: {
            rol: true
          }
        }
      }
    })

    if (!movimientoDiario) {
      return NextResponse.json(
        { error: 'Movimiento diario no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ movimientoDiario })
  } catch (error) {
    console.error('Error al obtener movimiento diario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID invalido' },
        { status: 400 }
      )
    }

    const {
      fecha,
      ventasBrutas,
      efectivo,
      credito,
      abonosCredito,
      recargas,
      transferencias,
      observaciones,
      fondoInicial,
      usuarioId
    } = await request.json()

    const movimientoActual = await prisma.movimientoDiario.findUnique({
      where: { id }
    })

    if (!movimientoActual) {
      return NextResponse.json(
        { error: 'Movimiento diario no encontrado' },
        { status: 404 }
      )
    }

    const fechaObjetivo = fecha ? parseDateOnly(fecha) : movimientoActual.fecha
    const fechaObjetivoStr = fechaObjetivo.toISOString().split('T')[0]
    const fechaActualStr = movimientoActual.fecha.toISOString().split('T')[0]

    if (fechaObjetivoStr !== fechaActualStr) {
      const { fechaInicio: nuevaFechaInicio, fechaFin: nuevaFechaFin } = createDateRange(fechaObjetivoStr)
      const movimientoExistenteEnFecha = await prisma.movimientoDiario.findFirst({
        where: {
          id: { not: id },
          sucursalId: movimientoActual.sucursalId,
          fecha: {
            gte: nuevaFechaInicio,
            lte: nuevaFechaFin
          }
        }
      })

      if (movimientoExistenteEnFecha) {
        return NextResponse.json(
          { error: 'Ya existe un movimiento diario para esa fecha en esta sucursal' },
          { status: 409 }
        )
      }
    }

    const associatedTotals = await getMovimientoDiarioAssociatedTotals(
      prisma,
      fechaObjetivo,
      movimientoActual.sucursalId
    )

    const ventasBrutasFinal =
      ventasBrutas !== undefined ? roundCurrency(ventasBrutas) : roundCurrency(movimientoActual.ventasBrutas)
    const efectivoFinal =
      efectivo !== undefined ? roundCurrency(efectivo) : roundCurrency(movimientoActual.efectivo)
    const creditoFinal =
      credito !== undefined ? roundCurrency(credito) : roundCurrency(movimientoActual.credito)
    const abonosCreditoFinal =
      abonosCredito !== undefined ? roundCurrency(abonosCredito) : roundCurrency(movimientoActual.abonosCredito)
    const recargasFinal =
      recargas !== undefined ? roundCurrency(recargas) : roundCurrency(movimientoActual.recargas)
    const transferenciasFinal =
      transferencias !== undefined ? roundCurrency(transferencias) : roundCurrency(movimientoActual.transferencias)
    const fondoInicialAplicado = associatedTotals.fondoInicialEncontrado
      ? associatedTotals.totalFondoInicial
      : (fondoInicial !== undefined ? roundCurrency(fondoInicial) : roundCurrency(movimientoActual.fondoInicial))

    const nuevosDatos = {
      fecha: fechaObjetivo,
      ventasBrutas: ventasBrutasFinal,
      efectivo: efectivoFinal,
      credito: creditoFinal,
      abonosCredito: abonosCreditoFinal,
      recargas: recargasFinal,
      pagoTarjeta: associatedTotals.totalPagoTarjeta,
      transferencias: transferenciasFinal,
      gastos: associatedTotals.totalGastos,
      depositos: associatedTotals.totalDepositos,
      saldoDia: calculateSaldoDia(
        ventasBrutasFinal,
        associatedTotals.totalGastos,
        associatedTotals.totalDepositos,
        fondoInicialAplicado
      ),
      observaciones: observaciones !== undefined ? observaciones : movimientoActual.observaciones,
      fondoInicial: fondoInicialAplicado
    }

    const cambios = []
    const campos = [
      { nombre: 'fecha', etiqueta: 'Fecha' },
      { nombre: 'ventasBrutas', etiqueta: 'Ventas Brutas' },
      { nombre: 'efectivo', etiqueta: 'Efectivo' },
      { nombre: 'credito', etiqueta: 'Credito' },
      { nombre: 'abonosCredito', etiqueta: 'Abonos de Credito' },
      { nombre: 'recargas', etiqueta: 'Recargas' },
      { nombre: 'pagoTarjeta', etiqueta: 'Pago con Tarjeta' },
      { nombre: 'transferencias', etiqueta: 'Transferencias' },
      { nombre: 'gastos', etiqueta: 'Gastos' },
      { nombre: 'depositos', etiqueta: 'Depositos' },
      { nombre: 'observaciones', etiqueta: 'Observaciones' },
      { nombre: 'fondoInicial', etiqueta: 'Fondo Inicial' }
    ]

    for (const campo of campos) {
      const valorAnterior = (movimientoActual as any)[campo.nombre]
      const valorNuevo = (nuevosDatos as any)[campo.nombre]

      const valorAnteriorComparable = valorAnterior instanceof Date ? valorAnterior.toISOString().split('T')[0] : valorAnterior
      const valorNuevoComparable = valorNuevo instanceof Date ? valorNuevo.toISOString().split('T')[0] : valorNuevo

      if (valorAnteriorComparable !== valorNuevoComparable) {
        cambios.push({
          movimientoDiarioId: id,
          usuarioId: usuarioId || movimientoActual.usuarioId,
          campoModificado: campo.etiqueta,
          valorAnterior: valorAnteriorComparable?.toString() || '',
          valorNuevo: valorNuevoComparable?.toString() || ''
        })
      }
    }

    const movimientoDiario = await prisma.movimientoDiario.update({
      where: { id },
      data: nuevosDatos,
      include: {
        sucursal: true,
        usuario: {
          include: {
            rol: true
          }
        }
      }
    })

    if (cambios.length > 0) {
      await prisma.movimientoDiarioHistorial.createMany({
        data: cambios
      })
    }

    return NextResponse.json({
      movimientoDiario,
      gastosEncontrados: associatedTotals.gastosEncontrados,
      totalGastosCalculado: associatedTotals.totalGastos,
      cobrosTpvEncontrados: associatedTotals.cobrosTpvEncontrados,
      totalTpvCalculado: associatedTotals.totalPagoTarjeta,
      depositosEncontrados: associatedTotals.depositosEncontrados,
      totalDepositosCalculado: associatedTotals.totalDepositos,
      cambiosRegistrados: cambios.length,
      fondoInicialAplicado: associatedTotals.fondoInicialEncontrado
        ? {
            existe: true,
            monto: associatedTotals.totalFondoInicial,
            fecha: fechaObjetivo
          }
        : {
            existe: false,
            monto: 0
          }
    })
  } catch (error) {
    console.error('Error al actualizar movimiento diario:', error)

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID invalido' },
        { status: 400 }
      )
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorizacion requerido' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]

    let decoded: any
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || '')
    } catch (error) {
      return NextResponse.json(
        { error: 'Token invalido' },
        { status: 401 }
      )
    }

    const user = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
      include: {
        rol: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    if (user.rol.nombre !== 'Administrador') {
      return NextResponse.json(
        { error: 'Solo los administradores pueden eliminar movimientos diarios' },
        { status: 403 }
      )
    }

    await prisma.movimientoDiario.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Movimiento diario eliminado exitosamente' })
  } catch (error) {
    console.error('Error al eliminar movimiento diario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
