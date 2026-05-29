import { PrismaClient } from '@prisma/client'
import { createDateRange } from '@/lib/dateUtils'
import { roundCurrency } from '@/lib/formatters'
import { shouldUseDepositoTableForMonth } from '@/lib/depositoLegacySync'

export interface MovimientoDiarioAssociatedTotals {
  totalGastos: number
  totalPagoTarjeta: number
  totalDepositos: number
  totalFondoInicial: number
  gastosEncontrados: number
  cobrosTpvEncontrados: number
  depositosEncontrados: number
  fondoInicialEncontrado: boolean
}

export function calculateSaldoDia(
  ventasBrutas: number,
  gastos: number,
  depositos: number,
  fondoInicial: number
): number {
  return roundCurrency(ventasBrutas - gastos + depositos + fondoInicial)
}

export async function getMovimientoDiarioAssociatedTotals(
  prisma: PrismaClient,
  fecha: Date,
  sucursalId: number
): Promise<MovimientoDiarioAssociatedTotals> {
  const fechaStr = fecha.toISOString().split('T')[0]
  const { fechaInicio, fechaFin } = createDateRange(fechaStr)

  const [
    gastosDelDia,
    cobrosTpvDelDia,
    depositosDelDia,
    depositosLegacyDelDia,
    fondoInicialDelDia,
    useDepositoTableForMonth,
  ] = await Promise.all([
    prisma.movimiento.findMany({
      where: {
        tipo: 'GASTO',
        sucursalId,
        fecha: { gte: fechaInicio, lte: fechaFin },
      },
    }),
    prisma.tpv.findMany({
      where: {
        sucursalId,
        estado: 'exitoso',
        fecha: { gte: fechaInicio, lte: fechaFin },
      },
    }),
    prisma.deposito.findMany({
      where: {
        sucursalId,
        fecha: { gte: fechaInicio, lte: fechaFin },
      },
    }),
    prisma.movimiento.findMany({
      where: {
        tipo: {
          in: ['DEPOSITO', 'FONDO_CAJA'],
        },
        sucursalId,
        fecha: { gte: fechaInicio, lte: fechaFin },
      },
    }),
    prisma.fondoCajaInicial.findFirst({
      where: {
        sucursalId,
        fecha: { gte: fechaInicio, lte: fechaFin },
      },
    }),
    shouldUseDepositoTableForMonth(fecha, sucursalId, prisma),
  ])

  const totalGastos = roundCurrency(gastosDelDia.reduce((sum, gasto) => sum + gasto.monto, 0))
  const totalPagoTarjeta = roundCurrency(cobrosTpvDelDia.reduce((sum, tpv) => sum + tpv.monto, 0))
  const totalDepositosTabla = roundCurrency(depositosDelDia.reduce((sum, deposito) => sum + deposito.monto, 0))
  const totalDepositosLegacy = roundCurrency(depositosLegacyDelDia.reduce((sum, movimiento) => sum + movimiento.monto, 0))

  // La tabla `deposito` es la fuente de verdad del mes cuando ya existe uso
  // del módulo. Solo hacemos fallback a movimientos legacy en meses antiguos
  // donde todavía no había registros en esa tabla.
  const totalDepositos = useDepositoTableForMonth ? totalDepositosTabla : totalDepositosLegacy
  const depositosEncontrados = useDepositoTableForMonth ? depositosDelDia.length : depositosLegacyDelDia.length
  const totalFondoInicial = roundCurrency(fondoInicialDelDia?.monto || 0)

  return {
    totalGastos,
    totalPagoTarjeta,
    totalDepositos,
    totalFondoInicial,
    gastosEncontrados: gastosDelDia.length,
    cobrosTpvEncontrados: cobrosTpvDelDia.length,
    depositosEncontrados,
    fondoInicialEncontrado: !!fondoInicialDelDia,
  }
}
