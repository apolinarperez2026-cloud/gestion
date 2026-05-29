import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { roundCurrency } from '@/lib/formatters'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    const user = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
      include: { sucursal: true, rol: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const sucursalId = decoded.sucursalId || user.sucursalId

    if (!sucursalId) {
      return NextResponse.json({ error: 'No se puede determinar la sucursal' }, { status: 400 })
    }

    const movimientos = await prisma.movimiento.findMany({
      where: { sucursalId },
      include: {
        formaDePago: true,
        tipoGasto: true
      },
      orderBy: { fecha: 'desc' }
    })

    let ventasBrutas = 0
    let credito = 0
    let abonosCredito = 0
    let recargas = 0
    let pagoTarjeta = 0
    let gastos = 0

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
      }
    })

    const [depositosTabla, depositosLegacy] = await Promise.all([
      prisma.deposito.findMany({
        where: { sucursalId }
      }),
      prisma.movimiento.findMany({
        where: {
          sucursalId,
          tipo: 'DEPOSITO'
        }
      })
    ])

    const deposito = depositosTabla.length > 0
      ? depositosTabla.reduce((sum, item) => sum + item.monto, 0)
      : depositosLegacy.reduce((sum, item) => sum + item.monto, 0)

    const saldoAcumulado = roundCurrency(ventasBrutas - gastos + deposito)

    const ultimoMovimientoDiario = await prisma.movimientoDiario.findFirst({
      where: { sucursalId },
      orderBy: { fecha: 'desc' }
    })

    const saldoDia = roundCurrency(ultimoMovimientoDiario?.saldoDia || 0)

    return NextResponse.json({
      saldoAcumulado,
      ventasBrutas: roundCurrency(ventasBrutas),
      credito: roundCurrency(credito),
      abonosCredito: roundCurrency(abonosCredito),
      recargas: roundCurrency(recargas),
      pagoTarjeta: roundCurrency(pagoTarjeta),
      gastos: roundCurrency(gastos),
      saldoDia,
      deposito: roundCurrency(deposito)
    })
  } catch (error) {
    console.error('Error al obtener resumen de movimientos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
