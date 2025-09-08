import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const { id } = await params
    
    const { nombre } = await request.json()
    
    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    }

    // Verificar si el tipo de gasto existe
    const existingTipo = await prisma.tipoGasto.findUnique({
      where: { id: parseInt(id) }
    })

    if (!existingTipo) {
      return NextResponse.json({ error: 'Tipo de gasto no encontrado' }, { status: 404 })
    }

    // Verificar si ya existe otro tipo de gasto con ese nombre
    const duplicateTipo = await prisma.tipoGasto.findFirst({
      where: { 
        nombre: nombre.trim(),
        id: { not: parseInt(id) }
      }
    })

    if (duplicateTipo) {
      return NextResponse.json({ error: 'Ya existe un tipo de gasto con ese nombre' }, { status: 400 })
    }

    const tipoGasto = await prisma.tipoGasto.update({
      where: { id: parseInt(id) },
      data: {
        nombre: nombre.trim()
      }
    })

    return NextResponse.json({ tipoGasto })
  } catch (error) {
    console.error('Error al actualizar tipo de gasto:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const { id } = await params

    // Verificar si el tipo de gasto existe
    const existingTipo = await prisma.tipoGasto.findUnique({
      where: { id: parseInt(id) },
      include: {
        movimientos: true
      }
    })

    if (!existingTipo) {
      return NextResponse.json({ error: 'Tipo de gasto no encontrado' }, { status: 404 })
    }

    // Verificar si tiene movimientos asociados
    if (existingTipo.movimientos.length > 0) {
      return NextResponse.json({ 
        error: 'No se puede eliminar este tipo de gasto porque tiene movimientos asociados' 
      }, { status: 400 })
    }

    await prisma.tipoGasto.delete({
      where: { id: parseInt(id) }
    })

    return NextResponse.json({ message: 'Tipo de gasto eliminado exitosamente' })
  } catch (error) {
    console.error('Error al eliminar tipo de gasto:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
