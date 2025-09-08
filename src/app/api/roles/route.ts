import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const roles = await prisma.rol.findMany({
      where: {
        nombre: {
          not: 'Administrador'
        }
      },
      orderBy: { nombre: 'asc' }
    })

    return NextResponse.json({ roles })

  } catch (error) {
    console.error('Error al obtener roles:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
