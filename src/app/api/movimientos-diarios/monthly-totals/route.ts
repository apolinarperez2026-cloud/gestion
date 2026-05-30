import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { createMonthRange } from '@/lib/dateUtils'
import { roundCurrency } from '@/lib/formatters'

const prisma = new PrismaClient()
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())
    const sucursalIdParam = searchParams.get('sucursalId')

    const { fechaInicio, fechaFin } = createMonthRange(year, month)

    const whereClause =
      decoded.rol === 'Administrador' && !decoded.sucursalId
        ? (sucursalIdParam ? { sucursalId: parseInt(sucursalIdParam, 10) } : {})
        : decoded.sucursalId
          ? { sucursalId: decoded.sucursalId }
          : {}

    const movimientosDelMes = await prisma.movimientoDiario.findMany({
      where: {
        ...whereClause,
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        }
      }
    })

    const ultimoFondoInicialDelMes = await prisma.fondoCajaInicial.findFirst({
      where: {
        ...whereClause,
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        }
      },
      orderBy: [
        { fecha: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    const totals = movimientosDelMes.reduce((acc, movimiento) => {
      acc.ventasBrutas += movimiento.ventasBrutas
      acc.efectivo += movimiento.efectivo
      acc.credito += movimiento.credito
      acc.abonosCredito += movimiento.abonosCredito
      acc.recargas += movimiento.recargas
      acc.pagoTarjeta += movimiento.pagoTarjeta
      acc.transferencias += movimiento.transferencias
      acc.gastos += movimiento.gastos
      acc.depositos += movimiento.depositos
      // Calcular con la misma fórmula que Resumen para que cuadren
      const saldoDiaCalculado = movimiento.ventasBrutas - movimiento.credito + movimiento.abonosCredito - movimiento.recargas - movimiento.pagoTarjeta - movimiento.transferencias - movimiento.gastos
      acc.saldo += saldoDiaCalculado - movimiento.depositos
      return acc
    }, {
      ventasBrutas: 0,
      efectivo: 0,
      credito: 0,
      abonosCredito: 0,
      recargas: 0,
      pagoTarjeta: 0,
      transferencias: 0,
      gastos: 0,
      depositos: 0,
      fondoInicial: 0,
      saldo: 0
    })

    totals.ventasBrutas = roundCurrency(totals.ventasBrutas)
    totals.efectivo = roundCurrency(totals.efectivo)
    totals.credito = roundCurrency(totals.credito)
    totals.abonosCredito = roundCurrency(totals.abonosCredito)
    totals.recargas = roundCurrency(totals.recargas)
    totals.pagoTarjeta = roundCurrency(totals.pagoTarjeta)
    totals.transferencias = roundCurrency(totals.transferencias)
    totals.gastos = roundCurrency(totals.gastos)
    totals.depositos = roundCurrency(totals.depositos)
    totals.fondoInicial = roundCurrency(ultimoFondoInicialDelMes?.monto || 0)
    totals.saldo = roundCurrency(totals.saldo)

    return NextResponse.json({ totals })
  } catch (error) {
    console.error('Error al obtener totales del mes:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
