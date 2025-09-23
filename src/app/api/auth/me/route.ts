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
        sucursal: true,
        sucursales: {
          include: {
            sucursal: true
          }
        }
      }
    })

    if (!usuario) {
      return NextResponse.json(
        { message: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Buscar la sucursal correcta basada en el token
    let sucursalActual = null
    if (decoded.sucursalId) {
      // Para administradores, buscar directamente en la tabla de sucursales
      if (decoded.rol === 'Administrador') {
        const sucursal = await prisma.sucursal.findUnique({
          where: { id: decoded.sucursalId }
        })
        if (sucursal) {
          sucursalActual = {
            id: sucursal.id,
            nombre: sucursal.nombre
          }
        }
      } else {
        // Para otros usuarios, buscar en las sucursales asignadas
        const sucursalEncontrada = usuario.sucursales.find(us => us.sucursalId === decoded.sucursalId)
        if (sucursalEncontrada) {
          sucursalActual = {
            id: sucursalEncontrada.sucursal.id,
            nombre: sucursalEncontrada.sucursal.nombre
          }
        } else {
          // Fallback a la sucursal principal si no se encuentra en las asignadas
          sucursalActual = usuario.sucursal ? {
            id: usuario.sucursal.id,
            nombre: usuario.sucursal.nombre
          } : null
        }
      }
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
      sucursal: sucursalActual,
      sucursalId: decoded.sucursalId || null,
      sucursalesAsignadas: usuario.sucursales.map(us => ({
        id: us.sucursal.id,
        nombre: us.sucursal.nombre,
        direccion: us.sucursal.direccion
      }))
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
