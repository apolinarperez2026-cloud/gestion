import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ message: 'Token no proporcionado' }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    
    // Verificar que sea administrador
    if (decoded.rol !== 'Administrador') {
      return NextResponse.json({ message: 'Acceso denegado' }, { status: 403 })
    }

    const sucursales = await prisma.sucursal.findMany({
      orderBy: {
        id: 'asc'
      }
    })

    return NextResponse.json({ sucursales })
  } catch (error) {
    console.error('Error al obtener sucursales:', error)
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ message: 'Token no proporcionado' }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    
    // Verificar que sea administrador
    if (decoded.rol !== 'Administrador') {
      return NextResponse.json({ message: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()
    const { nombre, direccion } = body

    // Validar datos requeridos
    if (!nombre || !direccion) {
      return NextResponse.json({ message: 'Nombre y dirección son requeridos' }, { status: 400 })
    }

    // Verificar que no exista una sucursal con el mismo nombre
    const sucursalExistente = await prisma.sucursal.findFirst({
      where: {
        nombre: {
          equals: nombre,
          mode: 'insensitive'
        }
      }
    })

    if (sucursalExistente) {
      return NextResponse.json({ message: 'Ya existe una sucursal con ese nombre' }, { status: 400 })
    }

    const sucursal = await prisma.sucursal.create({
      data: {
        nombre,
        direccion
      }
    })

    return NextResponse.json(sucursal, { status: 201 })
  } catch (error) {
    console.error('Error al crear sucursal:', error)
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 })
  }
}