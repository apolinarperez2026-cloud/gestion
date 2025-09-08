import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  try {
    // Verificar token de autenticación
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    // Obtener usuario
    const user = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
      include: { sucursal: true, rol: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Usar la sucursal del token JWT (si está disponible) o la de la base de datos
    const sucursalId = decoded.sucursalId || user.sucursalId

    if (!sucursalId) {
      return NextResponse.json({ error: 'No se puede determinar la sucursal' }, { status: 400 })
    }

    // Obtener movimientos de la sucursal
    const movimientos = await prisma.movimiento.findMany({
      where: { sucursalId: sucursalId },
      orderBy: { fecha: 'desc' }
    })

    // Calcular totales
    const summary = {
      saldoAcumulado: 0,
      ventasBrutas: 0,
      credito: 0,
      abonosCredito: 0,
      recargas: 0,
      pagoTarjeta: 0,
      gastos: 0,
      saldoDia: 0,
      deposito: 0
    }

    movimientos.forEach(movimiento => {
      summary.ventasBrutas += movimiento.ventasBrutas || 0
      summary.credito += movimiento.credito || 0
      summary.abonosCredito += movimiento.abonosCredito || 0
      summary.recargas += movimiento.recargas || 0
      summary.pagoTarjeta += movimiento.pagoTarjeta || 0
      summary.gastos += movimiento.gastos || 0
      summary.deposito += movimiento.deposito || 0
      summary.saldoDia += (movimiento.ventasBrutas || 0) - (movimiento.gastos || 0) - (movimiento.depositoManual || 0)
    })

    // Calcular saldo acumulado (último movimiento o 0)
    const ultimoMovimiento = movimientos[0]
    if (ultimoMovimiento) {
      summary.saldoAcumulado = ultimoMovimiento.saldoAcumulado || 0
    }

    return NextResponse.json(summary)

  } catch (error) {
    console.error('Error al obtener resumen de movimientos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
