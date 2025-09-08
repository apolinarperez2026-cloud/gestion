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
      return NextResponse.json({ message: 'Solo los administradores pueden cambiar de sucursal' }, { status: 403 })
    }

    const body = await request.json()
    const { sucursalId } = body

    if (!sucursalId) {
      return NextResponse.json({ message: 'ID de sucursal requerido' }, { status: 400 })
    }

    // Verificar que la sucursal existe
    const sucursal = await prisma.sucursal.findUnique({
      where: { id: parseInt(sucursalId) }
    })

    if (!sucursal) {
      return NextResponse.json({ message: 'Sucursal no encontrada' }, { status: 404 })
    }

    // Crear un nuevo token con la nueva sucursal
    const newToken = jwt.sign(
      {
        userId: decoded.userId,
        email: decoded.email,
        rol: decoded.rol,
        sucursalId: parseInt(sucursalId),
        sucursalNombre: sucursal.nombre
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    )

    // Crear la respuesta
    const response = NextResponse.json({
      message: 'Sucursal cambiada exitosamente',
      token: newToken,
      sucursal: {
        id: sucursal.id,
        nombre: sucursal.nombre,
        direccion: sucursal.direccion
      }
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
    console.error('Error al cambiar sucursal:', error)
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 })
  }
}
