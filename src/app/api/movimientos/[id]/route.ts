import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { 
      fecha,
      descripcion, 
      monto, 
      tipo, 
      imagen,
      formaDePagoId, 
      tipoGastoId 
    } = await request.json()

    console.log('Actualizando movimiento:', { 
      id,
      fecha,
      descripcion, 
      monto, 
      tipo, 
      imagen,
      formaDePagoId, 
      tipoGastoId 
    })

    if (!descripcion || !monto || !tipo) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // Validar que si es VENTA tenga formaDePagoId, si es GASTO tenga tipoGastoId
    if (tipo === 'VENTA' && !formaDePagoId) {
      return NextResponse.json(
        { error: 'Las ventas requieren una forma de pago' },
        { status: 400 }
      )
    }

    if (tipo === 'GASTO' && !tipoGastoId) {
      return NextResponse.json(
        { error: 'Los gastos requieren un tipo de gasto' },
        { status: 400 }
      )
    }

    // Crear fecha específica para evitar problemas de zona horaria
    const fechaEspecifica = fecha ? new Date(fecha + 'T12:00:00.000Z') : undefined
    
    const movimiento = await prisma.movimiento.update({
      where: { id: parseInt(id) },
      data: {
        fecha: fechaEspecifica,
        descripcion,
        monto,
        tipo,
        imagen: imagen !== undefined ? imagen : undefined,
        formaDePagoId: tipo === 'VENTA' ? formaDePagoId : null,
        tipoGastoId: tipo === 'GASTO' ? tipoGastoId : null
      },
      include: {
        formaDePago: true,
        tipoGasto: true,
        sucursal: true,
        usuario: {
          include: {
            rol: true
          }
        }
      }
    })

    return NextResponse.json({ movimiento })
  } catch (error) {
    console.error('Error al actualizar movimiento:', error)
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
    const { id } = await params

    // Verificar autenticación
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorización requerido' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    
    // Verificar el token y obtener el usuario
    const userResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    const userData = await userResponse.json()
    const user = userData.user

    // Verificar que el usuario sea administrador
    if (user.rol.nombre !== 'Administrador') {
      return NextResponse.json(
        { error: 'Solo los administradores pueden eliminar movimientos' },
        { status: 403 }
      )
    }

    console.log('Eliminando movimiento:', { id, usuario: user.nombre })

    await prisma.movimiento.delete({
      where: { id: parseInt(id) }
    })

    return NextResponse.json({ message: 'Movimiento eliminado exitosamente' })
  } catch (error) {
    console.error('Error al eliminar movimiento:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}