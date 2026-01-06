import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { parseDateOnly } from '@/lib/dateUtils'

// GET - Obtener todas las mercaderías
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    // Obtener parámetro de mes de la URL
    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month')

    let whereClause: any = {
      sucursalId: decoded.sucursalId
    }

    // Si se proporciona un mes, agregar filtro por fecha
    if (monthParam) {
      const [year, month] = monthParam.split('-')
      if (year && month) {
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
        const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)
        
        whereClause.fecha = {
          gte: startDate,
          lte: endDate
        }
      }
    }

    const mercaderias = await prisma.mercaderia.findMany({
      where: whereClause,
      orderBy: {
        fecha: 'desc'
      }
    })

    return NextResponse.json({ mercaderias })
  } catch (error) {
    console.error('Error al obtener mercaderías:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Crear nueva mercadería
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    const body = await request.json()
    const { fecha, tipo, referencia, entrega, recibe, monto } = body

    // Validar datos requeridos
    if (!fecha || !tipo || !referencia || !entrega || !recibe || monto === undefined) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      )
    }

    // Validar tipo
    if (!['entrada', 'salida'].includes(tipo)) {
      return NextResponse.json(
        { error: 'Tipo debe ser "entrada" o "salida"' },
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

    const mercaderia = await prisma.mercaderia.create({
      data: {
        fecha: parseDateOnly(fecha),
        tipo,
        referencia,
        entrega,
        recibe,
        monto: parseFloat(monto),
        sucursalId: decoded.sucursalId,
        usuarioId: decoded.userId
      }
    })

    return NextResponse.json({ mercaderia }, { status: 201 })
  } catch (error) {
    console.error('Error al crear mercadería:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar mercadería existente
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    const body = await request.json()
    const { id, fecha, tipo, referencia, entrega, recibe, monto } = body

    // Validar datos requeridos
    if (!id || !fecha || !tipo || !referencia || !entrega || !recibe || monto === undefined) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      )
    }

    // Validar tipo
    if (!['entrada', 'salida'].includes(tipo)) {
      return NextResponse.json(
        { error: 'Tipo debe ser "entrada" o "salida"' },
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

    // Verificar que la mercadería existe y pertenece a la sucursal del usuario
    const mercaderiaExistente = await prisma.mercaderia.findFirst({
      where: {
        id: parseInt(id),
        sucursalId: decoded.sucursalId
      }
    })

    if (!mercaderiaExistente) {
      return NextResponse.json(
        { error: 'Mercadería no encontrada o no tienes permisos para editarla' },
        { status: 404 }
      )
    }

    const mercaderia = await prisma.mercaderia.update({
      where: { id: parseInt(id) },
      data: {
        fecha: parseDateOnly(fecha),
        tipo,
        referencia,
        entrega,
        recibe,
        monto: parseFloat(monto)
      }
    })

    return NextResponse.json({ mercaderia })
  } catch (error) {
    console.error('Error al actualizar mercadería:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}