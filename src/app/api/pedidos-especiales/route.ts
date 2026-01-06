import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { CreatePedidoEspecialData } from '@/types/database'

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

// Determinar qué pedidos puede ver el usuario
    let whereClause: any = {}
    
    if (decoded.rol !== 'Administrador') {
      if (decoded.sucursalId) {
        whereClause.sucursalId = decoded.sucursalId
      } else {
        // Si no tiene sucursalId, verificar sus sucursales asignadas
        const usuarioConSucursales = await prisma.usuario.findUnique({
          where: { id: decoded.userId },
          include: {
            sucursales: {
              select: { sucursalId: true }
            }
          }
        })
        
        if (usuarioConSucursales && usuarioConSucursales.sucursales.length > 0) {
          whereClause.sucursalId = {
            in: usuarioConSucursales.sucursales.map(s => s.sucursalId)
          }
        }
      }
    }

    // Si se proporciona un mes, agregar filtro por fecha
    if (monthParam) {
      const [year, month] = monthParam.split('-')
      if (year && month) {
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
        const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)
        
        whereClause.fechaPedido = {
          gte: startDate,
          lte: endDate
        }
      }
    }

    const pedidos = await prisma.pedidoEspecial.findMany({
      where: whereClause,
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true
          }
        },
        creador: {
          select: {
            id: true,
            nombre: true
          }
        },
        actualizador: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: {
        fechaPedido: 'desc'
      }
    })

    return NextResponse.json({ pedidos })
  } catch (error) {
    console.error('Error al obtener pedidos especiales:', error)
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const body: CreatePedidoEspecialData = await request.json()

    // Usar transacción para crear pedido y registro de auditoría
    const result = await prisma.$transaction(async (tx) => {
      // Crear el pedido
      const pedido = await tx.pedidoEspecial.create({
        data: {
          marca: body.marca,
          codigo: body.codigo,
          cantidad: body.cantidad,
          descripcion: body.descripcion,
          precioVenta: body.precioVenta,
          total: body.total,
          anticipo: body.anticipo,
          fechaPedido: body.fechaPedido || new Date(),
          fechaEntrega: null,
          estado: body.estado || 'Pendiente',
          usuarioId: decoded.userId,
          sucursalId: decoded.sucursalId,
          creadoPor: decoded.userId,
          actualizadoPor: decoded.userId
        }
      })

      // Crear registro de auditoría
      await tx.pedidoEspecialHistorial.create({
        data: {
          pedidoId: pedido.id,
          accion: 'CREADO',
          descripcion: `Pedido creado: ${body.marca} - ${body.codigo}`,
          datosNuevos: {
            marca: body.marca,
            codigo: body.codigo,
            cantidad: body.cantidad,
            descripcion: body.descripcion,
            precioVenta: body.precioVenta,
            total: body.total,
            anticipo: body.anticipo,
            estado: body.estado || 'Pendiente'
          },
          usuarioId: decoded.userId
        }
      })

      return pedido
    })

    return NextResponse.json({
      message: 'Pedido especial creado exitosamente',
      pedido: result
    })
  } catch (error) {
    console.error('Error al crear pedido especial:', error)
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
