import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { AuthUser } from '@/types/database'

export async function GET(request: NextRequest) {
  try {
    // Intentar obtener el token del header Authorization primero
    let token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    // Si no está en el header, intentar obtenerlo de las cookies
    if (!token) {
      token = request.cookies.get('auth-token')?.value
    }

    if (!token) {
      return NextResponse.json(
        { message: 'No autorizado' },
        { status: 401 }
      )
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
      include: {
        rol: true,
        sucursal: true
      }
    })

    if (!usuario) {
      return NextResponse.json(
        { message: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Usar la información del token JWT para la sucursal (si está disponible)
    const authUser: AuthUser = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: {
        id: usuario.rol.id,
        nombre: usuario.rol.nombre
      },
      sucursal: decoded.sucursalId ? {
        id: decoded.sucursalId,
        nombre: usuario.sucursal?.nombre || 'Sucursal'
      } : null,
      sucursalId: decoded.sucursalId || null
    }

    return NextResponse.json({ user: authUser })
  } catch (error) {
    console.error('Error en /api/auth/me:', error)
    return NextResponse.json(
      { message: 'Token inválido' },
      { status: 401 }
    )
  }
}
