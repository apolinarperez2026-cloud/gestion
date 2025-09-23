import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { parseDateOnly } from '@/lib/dateUtils'

// GET - Obtener todas las garantías
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    const garantias = await prisma.garantia.findMany({
      where: {
        sucursalId: decoded.sucursalId
      },
      orderBy: {
        fechaRegistro: 'desc'
      }
    })

    return NextResponse.json({ garantias })
  } catch (error) {
    console.error('Error al obtener garantías:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Crear nueva garantía
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    const body = await request.json()
    const { fechaRegistro, quienCobro, monto, estado, foto, usuarioRegistro } = body

    // Validar datos requeridos
    if (!fechaRegistro || !quienCobro || monto === undefined || !estado || !usuarioRegistro) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      )
    }

    // Validar estado
    if (!['exitoso', 'devuelto', 'cancelado'].includes(estado)) {
      return NextResponse.json(
        { error: 'Estado debe ser "exitoso", "devuelto" o "cancelado"' },
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

    // Crear fecha específica para evitar problemas de zona horaria
    const fechaEspecifica = parseDateOnly(fechaRegistro)
    
    const garantia = await prisma.garantia.create({
      data: {
        fechaRegistro: fechaEspecifica,
        quienCobro,
        monto: parseFloat(monto),
        estado,
        foto: foto || null,
        usuarioRegistro,
        sucursalId: decoded.sucursalId,
        usuarioId: decoded.userId
      }
    })

    return NextResponse.json({ garantia }, { status: 201 })
  } catch (error) {
    console.error('Error al crear garantía:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
