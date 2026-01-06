import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

// DELETE - Eliminar mercadería
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
        { error: 'No tienes permisos para eliminar mercaderías' },
        { status: 403 }
      )
    }

    // Verificar que la mercadería existe
    const mercaderiaExistente = await prisma.mercaderia.findUnique({
      where: { id }
    })

    if (!mercaderiaExistente) {
      return NextResponse.json(
        { error: 'Mercadería no encontrada' },
        { status: 404 }
      )
    }

    // Eliminar la mercadería
    await prisma.mercaderia.delete({
      where: { id }
    })

    return NextResponse.json({ 
      message: 'Mercadería eliminada exitosamente'
    }, { status: 200 })

  } catch (error) {
    console.error('Error al eliminar mercadería:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}