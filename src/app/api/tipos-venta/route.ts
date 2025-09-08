import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const formasDePago = await prisma.formaDePago.findMany({
      orderBy: { nombre: 'asc' }
    })

    return NextResponse.json({ formasDePago })
  } catch (error) {
    console.error('Error al obtener formas de pago:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nombre } = await request.json()

    if (!nombre) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      )
    }

    const formaDePago = await prisma.formaDePago.create({
      data: { nombre }
    })

    return NextResponse.json({ formaDePago })
  } catch (error) {
    console.error('Error al crear forma de pago:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
