import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { parseDateOnly } from '@/lib/dateUtils'

// GET - Obtener todos los depósitos de caja
export async function GET(request: NextRequest) {
  try {
    // Obtener el token del header Authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    // Si es administrador sin sucursal específica, mostrar todos los depósitos
    // Si tiene sucursal específica, filtrar por esa sucursal
    const whereClause = decoded.rol === 'Administrador' && !decoded.sucursalId 
      ? {} 
      : { sucursalId: decoded.sucursalId }

    const fondosCaja = await prisma.fondoCaja.findMany({
      where: whereClause,
      include: {
        sucursal: true,
        usuario: {
          select: {
            id: true,
            nombre: true,
            rol: true
          }
        }
      },
      orderBy: { fecha: 'desc' }
    })

    return NextResponse.json({ fondosCaja })
  } catch (error) {
    console.error('Error al obtener depósitos de caja:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Crear nuevo depósito de caja
export async function POST(request: NextRequest) {
  try {
    // Obtener el token del header Authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    const body = await request.json()
    const { monto, fecha, imagen } = body

    // Validar datos requeridos
    if (!monto || monto <= 0) {
      return NextResponse.json(
        { error: 'El monto es requerido y debe ser mayor a 0' },
        { status: 400 }
      )
    }

    if (!decoded.sucursalId) {
      return NextResponse.json(
        { error: 'No se puede determinar la sucursal' },
        { status: 400 }
      )
    }

    // Crear fecha específica sin horario
    const fechaEspecifica = fecha ? parseDateOnly(fecha) : new Date()

    // Usar transacción para crear el depósito de caja y el movimiento automáticamente
    const result = await prisma.$transaction(async (tx) => {
      // Crear el depósito de caja
      const fondoCaja = await tx.fondoCaja.create({
        data: {
          monto: parseFloat(monto),
          fecha: fechaEspecifica,
          imagen: imagen || null,
          sucursalId: decoded.sucursalId,
          usuarioId: decoded.userId
        },
        include: {
          sucursal: true,
          usuario: {
            select: {
              id: true,
              nombre: true,
              rol: true
            }
          }
        }
      })

      // Crear automáticamente un movimiento de tipo FONDO_CAJA
      await tx.movimiento.create({
        data: {
          fecha: fechaEspecifica,
          descripcion: `Depósito de caja - ${fondoCaja.sucursal.nombre}`,
          monto: parseFloat(monto),
          tipo: 'FONDO_CAJA',
          imagen: imagen || null,
          sucursalId: decoded.sucursalId,
          usuarioId: decoded.userId
        }
      })

      return fondoCaja
    })

    return NextResponse.json({ 
      message: 'Depósito de caja creado exitosamente',
      fondoCaja: result 
    }, { status: 201 })
  } catch (error) {
    console.error('Error al crear depósito de caja:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
