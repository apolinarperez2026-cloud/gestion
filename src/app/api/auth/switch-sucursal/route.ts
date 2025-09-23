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
    
    const body = await request.json()
    const { sucursalId } = body

    // Si sucursalId es null, crear token sin sucursal específica (para mostrar selector)
    if (sucursalId === null) {
      const newToken = jwt.sign(
        {
          userId: decoded.userId,
          email: decoded.email,
          rol: decoded.rol,
          sucursalId: null,
          sucursalNombre: null
        },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      )

      const response = NextResponse.json({
        message: 'Token actualizado para mostrar selector de sucursales',
        token: newToken,
        sucursal: null
      })

      response.cookies.set('auth-token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 // 24 horas
      })

      return response
    }

    if (!sucursalId) {
      return NextResponse.json({ message: 'ID de sucursal requerido' }, { status: 400 })
    }
    
    // Obtener el usuario con sus sucursales asignadas
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
      include: {
        rol: true,
        sucursales: {
          include: {
            sucursal: true
          }
        }
      }
    })

    if (!usuario) {
      return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 })
    }

    // Verificar permisos: Administradores pueden cambiar a cualquier sucursal,
    // otros usuarios solo pueden cambiar a sus sucursales asignadas
    if (decoded.rol !== 'Administrador') {
      const tieneAcceso = usuario.sucursales.some(us => us.sucursalId === parseInt(sucursalId))
      if (!tieneAcceso) {
        return NextResponse.json({ message: 'No tienes acceso a esta sucursal' }, { status: 403 })
      }
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
