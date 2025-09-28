import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { createMonthRange } from '@/lib/dateUtils'

const prisma = new PrismaClient()

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

    // Crear fechas de inicio y fin del mes
    const { fechaInicio, fechaFin } = createMonthRange(year, month)

    const whereClause = decoded.rol === 'Administrador' && !decoded.sucursalId 
      ? {} 
      : decoded.sucursalId 
        ? { sucursalId: decoded.sucursalId }
        : {}

    // Obtener todos los movimientos diarios del mes
    const movimientosDelMes = await prisma.movimientoDiario.findMany({
      where: {
        ...whereClause,
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        }
      }
    })

    // Calcular totales de movimientos diarios
    const totals = movimientosDelMes.reduce((acc, movimiento) => {
      acc.ventasBrutas += movimiento.ventasBrutas
      acc.efectivo += movimiento.efectivo
      acc.credito += movimiento.credito
      acc.abonosCredito += movimiento.abonosCredito
      acc.recargas += movimiento.recargas
      acc.pagoTarjeta += movimiento.pagoTarjeta
      acc.transferencias += movimiento.transferencias
      acc.gastos += movimiento.gastos
      acc.saldo += movimiento.saldoDia
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

    // Calcular total de depósitos bancarios del mes desde movimientos de tipo DEPOSITO
    // Temporalmente incluir también FONDO_CAJA para depósitos creados antes del cambio
    const depositosDelMes = await prisma.movimiento.findMany({
      where: {
        tipo: {
          in: ['DEPOSITO', 'FONDO_CAJA'] // Incluir ambos tipos temporalmente
        },
        ...whereClause,
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        }
      }
    })

    const totalDepositos = depositosDelMes.reduce((sum, deposito) => sum + deposito.monto, 0)

    // Calcular total de fondos iniciales del mes
    const fondosInicialesDelMes = await prisma.fondoCajaInicial.findMany({
      where: {
        ...whereClause,
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        }
      }
    })

    const totalFondosIniciales = fondosInicialesDelMes.reduce((sum, fondo) => sum + fondo.monto, 0)

    // Asignar los totales calculados
    totals.depositos = totalDepositos
    totals.fondoInicial = totalFondosIniciales

    return NextResponse.json({ totals })
  } catch (error) {
    console.error('Error al obtener totales del mes:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
