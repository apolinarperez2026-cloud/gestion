import { PrismaClient } from '@prisma/client'
import { createDateRange } from '@/lib/dateUtils'

/**
 * Recalcula los 4 campos derivados de MovimientoDiario para una fecha y sucursal dadas.
 *
 * Campos que se actualizan:
 *  - gastos       ← suma de Movimiento (tipo = 'GASTO') del día
 *  - pagoTarjeta  ← suma de Tpv (estado = 'exitoso') del día
 *  - depositos    ← suma de Deposito del día
 *  - fondoInicial ← valor de FondoCajaInicial del día (0 si no existe)
 *
 * Solo actualiza si ya existe un MovimientoDiario para esa fecha+sucursal.
 * No crea registros nuevos.
 *
 * Uso:
 *   await recalcularMovimientoDiario(fecha, sucursalId, prisma)
 */
export async function recalcularMovimientoDiario(
  fecha: Date,
  sucursalId: number,
  prisma: PrismaClient
): Promise<void> {
  const fechaStr = fecha.toISOString().split('T')[0]
  const { fechaInicio, fechaFin } = createDateRange(fechaStr)

  // 1. Gastos del día
  const gastosDelDia = await prisma.movimiento.findMany({
    where: {
      tipo: 'GASTO',
      sucursalId,
      fecha: { gte: fechaInicio, lte: fechaFin }
    }
  })
  const totalGastos = gastosDelDia.reduce((sum, g) => sum + g.monto, 0)

  // 2. Cobros TPV exitosos del día
  const tpvDelDia = await prisma.tpv.findMany({
    where: {
      sucursalId,
      estado: 'exitoso',
      fecha: { gte: fechaInicio, lte: fechaFin }
    }
  })
  const totalPagoTarjeta = tpvDelDia.reduce((sum, t) => sum + t.monto, 0)

  // 3. Depósitos del día
  const depositosDelDia = await prisma.deposito.findMany({
    where: {
      sucursalId,
      fecha: { gte: fechaInicio, lte: fechaFin }
    }
  })
  const totalDepositos = depositosDelDia.reduce((sum, d) => sum + d.monto, 0)

  // 4. Fondo de caja inicial del día (único por fecha+sucursal)
  const fondoDelDia = await prisma.fondoCajaInicial.findFirst({
    where: {
      sucursalId,
      fecha: { gte: fechaInicio, lte: fechaFin }
    }
  })
  const totalFondoInicial = fondoDelDia ? fondoDelDia.monto : 0

  // Actualizar MovimientoDiario solo si ya existe para ese día
  // updateMany con where por fecha+sucursal — no crea registros nuevos
  await prisma.movimientoDiario.updateMany({
    where: {
      sucursalId,
      fecha: { gte: fechaInicio, lte: fechaFin }
    },
    data: {
      gastos: totalGastos,
      pagoTarjeta: totalPagoTarjeta,
      depositos: totalDepositos,
      fondoInicial: totalFondoInicial
    }
  })
}
