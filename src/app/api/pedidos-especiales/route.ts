import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { CreatePedidoEspecialData } from '@/types/database'

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

    const pedidos = await prisma.pedidoEspecial.findMany({
      where: {
        sucursalId: decoded.sucursalId
      },
      orderBy: {
        fecha: 'desc'
      }
    })

    return NextResponse.json({ pedidos })
  } catch (error) {
    console.error('Error al obtener pedidos especiales:', error)
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
    const body: CreatePedidoEspecialData = await request.json()

    const pedido = await prisma.pedidoEspecial.create({
      data: {
        descripcion: body.descripcion,
        monto: body.monto,
        fecha: body.fecha || new Date(),
        sucursalId: decoded.sucursalId
      }
    })

    return NextResponse.json({
      message: 'Pedido especial creado exitosamente',
      pedido
    })
  } catch (error) {
    console.error('Error al crear pedido especial:', error)
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
