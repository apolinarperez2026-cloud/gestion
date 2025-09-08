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

    // Verificar si la forma de pago existe
    const existingForma = await prisma.formaDePago.findUnique({
      where: { id: parseInt(id) }
    })

    if (!existingForma) {
      return NextResponse.json({ error: 'Forma de pago no encontrada' }, { status: 404 })
    }

    // Verificar si ya existe otra forma de pago con ese nombre
    const duplicateForma = await prisma.formaDePago.findFirst({
      where: { 
        nombre: nombre.trim(),
        id: { not: parseInt(id) }
      }
    })

    if (duplicateForma) {
      return NextResponse.json({ error: 'Ya existe una forma de pago con ese nombre' }, { status: 400 })
    }

    const formaDePago = await prisma.formaDePago.update({
      where: { id: parseInt(id) },
      data: {
        nombre: nombre.trim()
      }
    })

    return NextResponse.json({ formaDePago })
  } catch (error) {
    console.error('Error al actualizar forma de pago:', error)
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

    // Verificar si la forma de pago existe
    const existingForma = await prisma.formaDePago.findUnique({
      where: { id: parseInt(id) },
      include: {
        movimientos: true
      }
    })

    if (!existingForma) {
      return NextResponse.json({ error: 'Forma de pago no encontrada' }, { status: 404 })
    }

    // Verificar si tiene movimientos asociados
    if (existingForma.movimientos.length > 0) {
      return NextResponse.json({ 
        error: 'No se puede eliminar esta forma de pago porque tiene movimientos asociados' 
      }, { status: 400 })
    }

    await prisma.formaDePago.delete({
      where: { id: parseInt(id) }
    })

    return NextResponse.json({ message: 'Forma de pago eliminada exitosamente' })
  } catch (error) {
    console.error('Error al eliminar forma de pago:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
