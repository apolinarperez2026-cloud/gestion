import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { CreateUsuarioData } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    const body: Omit<CreateUsuarioData, 'rolId' | 'sucursalId'> = await request.json()
    const { nombre, email, password } = body

    // Verificar si el email ya existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email }
    })

    if (usuarioExistente) {
      return NextResponse.json(
        { message: 'El email ya está registrado' },
        { status: 400 }
      )
    }

    // Encriptar contraseña
    const contraseñaEncriptada = await bcrypt.hash(password, 12)

    // Buscar o crear rol de "Empleado" por defecto
    let rolEmpleado = await prisma.rol.findFirst({
      where: { nombre: 'Empleado' }
    })

    if (!rolEmpleado) {
      rolEmpleado = await prisma.rol.create({
        data: { nombre: 'Empleado' }
      })
    }

    // Buscar o crear sucursal por defecto
    let sucursalDefault = await prisma.sucursal.findFirst({
      where: { nombre: 'Sucursal Principal' }
    })

    if (!sucursalDefault) {
      sucursalDefault = await prisma.sucursal.create({
        data: {
          nombre: 'Sucursal Principal',
          direccion: 'Dirección por defecto'
        }
      })
    }

    // Crear usuario
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre,
        email,
        password: contraseñaEncriptada,
        rolId: rolEmpleado.id,
        sucursalId: sucursalDefault.id
      },
      include: {
        rol: true,
        sucursal: true
      }
    })

    return NextResponse.json({
      message: 'Usuario creado exitosamente',
      user: {
        id: nuevoUsuario.id,
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol.nombre,
        sucursal: nuevoUsuario.sucursal.nombre
      }
    })
  } catch (error) {
    console.error('Error en registro:', error)
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
