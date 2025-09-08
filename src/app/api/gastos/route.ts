import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  try {
    // Verificar token de autenticación
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    // Usar la sucursal del token JWT (si está disponible) o la de la base de datos
    const sucursalId = decoded.sucursalId

    if (!sucursalId) {
      return NextResponse.json({ error: 'No se puede determinar la sucursal' }, { status: 400 })
    }

    // Obtener gastos de la sucursal
    const gastos = await prisma.gasto.findMany({
      where: { sucursalId: sucursalId },
      include: {
        tipoGasto: true
      },
      orderBy: { fecha: 'desc' }
    })

    return NextResponse.json({ gastos })

  } catch (error) {
    console.error('Error al obtener gastos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar token de autenticación
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    const body = await request.json()
    const { fecha, tipoGastoId, monto, descripcion, referencia } = body

    // Validar datos requeridos
    if (!fecha || !tipoGastoId || !monto || !descripcion) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    // Usar la sucursal del token JWT
    const sucursalId = decoded.sucursalId

    if (!sucursalId) {
      return NextResponse.json({ error: 'No se puede determinar la sucursal' }, { status: 400 })
    }

    // Crear el gasto
    const gasto = await prisma.gasto.create({
      data: {
        fecha: new Date(fecha),
        tipoGastoId: parseInt(tipoGastoId),
        monto: parseFloat(monto),
        descripcion,
        referencia: referencia || null,
        sucursalId: sucursalId
      },
      include: {
        tipoGasto: true
      }
    })

    return NextResponse.json(gasto, { status: 201 })

  } catch (error) {
    console.error('Error al crear gasto:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
