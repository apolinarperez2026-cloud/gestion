import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando semilla de datos - Sistema Limpio...')
  
  // Crear roles
  const adminRol = await prisma.rol.upsert({
    where: { nombre: 'Administrador' },
    update: {},
    create: {
      nombre: 'Administrador'
    }
  })

  const gerenteRol = await prisma.rol.upsert({
    where: { nombre: 'Gerente' },
    update: {},
    create: {
      nombre: 'Gerente'
    }
  })

  const empleadoRol = await prisma.rol.upsert({
    where: { nombre: 'Empleado' },
    update: {},
    create: {
      nombre: 'Empleado'
    }
  })

  console.log('✅ Roles creados (Administrador, Gerente, Empleado)')

  // Crear usuario administrador
  const passwordHash = await bcrypt.hash('admin123', 12)

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@librodiario.com' },
    update: {},
    create: {
      nombre: 'Administrador',
      email: 'admin@librodiario.com',
      password: passwordHash,
      rolId: adminRol.id
    }
  })

  console.log('✅ Usuario administrador creado')

  // Crear formas de pago básicas
  const formasDePago = [
    'Efectivo',
    'Crédito',
    'Abonos de Crédito',
    'Recargas',
    'Pago con Tarjeta',
    'Transferencias',
    'Cheque',
    'Depósito Bancario'
  ]

  for (const forma of formasDePago) {
    await prisma.formaDePago.upsert({
      where: { nombre: forma },
      update: {},
      create: { nombre: forma }
    })
  }

  console.log('✅ Formas de pago creadas')

  // Crear tipos de gasto básicos
  const tiposGasto = [
    'Nómina',
    'Comisión',
    'Viáticos',
    'Servicio de Luz',
    'Servicio de Internet',
    'Servicio de Agua',
    'Renta',
    'Papelería',
    'Adquisición de mercadería',
    'Limpieza',
    'Mantenimiento',
    'Publicidad',
    'Seguros',
    'Impuestos',
    'Gastos bancarios'
  ]

  for (const tipo of tiposGasto) {
    await prisma.tipoGasto.upsert({
      where: { nombre: tipo },
      update: {},
      create: { nombre: tipo }
    })
  }

  console.log('✅ Tipos de gasto creados')

  console.log('\n🎉 Semilla completada exitosamente!')
  console.log('\n📋 Credenciales de acceso:')
  console.log('👑 Administrador:')
  console.log('   Email: admin@librodiario.com')
  console.log('   Contraseña: admin123')
  console.log('\n💡 El sistema está limpio y listo para usar.')
  console.log('   El administrador puede crear sucursales y usuarios desde el panel.')
}

main()
  .catch((e) => {
    console.error('❌ Error en la semilla:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })