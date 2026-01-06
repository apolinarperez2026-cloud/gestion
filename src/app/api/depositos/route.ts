import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { parseDateOnly } from '@/lib/dateUtils'

// GET - Obtener todos los depósitos bancarios
export async function GET(request: NextRequest) {
  try {
    // Obtener el token del header Authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    // Obtener parámetro de mes de la URL
    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month')

    // Construir whereClause dinámicamente según rol, sucursal y mes
    let whereClause: any = {}

    // Base según rol y sucursal
    if (decoded.rol === 'Administrador' && !decoded.sucursalId) {
      whereClause = {}
    } else if (decoded.sucursalId) {
      whereClause = { sucursalId: decoded.sucursalId }
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

    const depositos = await prisma.deposito.findMany({
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

    return NextResponse.json({ depositos })
  } catch (error) {
    console.error('Error al obtener depósitos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Crear nuevo depósito bancario
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

    // Usar transacción para crear el depósito y el movimiento automáticamente
    const result = await prisma.$transaction(async (tx) => {
      // Crear el depósito bancario
      const deposito = await tx.deposito.create({
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

      // Crear automáticamente un movimiento de tipo DEPOSITO
      await tx.movimiento.create({
        data: {
          fecha: fechaEspecifica,
          descripcion: `Depósito bancario - ${deposito.sucursal.nombre}`,
          monto: parseFloat(monto),
          tipo: 'DEPOSITO',
          imagen: imagen || null,
          sucursalId: decoded.sucursalId,
          usuarioId: decoded.userId
        }
      })

      return deposito
    })

    return NextResponse.json({ 
      message: 'Depósito bancario creado exitosamente',
      deposito: result 
    }, { status: 201 })
  } catch (error) {
    console.error('Error al crear depósito:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
