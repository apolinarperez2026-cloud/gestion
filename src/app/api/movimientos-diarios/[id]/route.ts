import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const movimientoDiario = await prisma.movimientoDiario.findUnique({
      where: { id },
      include: {
        sucursal: true,
        usuario: {
          include: {
            rol: true
          }
        }
      }
    })

    if (!movimientoDiario) {
      return NextResponse.json(
        { error: 'Movimiento diario no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ movimientoDiario })
  } catch (error) {
    console.error('Error al obtener movimiento diario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const { 
      ventasBrutas,
      efectivo,
      credito,
      abonosCredito,
      recargas,
      pagoTarjeta,
      transferencias,
      observaciones,
      usuarioId
    } = await request.json()

    // Obtener el movimiento diario actual completo
    const movimientoActual = await prisma.movimientoDiario.findUnique({
      where: { id }
    })

    if (!movimientoActual) {
      return NextResponse.json(
        { error: 'Movimiento diario no encontrado' },
        { status: 404 }
      )
    }

    // Calcular gastos del día desde la tabla movimientos
    const fechaInicio = new Date(movimientoActual.fecha)
    fechaInicio.setHours(0, 0, 0, 0)
    
    const fechaFin = new Date(movimientoActual.fecha)
    fechaFin.setHours(23, 59, 59, 999)

    const gastosDelDia = await prisma.movimiento.findMany({
      where: {
        tipo: 'GASTO',
        sucursalId: movimientoActual.sucursalId,
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        }
      }
    })

    const totalGastos = gastosDelDia.reduce((sum, gasto) => sum + gasto.monto, 0)

    // Calcular el saldo del día
    const ventasBrutasFinal = ventasBrutas !== undefined ? parseFloat(ventasBrutas) : movimientoActual.ventasBrutas
    const saldoDia = ventasBrutasFinal - totalGastos

    // Preparar datos para actualización
    const nuevosDatos = {
      ventasBrutas: ventasBrutasFinal,
      efectivo: efectivo !== undefined ? parseFloat(efectivo) : movimientoActual.efectivo,
      credito: credito !== undefined ? parseFloat(credito) : movimientoActual.credito,
      abonosCredito: abonosCredito !== undefined ? parseFloat(abonosCredito) : movimientoActual.abonosCredito,
      recargas: recargas !== undefined ? parseFloat(recargas) : movimientoActual.recargas,
      pagoTarjeta: pagoTarjeta !== undefined ? parseFloat(pagoTarjeta) : movimientoActual.pagoTarjeta,
      transferencias: transferencias !== undefined ? parseFloat(transferencias) : movimientoActual.transferencias,
      gastos: totalGastos, // Siempre recalculado desde movimientos
      saldoDia,
      observaciones: observaciones !== undefined ? observaciones : movimientoActual.observaciones
    }

    // Detectar cambios y crear registros de historial
    const cambios = []
    const campos = [
      { nombre: 'ventasBrutas', etiqueta: 'Ventas Brutas' },
      { nombre: 'efectivo', etiqueta: 'Efectivo' },
      { nombre: 'credito', etiqueta: 'Crédito' },
      { nombre: 'abonosCredito', etiqueta: 'Abonos de Crédito' },
      { nombre: 'recargas', etiqueta: 'Recargas' },
      { nombre: 'pagoTarjeta', etiqueta: 'Pago con Tarjeta' },
      { nombre: 'transferencias', etiqueta: 'Transferencias' },
      { nombre: 'observaciones', etiqueta: 'Observaciones' }
    ]

    for (const campo of campos) {
      const valorAnterior = movimientoActual[campo.nombre]
      const valorNuevo = nuevosDatos[campo.nombre]
      
      if (valorAnterior !== valorNuevo) {
        cambios.push({
          movimientoDiarioId: id,
          usuarioId: usuarioId || movimientoActual.usuarioId,
          campoModificado: campo.etiqueta,
          valorAnterior: valorAnterior?.toString() || '',
          valorNuevo: valorNuevo?.toString() || ''
        })
      }
    }

    // Actualizar el movimiento diario
    const movimientoDiario = await prisma.movimientoDiario.update({
      where: { id },
      data: nuevosDatos,
      include: {
        sucursal: true,
        usuario: {
          include: {
            rol: true
          }
        }
      }
    })

    // Crear registros de historial si hay cambios
    if (cambios.length > 0) {
      await prisma.movimientoDiarioHistorial.createMany({
        data: cambios
      })
    }

    return NextResponse.json({ 
      movimientoDiario,
      gastosEncontrados: gastosDelDia.length,
      totalGastosCalculado: totalGastos,
      cambiosRegistrados: cambios.length
    })
  } catch (error) {
    console.error('Error al actualizar movimiento diario:', error)
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    // Verificar autenticación
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorización requerido' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    
    // Verificar el token y obtener el usuario
    const userResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    const userData = await userResponse.json()
    const user = userData.user

    // Verificar que el usuario sea administrador
    if (user.rol.nombre !== 'Administrador') {
      return NextResponse.json(
        { error: 'Solo los administradores pueden eliminar movimientos diarios' },
        { status: 403 }
      )
    }

    console.log('Eliminando movimiento diario:', { id, usuario: user.nombre })

    await prisma.movimientoDiario.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Movimiento diario eliminado exitosamente' })
  } catch (error) {
    console.error('Error al eliminar movimiento diario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
