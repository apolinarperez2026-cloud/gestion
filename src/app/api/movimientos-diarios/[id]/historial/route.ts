import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const movimientoId = parseInt(id)
    
    if (isNaN(movimientoId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    // Verificar que el movimiento diario existe
    const movimientoDiario = await prisma.movimientoDiario.findUnique({
      where: { id: movimientoId }
    })

    if (!movimientoDiario) {
      return NextResponse.json(
        { error: 'Movimiento diario no encontrado' },
        { status: 404 }
      )
    }

    // Obtener el historial de cambios
    const historial = await prisma.movimientoDiarioHistorial.findMany({
      where: { movimientoDiarioId: movimientoId },
      include: {
        usuario: {
          include: {
            rol: true
          }
        }
      },
      orderBy: { fechaCambio: 'desc' }
    })

    return NextResponse.json({ historial })
  } catch (error) {
    console.error('Error al obtener historial:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
