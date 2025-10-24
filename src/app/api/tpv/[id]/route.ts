import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { parseDateOnly } from '@/lib/dateUtils'

// PUT - Actualizar cobro TPV (solo administradores)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    // Verificar que sea administrador
    if (decoded.rol !== 'Administrador') {
      return NextResponse.json({ error: 'No autorizado. Solo administradores pueden editar cobros TPV' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { fecha, quienCobro, monto, estado, foto, usuarioRegistro } = body

    // Validar datos requeridos
    if (!fecha || !quienCobro || monto === undefined || !estado || !usuarioRegistro) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      )
    }

    // Validar estado
    if (!['exitoso', 'en_proceso'].includes(estado)) {
      return NextResponse.json(
        { error: 'Estado debe ser "exitoso" o "en_proceso"' },
        { status: 400 }
      )
    }

    // Validar monto
    if (monto < 0) {
      return NextResponse.json(
        { error: 'El monto no puede ser negativo' },
        { status: 400 }
      )
    }

    // Verificar que el cobro TPV existe
    const existingTpv = await prisma.tpv.findUnique({
      where: { id: parseInt(id) }
    })

    if (!existingTpv) {
      return NextResponse.json(
        { error: 'Cobro TPV no encontrado' },
        { status: 404 }
      )
    }

    // Crear fecha específica para evitar problemas de zona horaria
    const fechaEspecifica = parseDateOnly(fecha)
    
    const tpv = await prisma.tpv.update({
      where: { id: parseInt(id) },
      data: {
        fecha: fechaEspecifica,
        quienCobro,
        monto: parseFloat(monto),
        estado,
        foto: foto || null,
        usuarioRegistro
      }
    })

    return NextResponse.json({ tpv })
  } catch (error) {
    console.error('Error al actualizar cobro TPV:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar cobro TPV (solo administradores)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    // Verificar que sea administrador
    if (decoded.rol !== 'Administrador') {
      return NextResponse.json({ error: 'No autorizado. Solo administradores pueden eliminar cobros TPV' }, { status: 403 })
    }

    const { id } = await params

    // Verificar que el cobro TPV existe
    const existingTpv = await prisma.tpv.findUnique({
      where: { id: parseInt(id) }
    })

    if (!existingTpv) {
      return NextResponse.json(
        { error: 'Cobro TPV no encontrado' },
        { status: 404 }
      )
    }

    await prisma.tpv.delete({
      where: { id: parseInt(id) }
    })

    return NextResponse.json({ message: 'Cobro TPV eliminado exitosamente' })
  } catch (error) {
    console.error('Error al eliminar cobro TPV:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
