import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { CreateMovimientoData } from '@/types/database'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { message: 'No autorizado' },
        { status: 401 }
      )
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    const movimientos = await prisma.movimiento.findMany({
      where: {
        sucursalId: decoded.sucursalId
      },
      include: {
        usuarioEntrega: {
          select: {
            nombre: true
          }
        },
        usuarioRecibe: {
          select: {
            nombre: true
          }
        },
        tipoGasto: {
          select: {
            nombre: true
          }
        }
      },
      orderBy: {
        fecha: 'desc'
      }
    })

    return NextResponse.json({ movimientos })
  } catch (error) {
    console.error('Error al obtener movimientos:', error)
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { message: 'No autorizado' },
        { status: 401 }
      )
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const body: CreateMovimientoData = await request.json()

      const movimiento = await prisma.movimiento.create({
        data: {
          fecha: body.fecha,
          tipo: 'MOVIMIENTO',
          categoria: body.tipoPago || 'ventasBrutas',
          monto: body.monto,
          descripcion: `Venta Bruta: $${body.ventasBrutas}${body.tipoPago ? `, ${body.tipoPago}: $${body.importeTipoPago}` : ''}${body.depositoManual ? `, Depósito Manual: $${body.depositoManual}` : ''}`,
          referencia: null,
          tipoGastoId: null,
          usuarioEntregaId: decoded.userId,
          sucursalId: decoded.sucursalId,
          ventasBrutas: body.ventasBrutas,
          credito: body.credito,
          abonosCredito: body.abonosCredito,
          recargas: body.recargas,
          pagoTarjeta: body.pagoTarjeta,
          transferencias: body.transferencias,
          gastos: body.gastos,
          depositoManual: body.depositoManual,
          saldoDia: null,
          deposito: null,
          saldoAcumulado: null
        }
      })

    return NextResponse.json({
      message: 'Movimiento creado exitosamente',
      movimiento
    })
  } catch (error) {
    console.error('Error al crear movimiento:', error)
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
