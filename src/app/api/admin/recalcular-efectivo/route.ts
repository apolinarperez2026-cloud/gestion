import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    if (decoded.rol !== 'Administrador') {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })
    }

    // UPDATE masivo: efectivo = ventasBrutas - pagoTarjeta - transferencias - gastos
    // Usamos raw SQL para hacerlo en una sola query
    const result = await prisma.$executeRaw`
      UPDATE "MovimientoDiario"
      SET "efectivo" = ROUND(("ventasBrutas" - "pagoTarjeta" - "transferencias" - "gastos")::numeric, 2)
    `

    // Contar cuántos registros hay en total
    const total = await prisma.movimientoDiario.count()

    return NextResponse.json({
      mensaje: 'Recalculación de efectivo completada',
      registrosActualizados: result,
      totalRegistros: total
    })
  } catch (error: any) {
    console.error('Error en recalculación:', error)
    return NextResponse.json({
      error: error?.message || 'Error interno del servidor',
      stack: error?.stack?.slice(0, 300)
    }, { status: 500 })
  }
}
