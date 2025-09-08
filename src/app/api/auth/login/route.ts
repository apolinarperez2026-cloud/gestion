import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { LoginData, AuthUser } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    const body: LoginData = await request.json()
    const { email, password } = body

    // Buscar usuario en la base de datos
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: {
        rol: true,
        sucursal: true
      }
    })

    if (!usuario) {
      return NextResponse.json(
        { message: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    // Verificar contraseña
    const contraseñaValida = await bcrypt.compare(password, usuario.password)
    if (!contraseñaValida) {
      return NextResponse.json(
        { message: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    // Crear token JWT
    const token = jwt.sign(
      { 
        userId: usuario.id,
        email: usuario.email,
        rol: usuario.rol.nombre,
        sucursalId: usuario.sucursalId
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    // Crear respuesta con datos del usuario (sin contraseña)
    const authUser: AuthUser = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: {
        id: usuario.rol.id,
        nombre: usuario.rol.nombre
      },
      sucursal: usuario.sucursal ? {
        id: usuario.sucursal.id,
        nombre: usuario.sucursal.nombre
      } : null,
      sucursalId: usuario.sucursalId || null
    }

    const response = NextResponse.json({
      message: 'Login exitoso',
      user: authUser,
      token: token
    })

    // Establecer cookie con el token
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 días
    })

    return response
  } catch (error) {
    console.error('Error en login:', error)
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
