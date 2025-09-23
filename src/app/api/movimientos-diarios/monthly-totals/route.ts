import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

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
    const fechaInicio = new Date(year, month - 1, 1)
    const fechaFin = new Date(year, month, 0, 23, 59, 59, 999)

    const whereClause = decoded.rol === 'Administrador' && !decoded.sucursalId 
      ? {} 
      : { sucursalId: decoded.sucursalId }

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

    // Calcular totales
    const totals = movimientosDelMes.reduce((acc, movimiento) => {
      acc.ventasBrutas += movimiento.ventasBrutas
      acc.efectivo += movimiento.efectivo
      acc.credito += movimiento.credito
      acc.abonosCredito += movimiento.abonosCredito
      acc.recargas += movimiento.recargas
      acc.pagoTarjeta += movimiento.pagoTarjeta
      acc.transferencias += movimiento.transferencias
      acc.gastos += movimiento.gastos
      acc.fondoCaja += movimiento.fondoCaja
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
      fondoCaja: 0,
      saldo: 0
    })

    return NextResponse.json({ totals })
  } catch (error) {
    console.error('Error al obtener totales del mes:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
