import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

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

    const fondosCaja = await prisma.fondoCaja.findMany({
      where: {
        sucursalId: decoded.sucursalId
      },
      orderBy: {
        fecha: 'desc'
      }
    })

    return NextResponse.json({ fondosCaja })
  } catch (error) {
    console.error('Error al obtener fondos de caja:', error)
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
    const body = await request.json()

    // Verificar si ya existe un fondo para esta fecha
    const existingFondo = await prisma.fondoCaja.findFirst({
      where: {
        sucursalId: decoded.sucursalId,
        fecha: {
          gte: new Date(body.fecha),
          lt: new Date(new Date(body.fecha).getTime() + 24 * 60 * 60 * 1000)
        }
      }
    })

    if (existingFondo) {
      // Actualizar el fondo existente
      const fondoActualizado = await prisma.fondoCaja.update({
        where: { id: existingFondo.id },
        data: {
          saldoInicial: body.saldoInicial,
          saldoFinal: body.saldoFinal
        }
      })

      return NextResponse.json({
        message: 'Fondo de caja actualizado exitosamente',
        fondo: fondoActualizado
      })
    } else {
      // Crear nuevo fondo
      const nuevoFondo = await prisma.fondoCaja.create({
        data: {
          fecha: body.fecha,
          saldoInicial: body.saldoInicial,
          saldoFinal: body.saldoFinal,
          sucursalId: decoded.sucursalId
        }
      })

      return NextResponse.json({
        message: 'Fondo de caja creado exitosamente',
        fondo: nuevoFondo
      })
    }
  } catch (error) {
    console.error('Error al crear/actualizar fondo de caja:', error)
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
