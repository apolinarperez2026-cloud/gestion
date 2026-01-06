import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    // Verificar autenticación
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorización requerido' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    const { monto, fecha } = await request.json()

    // Validar datos requeridos
    if (!monto || monto <= 0) {
      return NextResponse.json(
        { error: 'El monto es requerido y debe ser mayor a 0' },
        { status: 400 }
      )
    }

    if (!fecha) {
      return NextResponse.json(
        { error: 'La fecha es requerida' },
        { status: 400 }
      )
    }

    // Verificar que el fondo de caja inicial existe
    const fondoExistente = await prisma.fondoCajaInicial.findUnique({
      where: { id }
    })

    if (!fondoExistente) {
      return NextResponse.json(
        { error: 'Fondo de caja inicial no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que no haya otro fondo inicial para la misma fecha y sucursal
    const fechaEspecifica = new Date(fecha)
    const otroFondo = await prisma.fondoCajaInicial.findFirst({
      where: {
        id: { not: id },
        sucursalId: fondoExistente.sucursalId,
        fecha: {
          gte: new Date(fechaEspecifica.getFullYear(), fechaEspecifica.getMonth(), fechaEspecifica.getDate()),
          lt: new Date(fechaEspecifica.getFullYear(), fechaEspecifica.getMonth(), fechaEspecifica.getDate() + 1)
        }
      }
    })

    if (otroFondo) {
      return NextResponse.json(
        { error: 'Ya existe un fondo de caja inicial para esta fecha en esta sucursal' },
        { status: 400 }
      )
    }

    // Actualizar el fondo de caja inicial
    const fondoActualizado = await prisma.fondoCajaInicial.update({
      where: { id },
      data: {
        monto: parseFloat(monto),
        fecha: fechaEspecifica,
        usuarioId: decoded.userId
      },
      include: {
        sucursal: true,
        usuario: {
          include: {
            rol: true
          }
        }
      }
    })

    return NextResponse.json({ 
      message: 'Fondo de caja inicial actualizado exitosamente',
      fondoCajaInicial: fondoActualizado 
    }, { status: 200 })

  } catch (error) {
    console.error('Error al actualizar fondo de caja inicial:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    // Verificar autenticación
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorización requerido' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    // Verificar que el usuario es administrador
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
      include: { rol: true }
    })

    if (!usuario || usuario.rol.nombre !== 'Administrador') {
      return NextResponse.json(
        { error: 'No tienes permisos para eliminar fondos de caja inicial' },
        { status: 403 }
      )
    }

    // Verificar que el fondo de caja inicial existe
    const fondoExistente = await prisma.fondoCajaInicial.findUnique({
      where: { id }
    })

    if (!fondoExistente) {
      return NextResponse.json(
        { error: 'Fondo de caja inicial no encontrado' },
        { status: 404 }
      )
    }

    // Eliminar el fondo de caja inicial
    await prisma.fondoCajaInicial.delete({
      where: { id }
    })

    return NextResponse.json({ 
      message: 'Fondo de caja inicial eliminado exitosamente'
    }, { status: 200 })

  } catch (error) {
    console.error('Error al eliminar fondo de caja inicial:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
