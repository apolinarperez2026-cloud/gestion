import { PrismaClient } from '@prisma/client'
import { createDateRange } from '@/lib/dateUtils'
import { roundCurrency } from '@/lib/formatters'
import { calculateSaldoDia, getMovimientoDiarioAssociatedTotals } from '@/lib/movimientoDiarioCalculations'

/**
 * Recalcula los campos derivados de MovimientoDiario para una fecha y sucursal dadas.
 *
 * Usa una sola fuente de verdad para evitar discrepancias entre crear, editar
 * y recalcular datos asociados al mismo día.
 */
export async function recalcularMovimientoDiario(
  fecha: Date,
  sucursalId: number,
  prisma: PrismaClient
): Promise<void> {
  const fechaStr = fecha.toISOString().split('T')[0]
  const { fechaInicio, fechaFin } = createDateRange(fechaStr)
  const associatedTotals = await getMovimientoDiarioAssociatedTotals(prisma, fecha, sucursalId)

  const movimientosDelDia = await prisma.movimientoDiario.findMany({
    where: {
      sucursalId,
      fecha: { gte: fechaInicio, lte: fechaFin }
    }
  })

  await Promise.all(
    movimientosDelDia.map((movimiento) =>
      prisma.movimientoDiario.update({
        where: { id: movimiento.id },
        data: {
          gastos: associatedTotals.totalGastos,
          pagoTarjeta: associatedTotals.totalPagoTarjeta,
          depositos: associatedTotals.totalDepositos,
          fondoInicial: associatedTotals.totalFondoInicial,
          efectivo: roundCurrency(
            movimiento.ventasBrutas -
            associatedTotals.totalPagoTarjeta -
            movimiento.transferencias -
            associatedTotals.totalGastos
          ),
          saldoDia: calculateSaldoDia(
            movimiento.ventasBrutas,
            associatedTotals.totalGastos,
            associatedTotals.totalDepositos,
            associatedTotals.totalFondoInicial
          )
        }
      })
    )
  )
}
