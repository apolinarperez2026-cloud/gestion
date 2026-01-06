import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { parseDateOnly } from '@/lib/dateUtils'

// GET - Obtener todos los cobros TPV
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

    const tpvs = await prisma.tpv.findMany({
      where: whereClause,
      orderBy: {
        fecha: 'desc'
      }
    })

    return NextResponse.json({ tpvs })
  } catch (error) {
    console.error('Error al obtener cobros TPV:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Crear nuevo cobro TPV
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

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

    // Crear fecha específica para evitar problemas de zona horaria
    const fechaEspecifica = parseDateOnly(fecha)
    
    const tpv = await prisma.tpv.create({
      data: {
        fecha: fechaEspecifica,
        quienCobro,
        monto: parseFloat(monto),
        estado,
        foto: foto || null,
        usuarioRegistro,
        sucursalId: decoded.sucursalId,
        usuarioId: decoded.userId
      }
    })

    return NextResponse.json({ tpv }, { status: 201 })
  } catch (error) {
    console.error('Error al crear cobro TPV:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
