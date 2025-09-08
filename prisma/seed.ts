import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando semilla de datos...')
  
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

  console.log('✅ Roles creados')

  // Crear sucursales
  const sucursalPrincipal = await prisma.sucursal.upsert({
    where: { nombre: 'Sucursal Principal' },
    update: {},
    create: {
      nombre: 'Sucursal Principal',
      direccion: 'Av. Principal 123, Centro'
    }
  })

  const sucursalNorte = await prisma.sucursal.upsert({
    where: { nombre: 'Sucursal Norte' },
    update: {},
    create: {
      nombre: 'Sucursal Norte',
      direccion: 'Calle Norte 456, Zona Norte'
    }
  })

  const sucursalSur = await prisma.sucursal.upsert({
    where: { nombre: 'Sucursal Sur' },
    update: {},
    create: {
      nombre: 'Sucursal Sur',
      direccion: 'Av. Sur 789, Zona Sur'
    }
  })

  const sucursalEste = await prisma.sucursal.upsert({
    where: { nombre: 'Sucursal Este' },
    update: {},
    create: {
      nombre: 'Sucursal Este',
      direccion: 'Av. Este 321, Zona Este'
    }
  })

  const sucursalOeste = await prisma.sucursal.upsert({
    where: { nombre: 'Sucursal Oeste' },
    update: {},
    create: {
      nombre: 'Sucursal Oeste',
      direccion: 'Calle Oeste 654, Zona Oeste'
    }
  })

  console.log('✅ Sucursales creadas')

  // Crear usuarios de prueba
  const passwordHash = await bcrypt.hash('123456', 12)

  // Administrador
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@librodiario.com' },
    update: {},
    create: {
      nombre: 'Administrador Principal',
      email: 'admin@librodiario.com',
      password: passwordHash,
      rolId: adminRol.id
    }
  })

  // Gerentes
  const gerenteNorte = await prisma.usuario.upsert({
    where: { email: 'gerente.norte@librodiario.com' },
    update: {},
    create: {
      nombre: 'María González',
      email: 'gerente.norte@librodiario.com',
      password: passwordHash,
      rolId: gerenteRol.id,
      sucursalId: sucursalNorte.id
    }
  })

  const gerenteSur = await prisma.usuario.upsert({
    where: { email: 'gerente.sur@librodiario.com' },
    update: {},
    create: {
      nombre: 'Carlos Rodríguez',
      email: 'gerente.sur@librodiario.com',
      password: passwordHash,
      rolId: gerenteRol.id,
      sucursalId: sucursalSur.id
    }
  })

  const gerenteEste = await prisma.usuario.upsert({
    where: { email: 'gerente.este@librodiario.com' },
    update: {},
    create: {
      nombre: 'Ana Martínez',
      email: 'gerente.este@librodiario.com',
      password: passwordHash,
      rolId: gerenteRol.id,
      sucursalId: sucursalEste.id
    }
  })

  const gerenteOeste = await prisma.usuario.upsert({
    where: { email: 'gerente.oeste@librodiario.com' },
    update: {},
    create: {
      nombre: 'Luis Pérez',
      email: 'gerente.oeste@librodiario.com',
      password: passwordHash,
      rolId: gerenteRol.id,
      sucursalId: sucursalOeste.id
    }
  })

  // Empleados
  const empleado1 = await prisma.usuario.upsert({
    where: { email: 'empleado1@librodiario.com' },
    update: {},
    create: {
      nombre: 'Pedro Sánchez',
      email: 'empleado1@librodiario.com',
      password: passwordHash,
      rolId: empleadoRol.id,
      sucursalId: sucursalNorte.id
    }
  })

  const empleado2 = await prisma.usuario.upsert({
    where: { email: 'empleado2@librodiario.com' },
    update: {},
    create: {
      nombre: 'Laura García',
      email: 'empleado2@librodiario.com',
      password: passwordHash,
      rolId: empleadoRol.id,
      sucursalId: sucursalSur.id
    }
  })

  const empleado3 = await prisma.usuario.upsert({
    where: { email: 'empleado3@librodiario.com' },
    update: {},
    create: {
      nombre: 'Roberto López',
      email: 'empleado3@librodiario.com',
      password: passwordHash,
      rolId: empleadoRol.id,
      sucursalId: sucursalEste.id
    }
  })

  const empleado4 = await prisma.usuario.upsert({
    where: { email: 'empleado4@librodiario.com' },
    update: {},
    create: {
      nombre: 'Carmen Ruiz',
      email: 'empleado4@librodiario.com',
      password: passwordHash,
      rolId: empleadoRol.id,
      sucursalId: sucursalOeste.id
    }
  })

  console.log('✅ Usuarios creados')

  // Crear formas de pago
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

  // Crear tipos de gasto
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

  // Crear movimientos de ejemplo
  const hoy = new Date()
  const ayer = new Date(hoy)
  ayer.setDate(ayer.getDate() - 1)

  // Obtener IDs de formas de pago y tipos de gasto
  const efectivo = await prisma.formaDePago.findUnique({ where: { nombre: 'Efectivo' } })
  const tarjeta = await prisma.formaDePago.findUnique({ where: { nombre: 'Pago con Tarjeta' } })
  const credito = await prisma.formaDePago.findUnique({ where: { nombre: 'Crédito' } })
  const transferencia = await prisma.formaDePago.findUnique({ where: { nombre: 'Transferencias' } })
  
  const nomina = await prisma.tipoGasto.findUnique({ where: { nombre: 'Nómina' } })
  const renta = await prisma.tipoGasto.findUnique({ where: { nombre: 'Renta' } })
  const luz = await prisma.tipoGasto.findUnique({ where: { nombre: 'Servicio de Luz' } })
  const mercaderia = await prisma.tipoGasto.findUnique({ where: { nombre: 'Adquisición de mercadería' } })

  // Movimientos de ejemplo para Sucursal Norte
  const movimientosNorte = [
    // Ventas
    {
      fecha: hoy,
      descripcion: 'Venta de productos varios',
      monto: 1250.00,
      tipo: 'VENTA' as const,
      formaDePagoId: efectivo?.id,
      sucursalId: sucursalNorte.id
    },
    {
      fecha: hoy,
      descripcion: 'Venta con tarjeta de crédito',
      monto: 850.50,
      tipo: 'VENTA' as const,
      formaDePagoId: tarjeta?.id,
      sucursalId: sucursalNorte.id
    },
    {
      fecha: ayer,
      descripcion: 'Venta a crédito',
      monto: 2000.00,
      tipo: 'VENTA' as const,
      formaDePagoId: credito?.id,
      sucursalId: sucursalNorte.id
    },
    // Gastos
    {
      fecha: hoy,
      descripcion: 'Pago de nómina',
      monto: 5000.00,
      tipo: 'GASTO' as const,
      tipoGastoId: nomina?.id,
      sucursalId: sucursalNorte.id
    },
    {
      fecha: ayer,
      descripcion: 'Pago de renta del local',
      monto: 1200.00,
      tipo: 'GASTO' as const,
      tipoGastoId: renta?.id,
      sucursalId: sucursalNorte.id
    },
    {
      fecha: ayer,
      descripcion: 'Pago de servicio de luz',
      monto: 350.75,
      tipo: 'GASTO' as const,
      tipoGastoId: luz?.id,
      sucursalId: sucursalNorte.id
    }
  ]

  // Movimientos de ejemplo para Sucursal Sur
  const movimientosSur = [
    {
      fecha: hoy,
      descripcion: 'Venta de accesorios',
      monto: 750.00,
      tipo: 'VENTA' as const,
      formaDePagoId: efectivo?.id,
      sucursalId: sucursalSur.id
    },
    {
      fecha: hoy,
      descripcion: 'Compra de mercadería',
      monto: 3000.00,
      tipo: 'GASTO' as const,
      tipoGastoId: mercaderia?.id,
      sucursalId: sucursalSur.id
    },
    {
      fecha: ayer,
      descripcion: 'Transferencia bancaria',
      monto: 1500.00,
      tipo: 'VENTA' as const,
      formaDePagoId: transferencia?.id,
      sucursalId: sucursalSur.id
    }
  ]

  // Crear todos los movimientos
  await prisma.movimiento.createMany({
    data: [...movimientosNorte, ...movimientosSur]
  })

  console.log('✅ Movimientos de ejemplo creados')

  // Crear fondos de caja
  await prisma.fondoCaja.createMany({
    data: [
      {
        fecha: hoy,
        monto: 2000.00,
        sucursalId: sucursalNorte.id
      },
      {
        fecha: hoy,
        monto: 1500.00,
        sucursalId: sucursalSur.id
      },
      {
        fecha: hoy,
        monto: 1000.00,
        sucursalId: sucursalEste.id
      },
      {
        fecha: hoy,
        monto: 1800.00,
        sucursalId: sucursalOeste.id
      }
    ]
  })

  console.log('✅ Fondos de caja creados')

  // Crear pedidos especiales
  const fechaEntrega = new Date(hoy)
  fechaEntrega.setDate(fechaEntrega.getDate() + 7)

  await prisma.pedidoEspecial.createMany({
    data: [
      {
        descripcion: 'Samsung Galaxy S21 - 2 unidades',
        monto: 1600.00,
        fecha: hoy,
        sucursalId: sucursalNorte.id
      },
      {
        descripcion: 'iPhone 13 Pro - 1 unidad',
        monto: 1200.00,
        fecha: ayer,
        sucursalId: sucursalSur.id
      }
    ]
  })

  console.log('✅ Pedidos especiales creados')

  console.log('🎉 Semilla completada exitosamente!')
  console.log('\n📋 Usuarios de prueba creados:')
  console.log('👑 Administrador: admin@librodiario.com (contraseña: 123456)')
  console.log('👨‍💼 Gerente Norte: gerente.norte@librodiario.com (contraseña: 123456)')
  console.log('👨‍💼 Gerente Sur: gerente.sur@librodiario.com (contraseña: 123456)')
  console.log('👨‍💼 Gerente Este: gerente.este@librodiario.com (contraseña: 123456)')
  console.log('👨‍💼 Gerente Oeste: gerente.oeste@librodiario.com (contraseña: 123456)')
  console.log('👤 Empleado 1: empleado1@librodiario.com (contraseña: 123456)')
  console.log('👤 Empleado 2: empleado2@librodiario.com (contraseña: 123456)')
  console.log('👤 Empleado 3: empleado3@librodiario.com (contraseña: 123456)')
  console.log('👤 Empleado 4: empleado4@librodiario.com (contraseña: 123456)')
  console.log('\n🏢 Sucursales creadas:')
  console.log('📍 Sucursal Principal - Av. Principal 123, Centro')
  console.log('📍 Sucursal Norte - Calle Norte 456, Zona Norte')
  console.log('📍 Sucursal Sur - Av. Sur 789, Zona Sur')
  console.log('📍 Sucursal Este - Av. Este 321, Zona Este')
  console.log('📍 Sucursal Oeste - Calle Oeste 654, Zona Oeste')
}

main()
  .catch((e) => {
    console.error('❌ Error en la semilla:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })