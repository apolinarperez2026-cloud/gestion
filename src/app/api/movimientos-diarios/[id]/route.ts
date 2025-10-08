import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

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
      fondoInicial,
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
    
    console.log('Calculando gastos para fecha:', {
      fechaOriginal: movimientoActual.fecha,
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin.toISOString(),
      sucursalId: movimientoActual.sucursalId
    })

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
    
    console.log('Gastos encontrados:', {
      cantidad: gastosDelDia.length,
      gastos: gastosDelDia.map(g => ({ id: g.id, fecha: g.fecha, monto: g.monto, descripcion: g.descripcion })),
      totalGastos
    })

    // Calcular total de cobros TPV del día
    const cobrosTpvDelDia = await prisma.tpv.findMany({
      where: {
        sucursalId: movimientoActual.sucursalId,
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        },
        estado: 'exitoso' // Solo contar cobros exitosos
      }
    })

    const totalTpvDelDia = cobrosTpvDelDia.reduce((sum, tpv) => sum + tpv.monto, 0)

    // Buscar depósitos del día
    const depositosDelDia = await prisma.deposito.findMany({
      where: {
        sucursalId: movimientoActual.sucursalId,
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        }
      }
    })

    const totalDepositosDelDia = depositosDelDia.reduce((sum, deposito) => sum + deposito.monto, 0)

    console.log('Depósitos encontrados:', {
      cantidad: depositosDelDia.length,
      depositos: depositosDelDia.map(d => ({ id: d.id, fecha: d.fecha, monto: d.monto })),
      totalDepositos: totalDepositosDelDia
    })

    // Buscar fondo de caja inicial del día
    const fondoInicialDelDia = await prisma.fondoCajaInicial.findFirst({
      where: {
        sucursalId: movimientoActual.sucursalId,
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        }
      }
    })

    console.log('Fondo inicial encontrado:', {
      existe: !!fondoInicialDelDia,
      monto: fondoInicialDelDia?.monto || 0,
      fecha: fondoInicialDelDia?.fecha
    })

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
      pagoTarjeta: totalTpvDelDia, // Siempre recalculado desde cobros TPV
      transferencias: transferencias !== undefined ? parseFloat(transferencias) : movimientoActual.transferencias,
      gastos: totalGastos, // Siempre recalculado desde movimientos
      depositos: totalDepositosDelDia, // Siempre recalculado desde depósitos
      saldoDia,
      observaciones: observaciones !== undefined ? observaciones : movimientoActual.observaciones,
      fondoInicial: fondoInicialDelDia ? fondoInicialDelDia.monto : (fondoInicial !== undefined ? parseFloat(fondoInicial) : movimientoActual.fondoInicial)
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
      { nombre: 'gastos', etiqueta: 'Gastos' },
      { nombre: 'depositos', etiqueta: 'Depósitos' },
      { nombre: 'observaciones', etiqueta: 'Observaciones' },
      { nombre: 'fondoInicial', etiqueta: 'Fondo Inicial' }
    ]

    for (const campo of campos) {
      const valorAnterior = (movimientoActual as any)[campo.nombre]
      const valorNuevo = (nuevosDatos as any)[campo.nombre]
      
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
      cobrosTpvEncontrados: cobrosTpvDelDia.length,
      totalTpvCalculado: totalTpvDelDia,
      depositosEncontrados: depositosDelDia.length,
      totalDepositosCalculado: totalDepositosDelDia,
      cambiosRegistrados: cambios.length,
      fondoInicialAplicado: fondoInicialDelDia ? {
        existe: true,
        monto: fondoInicialDelDia.monto,
        fecha: fondoInicialDelDia.fecha
      } : {
        existe: false,
        monto: 0
      }
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
    
    // Verificar el token directamente sin fetch interno
    let decoded: any
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || '')
    } catch (error) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    // Obtener el usuario de la base de datos
    const user = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      include: {
        rol: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

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
