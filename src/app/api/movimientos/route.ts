import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const movimientos = await prisma.movimiento.findMany({
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

    const movimiento = await prisma.movimiento.create({
      data: {
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