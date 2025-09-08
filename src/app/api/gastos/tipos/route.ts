import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const tiposGasto = await prisma.tipoGasto.findMany({
      orderBy: { nombre: 'asc' }
    })

    return NextResponse.json({ tiposGasto })
  } catch (error) {
    console.error('Error al obtener tipos de gasto:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { nombre } = await request.json()

    if (!nombre) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      )
    }

    const tipoGasto = await prisma.tipoGasto.create({
      data: { nombre }
    })

    return NextResponse.json({ tipoGasto }, { status: 201 })
  } catch (error) {
    console.error('Error al crear tipo de gasto:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
