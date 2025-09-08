import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre } = body

    if (!nombre || !nombre.trim()) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      )
    }

    // Verificar si ya existe un tipo de gasto con ese nombre
    const existingTipo = await prisma.tipoGasto.findFirst({
      where: { nombre: nombre.trim() }
    })

    if (existingTipo) {
      return NextResponse.json(
        { error: 'Ya existe un tipo de gasto con ese nombre' },
        { status: 400 }
      )
    }

    const tipoGasto = await prisma.tipoGasto.create({
      data: {
        nombre: nombre.trim()
      }
    })

    return NextResponse.json(tipoGasto, { status: 201 })

  } catch (error) {
    console.error('Error al crear tipo de gasto:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
