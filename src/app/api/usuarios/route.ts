import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  try {
    // Verificar token de autenticación
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    // Obtener usuario
    const user = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
      include: { rol: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Verificar que sea administrador
    if (user.rol.nombre !== 'Administrador') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Obtener todos los usuarios excepto el administrador principal
    const usuarios = await prisma.usuario.findMany({
      where: {
        id: { not: user.id } // Excluir al administrador actual
      },
      include: {
        rol: true,
        sucursal: true,
        sucursales: {
          include: {
            sucursal: true
          }
        }
      },
      orderBy: { nombre: 'asc' }
    })

    return NextResponse.json({ usuarios })

  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar token de autenticación
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    // Obtener usuario
    const user = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
      include: { rol: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Verificar que sea administrador
    if (user.rol.nombre !== 'Administrador') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { nombre, email, password, rolId, sucursalId, sucursalesIds } = body

    // Validar datos requeridos
    if (!nombre || !email || !password || !rolId) {
      return NextResponse.json(
        { error: 'Nombre, email, contraseña y rol son requeridos' },
        { status: 400 }
      )
    }

    // Verificar que el email no exista
    const existingUser = await prisma.usuario.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'El email ya está registrado' },
        { status: 400 }
      )
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10)

    // Crear usuario con transacción para manejar sucursales
    const newUser = await prisma.$transaction(async (tx) => {
      // Crear usuario
      const user = await tx.usuario.create({
        data: {
          nombre,
          email,
          password: hashedPassword,
          rolId: parseInt(rolId),
          sucursalId: sucursalId ? parseInt(sucursalId) : null // Sucursal principal opcional
        }
      })

      // Asignar sucursales adicionales si se proporcionan
      if (sucursalesIds && sucursalesIds.length > 0) {
        await tx.usuarioSucursal.createMany({
          data: sucursalesIds.map((sucursalId: number) => ({
            usuarioId: user.id,
            sucursalId: sucursalId
          }))
        })
      }

      // Retornar usuario con todas las relaciones
      return await tx.usuario.findUnique({
        where: { id: user.id },
        include: {
          rol: true,
          sucursal: true,
          sucursales: {
            include: {
              sucursal: true
            }
          }
        }
      })
    })

    return NextResponse.json({
      message: 'Usuario creado exitosamente',
      usuario: newUser
    })

  } catch (error) {
    console.error('Error al crear usuario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
