import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    
    const formasDePago = await prisma.formaDePago.findMany({
      orderBy: { nombre: 'asc' }
    })

    return NextResponse.json({ formasDePago })
  } catch (error) {
    console.error('Error al obtener formas de pago:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    
    const { nombre } = await request.json()
    
    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    }

    // Verificar si ya existe una forma de pago con ese nombre
    const existingForma = await prisma.formaDePago.findFirst({
      where: { nombre: nombre.trim() }
    })

    if (existingForma) {
      return NextResponse.json({ error: 'Ya existe una forma de pago con ese nombre' }, { status: 400 })
    }

    const formaDePago = await prisma.formaDePago.create({
      data: {
        nombre: nombre.trim()
      }
    })

    return NextResponse.json({ formaDePago }, { status: 201 })
  } catch (error) {
    console.error('Error al crear forma de pago:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
