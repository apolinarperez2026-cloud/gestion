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

    // Obtener parámetro de mes de la URL
    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month')

    let whereClause: any = {}

    // Construir whereClause base según rol y sucursal
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
        
        whereClause.fechaRegistro = {
          gte: startDate,
          lte: endDate
        }
      }
    }

    const garantias = await prisma.garantia.findMany({
      where: whereClause,
      include: {
        sucursal: true,
        usuario: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: { fechaRegistro: 'desc' }
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
    const { 
      fechaRegistro, 
      cliente, 
      marca, 
      sku, 
      cantidad, 
      descripcion, 
      estado, 
      comentarios,
      fechaEntregaFabricante,
      fechaRegresoFabricante,
      fechaEntregaCliente,
      fotoReciboEntrega
    } = body

    // Validar datos requeridos
    if (!fechaRegistro || !cliente || !marca || !sku || !cantidad || !descripcion || !estado) {
      return NextResponse.json(
        { error: 'Los campos fecha de registro, cliente, marca, SKU, cantidad, descripción y estado son requeridos' },
        { status: 400 }
      )
    }

    // Validar estado
    if (!['en_reparacion', 'cancelada', 'proceso_reembolso', 'proceso_reemplazo', 'completada'].includes(estado)) {
      return NextResponse.json(
        { error: 'Estado debe ser "en_reparacion", "cancelada", "proceso_reembolso", "proceso_reemplazo" o "completada"' },
        { status: 400 }
      )
    }

    // Validar cantidad
    if (cantidad <= 0) {
      return NextResponse.json(
        { error: 'La cantidad debe ser mayor a 0' },
        { status: 400 }
      )
    }

    if (!decoded.sucursalId) {
      return NextResponse.json(
        { error: 'No se puede determinar la sucursal' },
        { status: 400 }
      )
    }

    // Crear fechas específicas sin horario
    const fechaRegistroEspecifica = parseDateOnly(fechaRegistro)
    const fechaEntregaFabricanteEspecifica = fechaEntregaFabricante ? parseDateOnly(fechaEntregaFabricante) : null
    const fechaRegresoFabricanteEspecifica = fechaRegresoFabricante ? parseDateOnly(fechaRegresoFabricante) : null
    const fechaEntregaClienteEspecifica = fechaEntregaCliente ? parseDateOnly(fechaEntregaCliente) : null
    
    const garantia = await prisma.garantia.create({
      data: {
        fechaRegistro: fechaRegistroEspecifica,
        cliente,
        marca,
        sku,
        cantidad: parseInt(cantidad),
        descripcion,
        estado,
        comentarios: comentarios || null,
        fechaEntregaFabricante: fechaEntregaFabricanteEspecifica,
        fechaRegresoFabricante: fechaRegresoFabricanteEspecifica,
        fechaEntregaCliente: fechaEntregaClienteEspecifica,
        fotoReciboEntrega: fotoReciboEntrega || null,
        sucursalId: decoded.sucursalId,
        usuarioId: decoded.userId
      },
      include: {
        sucursal: true,
        usuario: {
          select: {
            id: true,
            nombre: true
          }
        }
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

// PUT - Actualizar garantía existente
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    const body = await request.json()
    const { 
      id,
      fechaRegistro, 
      cliente, 
      marca, 
      sku, 
      cantidad, 
      descripcion, 
      estado, 
      comentarios,
      fechaEntregaFabricante,
      fechaRegresoFabricante,
      fechaEntregaCliente,
      fotoReciboEntrega
    } = body

    // Validar datos requeridos
    if (!id || !fechaRegistro || !cliente || !marca || !sku || !cantidad || !descripcion || !estado) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      )
    }

    // Validar estado
    if (!['en_reparacion', 'cancelada', 'proceso_reembolso', 'proceso_reemplazo', 'completada'].includes(estado)) {
      return NextResponse.json(
        { error: 'Estado debe ser "en_reparacion", "cancelada", "proceso_reembolso", "proceso_reemplazo" o "completada"' },
        { status: 400 }
      )
    }

    // Validar cantidad
    if (cantidad <= 0) {
      return NextResponse.json(
        { error: 'La cantidad debe ser mayor a 0' },
        { status: 400 }
      )
    }

    // Verificar que la garantía existe y pertenece a la sucursal del usuario
    const garantiaExistente = await prisma.garantia.findFirst({
      where: {
        id: parseInt(id),
        sucursalId: decoded.sucursalId
      }
    })

    if (!garantiaExistente) {
      return NextResponse.json(
        { error: 'Garantía no encontrada o no tienes permisos para editarla' },
        { status: 404 }
      )
    }

    // Crear fechas específicas sin horario
    const fechaRegistroEspecifica = parseDateOnly(fechaRegistro)
    const fechaEntregaFabricanteEspecifica = fechaEntregaFabricante ? parseDateOnly(fechaEntregaFabricante) : null
    const fechaRegresoFabricanteEspecifica = fechaRegresoFabricante ? parseDateOnly(fechaRegresoFabricante) : null
    const fechaEntregaClienteEspecifica = fechaEntregaCliente ? parseDateOnly(fechaEntregaCliente) : null

    const garantia = await prisma.garantia.update({
      where: { id: parseInt(id) },
      data: {
        fechaRegistro: fechaRegistroEspecifica,
        cliente,
        marca,
        sku,
        cantidad: parseInt(cantidad),
        descripcion,
        estado,
        comentarios: comentarios || null,
        fechaEntregaFabricante: fechaEntregaFabricanteEspecifica,
        fechaRegresoFabricante: fechaRegresoFabricanteEspecifica,
        fechaEntregaCliente: fechaEntregaClienteEspecifica,
        fotoReciboEntrega: fotoReciboEntrega || null
      },
      include: {
        sucursal: true,
        usuario: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    })

    return NextResponse.json({ garantia })
  } catch (error) {
    console.error('Error al actualizar garantía:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}