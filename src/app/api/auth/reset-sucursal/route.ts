import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ message: 'Token no proporcionado' }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    
    // Verificar que sea administrador
    if (decoded.rol !== 'Administrador') {
      return NextResponse.json({ message: 'Solo los administradores pueden resetear la sucursal' }, { status: 403 })
    }

    // Obtener el usuario original de la base de datos
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
      include: {
        rol: true,
        sucursal: true
      }
    })

    if (!usuario) {
      return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 })
    }

    // Crear un nuevo token sin sucursal específica (vista de administrador)
    const newToken = jwt.sign(
      {
        userId: usuario.id,
        email: usuario.email,
        rol: usuario.rol.nombre,
        sucursalId: null,
        sucursalNombre: null
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    )

    // Crear la respuesta
    const response = NextResponse.json({
      message: 'Sucursal reseteada exitosamente',
      token: newToken,
      sucursal: null
    })

    // Establecer el nuevo token como cookie
    response.cookies.set('auth-token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 horas
    })

    return response
  } catch (error) {
    console.error('Error al resetear sucursal:', error)
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 })
  }
}
