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
    let saldoAcumulado = 0
    let ventasBrutas = 0
    let credito = 0
    let abonosCredito = 0
    let recargas = 0
    let pagoTarjeta = 0
    let gastos = 0
    let deposito = 0

    movimientos.forEach(movimiento => {
      if (movimiento.tipo === 'VENTA') {
        ventasBrutas += movimiento.monto
        if (movimiento.formaDePago) {
          const formaPago = movimiento.formaDePago.nombre.toLowerCase()
          if (formaPago.includes('credito')) {
            credito += movimiento.monto
          } else if (formaPago.includes('recarga')) {
            recargas += movimiento.monto
          } else if (formaPago.includes('tarjeta')) {
            pagoTarjeta += movimiento.monto
          }
        }
      } else if (movimiento.tipo === 'GASTO') {
        gastos += movimiento.monto
      } else if (movimiento.tipo === 'FONDO_CAJA') {
        deposito += movimiento.monto
      } else if (movimiento.tipo === 'ABONO_CREDITO') {
        abonosCredito += movimiento.monto
      }
    })

    // Calcular saldo acumulado (ventas - gastos + depósitos)
    saldoAcumulado = ventasBrutas - gastos + deposito

    // Obtener el último movimiento diario para el saldo del día
    const ultimoMovimientoDiario = await prisma.movimientoDiario.findFirst({
      where: { sucursalId: sucursalId },
      orderBy: { fecha: 'desc' }
    })

    const saldoDia = ultimoMovimientoDiario?.saldoDia || 0

    const summary = {
      saldoAcumulado,
      ventasBrutas,
      credito,
      abonosCredito,
      recargas,
      pagoTarjeta,
      gastos,
      saldoDia,
      deposito
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
