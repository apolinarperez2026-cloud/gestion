import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id: idParam } = await params
    const id = parseInt(idParam)

    if (isNaN(id)) {
      return NextResponse.json({ message: 'ID inválido' }, { status: 400 })
    }

    const body = await request.json()
    const { nombre, direccion } = body

    // Validar datos requeridos
    if (!nombre || !direccion) {
      return NextResponse.json({ message: 'Nombre y dirección son requeridos' }, { status: 400 })
    }

    // Verificar que la sucursal existe
    const sucursalExistente = await prisma.sucursal.findUnique({
      where: { id }
    })

    if (!sucursalExistente) {
      return NextResponse.json({ message: 'Sucursal no encontrada' }, { status: 404 })
    }

    // Verificar que no exista otra sucursal con el mismo nombre
    const sucursalConMismoNombre = await prisma.sucursal.findFirst({
      where: {
        nombre: {
          equals: nombre,
          mode: 'insensitive'
        },
        id: {
          not: id
        }
      }
    })

    if (sucursalConMismoNombre) {
      return NextResponse.json({ message: 'Ya existe otra sucursal con ese nombre' }, { status: 400 })
    }

    const sucursal = await prisma.sucursal.update({
      where: { id },
      data: {
        nombre,
        direccion
      }
    })

    return NextResponse.json(sucursal)
  } catch (error) {
    console.error('Error al actualizar sucursal:', error)
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id: idParam } = await params
    const id = parseInt(idParam)

    if (isNaN(id)) {
      return NextResponse.json({ message: 'ID inválido' }, { status: 400 })
    }

    // Verificar que la sucursal existe
    const sucursalExistente = await prisma.sucursal.findUnique({
      where: { id },
      include: {
        usuarios: true,
        movimientos: true,
        depositos: true,
        fondosCajaInicial: true,
        pedidosEspeciales: true
      }
    })

    if (!sucursalExistente) {
      return NextResponse.json({ message: 'Sucursal no encontrada' }, { status: 404 })
    }

    // Verificar que no tenga datos relacionados
    if (sucursalExistente.usuarios.length > 0) {
      return NextResponse.json({ 
        message: 'No se puede eliminar la sucursal porque tiene usuarios asignados' 
      }, { status: 400 })
    }

    if (sucursalExistente.movimientos.length > 0) {
      return NextResponse.json({ 
        message: 'No se puede eliminar la sucursal porque tiene movimientos registrados' 
      }, { status: 400 })
    }

    if (sucursalExistente.depositos.length > 0 || sucursalExistente.fondosCajaInicial.length > 0) {
      return NextResponse.json({ 
        message: 'No se puede eliminar la sucursal porque tiene depósitos o fondos de caja registrados' 
      }, { status: 400 })
    }

    if (sucursalExistente.pedidosEspeciales.length > 0) {
      return NextResponse.json({ 
        message: 'No se puede eliminar la sucursal porque tiene pedidos especiales registrados' 
      }, { status: 400 })
    }

    await prisma.sucursal.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Sucursal eliminada exitosamente' })
  } catch (error) {
    console.error('Error al eliminar sucursal:', error)
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 })
  }
}
