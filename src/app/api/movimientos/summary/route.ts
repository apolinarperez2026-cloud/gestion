import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

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

    // Obtener movimientos de la sucursal con relaciones
    const movimientos = await prisma.movimiento.findMany({
      where: { sucursalId: sucursalId },
      include: {
        formaDePago: true,
        tipoGasto: true
      },
      orderBy: { fecha: 'desc' }
    })

    // Calcular totales por tipo de movimiento
    const summary = {
      totalVentas: 0,
      totalGastos: 0,
      totalFondoCaja: 0,
      saldo: 0,
      ventasPorFormaPago: {} as Record<string, number>,
      gastosPorTipo: {} as Record<string, number>
    }

    movimientos.forEach(movimiento => {
      if (movimiento.tipo === 'VENTA') {
        summary.totalVentas += movimiento.monto
        if (movimiento.formaDePago) {
          const formaPago = movimiento.formaDePago.nombre
          summary.ventasPorFormaPago[formaPago] = (summary.ventasPorFormaPago[formaPago] || 0) + movimiento.monto
        }
      } else if (movimiento.tipo === 'GASTO') {
        summary.totalGastos += movimiento.monto
        if (movimiento.tipoGasto) {
          const tipoGasto = movimiento.tipoGasto.nombre
          summary.gastosPorTipo[tipoGasto] = (summary.gastosPorTipo[tipoGasto] || 0) + movimiento.monto
        }
      } else if (movimiento.tipo === 'FONDO_CAJA') {
        summary.totalFondoCaja += movimiento.monto
      }
    })

    // Calcular saldo
    summary.saldo = summary.totalVentas - summary.totalGastos

    return NextResponse.json(summary)

  } catch (error) {
    console.error('Error al obtener resumen de movimientos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
