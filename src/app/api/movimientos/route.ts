import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { parseDateOnly } from '@/lib/dateUtils'

const prisma = new PrismaClient()

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

    // Si es administrador sin sucursal específica, mostrar todos los movimientos
    // Si tiene sucursal específica, filtrar por esa sucursal
    let whereClause: any = decoded.rol === 'Administrador' && !decoded.sucursalId 
      ? {} 
      : decoded.sucursalId 
        ? { sucursalId: decoded.sucursalId }
        : {}

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

    const movimientos = await prisma.movimiento.findMany({
      where: whereClause,
      include: {
        formaDePago: true,
        tipoGasto: true,
        sucursal: true,
        usuario: {
          include: {
            rol: true
          }
        }
      },
      orderBy: { fecha: 'desc' }
    })

    return NextResponse.json({ movimientos })
  } catch (error) {
    console.error('Error al obtener movimientos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      fecha,
      descripcion, 
      monto, 
      tipo, 
      imagen,
      formaDePagoId, 
      tipoGastoId, 
      sucursalId,
      usuarioId
    } = await request.json()

    console.log('Datos recibidos:', { 
      fecha,
      descripcion, 
      monto, 
      tipo, 
      imagen,
      formaDePagoId, 
      tipoGastoId, 
      sucursalId,
      usuarioId
    })

    if (!descripcion || !monto || !tipo || !sucursalId) {
      console.log('Validación fallida:', {
        descripcion: !!descripcion,
        monto: !!monto,
        tipo: !!tipo,
        sucursalId: !!sucursalId,
        usuarioId: !!usuarioId
      })
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

    // Crear fecha específica sin horario
    const fechaEspecifica = fecha ? parseDateOnly(fecha) : new Date()
    
    const movimiento = await prisma.movimiento.create({
      data: {
        fecha: fechaEspecifica,
        descripcion,
        monto,
        tipo,
        imagen: imagen || null,
        formaDePagoId: tipo === 'VENTA' ? formaDePagoId : null,
        tipoGastoId: tipo === 'GASTO' ? tipoGastoId : null,
        sucursalId,
        usuarioId: usuarioId || null
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

    return NextResponse.json({ movimiento }, { status: 201 })
  } catch (error) {
    console.error('Error al crear movimiento:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}