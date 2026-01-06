import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { parseDateOnly } from '@/lib/dateUtils'

// GET - Obtener todos los fondos de caja iniciales
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

    const fondosCajaInicial = await prisma.fondoCajaInicial.findMany({
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

    return NextResponse.json({ fondosCajaInicial })
  } catch (error) {
    console.error('Error al obtener fondos de caja iniciales:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Crear nuevo fondo de caja inicial
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
    const { monto, fecha } = body

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

    // Crear el fondo de caja inicial
    const result = await prisma.fondoCajaInicial.create({
      data: {
        monto: parseFloat(monto),
        fecha: fechaEspecifica,
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

    return NextResponse.json({ 
      message: 'Fondo de caja inicial creado exitosamente',
      fondoCajaInicial: result 
    }, { status: 201 })
  } catch (error: any) {
    // Si es un error de constraint único (fecha + sucursal)
    if (error.code === 'P2002') {
      console.log('Fondo de caja inicial ya existe para esta fecha y sucursal')
      return NextResponse.json(
        { error: 'Ya existe un fondo de caja inicial para esta fecha y sucursal' },
        { status: 409 }
      )
    }
    
    console.error('Error al crear fondo de caja inicial:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
