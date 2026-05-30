/**
 * Script de corrección única: pedidos "Entregado" con restante pendiente.
 * Setea anticipo = total para que restante quede en 0.
 * Registra el cambio en el historial de cada pedido.
 *
 * Uso: npx ts-node --project tsconfig.json scripts/fix-pedidos-entregados.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Buscar el primer usuario administrador para dejar traza en historial
  const admin = await prisma.usuario.findFirst({
    where: { rol: { nombre: 'Administrador' } },
    orderBy: { id: 'asc' }
  })

  if (!admin) {
    throw new Error('No se encontró ningún usuario Administrador en la BD.')
  }

  // Todos los pedidos Entregados cuyo anticipo es menor al total
  const pedidosPendientes = await prisma.pedidoEspecial.findMany({
    where: {
      estado: 'Entregado',
      anticipo: { lt: prisma.pedidoEspecial.fields.total }
    }
  })

  // Prisma no soporta comparar dos columnas en el where directamente,
  // así que filtramos en memoria
  const pedidosMal = (await prisma.pedidoEspecial.findMany({
    where: { estado: 'Entregado' }
  })).filter(p => p.anticipo < p.total)

  console.log(`Pedidos entregados con restante pendiente: ${pedidosMal.length}`)

  if (pedidosMal.length === 0) {
    console.log('Nada que corregir.')
    return
  }

  let corregidos = 0
  let errores = 0

  for (const pedido of pedidosMal) {
    const restante = pedido.total - pedido.anticipo
    try {
      await prisma.$transaction(async (tx) => {
        await tx.pedidoEspecial.update({
          where: { id: pedido.id },
          data: { anticipo: pedido.total }
        })

        await tx.pedidoEspecialHistorial.create({
          data: {
            pedidoId: pedido.id,
            accion: 'ACTUALIZADO',
            descripcion: `Corrección automática: saldo pendiente $${restante.toFixed(2)} saldado al momento de entrega (fix-pedidos-entregados)`,
            datosAnteriores: { anticipo: pedido.anticipo, total: pedido.total },
            datosNuevos: { anticipo: pedido.total, total: pedido.total },
            usuarioId: admin.id
          }
        })
      })

      console.log(`  ✓ Pedido #${pedido.id} [${pedido.marca} ${pedido.codigo}] — anticipo $${pedido.anticipo} → $${pedido.total} (restante era $${restante.toFixed(2)})`)
      corregidos++
    } catch (err) {
      console.error(`  ✗ Pedido #${pedido.id} — error:`, err)
      errores++
    }
  }

  console.log(`\nResultado: ${corregidos} corregidos, ${errores} errores.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
