import { PrismaClient } from '@prisma/client'
import { createMonthRange } from '@/lib/dateUtils'

type PrismaLike = PrismaClient

export async function shouldUseDepositoTableForMonth(
  fecha: Date,
  sucursalId: number,
  prisma: PrismaLike,
) {
  const year = fecha.getUTCFullYear()
  const month = fecha.getUTCMonth() + 1
  const { fechaInicio, fechaFin } = createMonthRange(year, month)

  const count = await prisma.deposito.count({
    where: {
      sucursalId,
      fecha: {
        gte: fechaInicio,
        lte: fechaFin,
      },
    },
  })

  return count > 0
}

export async function findLegacyDepositMovementForDeposito(
  deposito: {
    id?: number
    sucursalId: number
    usuarioId: number | null
    createdAt: Date
    fecha: Date
    monto: number
  },
  prisma: PrismaLike,
) {
  const aroundStart = new Date(deposito.createdAt)
  aroundStart.setMinutes(aroundStart.getMinutes() - 10)

  const aroundEnd = new Date(deposito.createdAt)
  aroundEnd.setMinutes(aroundEnd.getMinutes() + 10)

  const candidates = await prisma.movimiento.findMany({
    where: {
      sucursalId: deposito.sucursalId,
      tipo: 'DEPOSITO',
      createdAt: {
        gte: aroundStart,
        lte: aroundEnd,
      },
      descripcion: {
        startsWith: 'Depósito bancario -',
      },
      ...(deposito.usuarioId ? { usuarioId: deposito.usuarioId } : {}),
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  if (candidates.length === 0) {
    return null
  }

  const ranked = candidates
    .map((candidate) => {
      const createdAtDistance = Math.abs(candidate.createdAt.getTime() - deposito.createdAt.getTime())
      const sameAmount = candidate.monto === deposito.monto ? 0 : 1
      const sameDate = candidate.fecha.toISOString().slice(0, 10) === deposito.fecha.toISOString().slice(0, 10) ? 0 : 1

      return {
        candidate,
        score: createdAtDistance + sameAmount * 1_000 + sameDate * 500,
      }
    })
    .sort((a, b) => a.score - b.score)

  return ranked[0]?.candidate ?? null
}
