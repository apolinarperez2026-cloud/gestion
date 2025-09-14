import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: idParam } = await params
    const id = parseInt(idParam)

    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const body = await request.json()
    const { nombre, email, password, rolId, sucursalId, sucursalesIds } = body

    // Validar datos requeridos
    if (!nombre || !email || !rolId) {
      return NextResponse.json(
        { error: 'Nombre, email y rol son requeridos' },
        { status: 400 }
      )
    }

    // Verificar que el usuario existe
    const existingUser = await prisma.usuario.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Verificar que el email no esté en uso por otro usuario
    const emailInUse = await prisma.usuario.findFirst({
      where: {
        email,
        id: { not: id }
      }
    })

    if (emailInUse) {
      return NextResponse.json(
        { error: 'El email ya está registrado' },
        { status: 400 }
      )
    }

    // Actualizar usuario con transacción para manejar sucursales
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Preparar datos de actualización
      const updateData: any = {
        nombre,
        email,
        rolId: parseInt(rolId),
        sucursalId: sucursalId ? parseInt(sucursalId) : null
      }

      // Solo actualizar contraseña si se proporciona
      if (password && password.trim() !== '') {
        updateData.password = await bcrypt.hash(password, 10)
      }

      // Actualizar usuario
      await tx.usuario.update({
        where: { id },
        data: updateData
      })

      // Eliminar asignaciones de sucursales existentes
      await tx.usuarioSucursal.deleteMany({
        where: { usuarioId: id }
      })

      // Crear nuevas asignaciones de sucursales si se proporcionan
      if (sucursalesIds && sucursalesIds.length > 0) {
        await tx.usuarioSucursal.createMany({
          data: sucursalesIds.map((sucursalId: number) => ({
            usuarioId: id,
            sucursalId: parseInt(sucursalId)
          }))
        })
      }

      // Retornar usuario actualizado con todas las relaciones
      return await tx.usuario.findUnique({
        where: { id },
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
      message: 'Usuario actualizado exitosamente',
      usuario: updatedUser
    })

  } catch (error) {
    console.error('Error al actualizar usuario:', error)
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

    const { id: idParam } = await params
    const id = parseInt(idParam)

    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    // Verificar que el usuario existe
    const existingUser = await prisma.usuario.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // No permitir que el administrador se elimine a sí mismo
    if (id === user.id) {
      return NextResponse.json(
        { error: 'No puedes eliminar tu propia cuenta' },
        { status: 400 }
      )
    }

    // Eliminar usuario
    await prisma.usuario.delete({
      where: { id }
    })

    return NextResponse.json({
      message: 'Usuario eliminado exitosamente'
    })

  } catch (error) {
    console.error('Error al eliminar usuario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
