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
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      nombre: 'Sucursal Principal',
      direccion: 'Av. Principal 123, Centro'
    }
  })

  const sucursalNorte = await prisma.sucursal.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      nombre: 'Sucursal Norte',
      direccion: 'Calle Norte 456, Zona Norte'
    }
  })

  const sucursalSur = await prisma.sucursal.upsert({
    where: { id: 3 },
    update: {},
    create: {
      id: 3,
      nombre: 'Sucursal Sur',
      direccion: 'Av. Sur 789, Zona Sur'
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
      rolId: adminRol.id,
      sucursalId: sucursalPrincipal.id
    }
  })

  // Gerente de Sucursal Norte
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

  // Gerente de Sucursal Sur
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

  // Empleados
  const empleado1 = await prisma.usuario.upsert({
    where: { email: 'empleado1@librodiario.com' },
    update: {},
    create: {
      nombre: 'Ana Martínez',
      email: 'empleado1@librodiario.com',
      password: passwordHash,
      rolId: empleadoRol.id,
      sucursalId: sucursalPrincipal.id
    }
  })

  const empleado2 = await prisma.usuario.upsert({
    where: { email: 'empleado2@librodiario.com' },
    update: {},
    create: {
      nombre: 'Luis Pérez',
      email: 'empleado2@librodiario.com',
      password: passwordHash,
      rolId: empleadoRol.id,
      sucursalId: sucursalNorte.id
    }
  })

  console.log('✅ Usuarios creados')

  // Crear tipos de gasto
  const tiposGasto = [
    'Alquiler',
    'Servicios Públicos',
    'Salarios',
    'Mantenimiento',
    'Marketing',
    'Inventario',
    'Transporte',
    'Otros'
  ]

  for (const tipo of tiposGasto) {
    await prisma.tipoGasto.upsert({
      where: { nombre: tipo },
      update: {},
      create: { nombre: tipo }
    })
  }

  console.log('✅ Tipos de gasto creados')

  // Crear algunos movimientos de ejemplo
  const hoy = new Date()
  const ayer = new Date(hoy)
  ayer.setDate(ayer.getDate() - 1)

  // Movimientos para Sucursal Principal
  await prisma.movimiento.createMany({
    data: [
      {
        fecha: hoy,
        tipo: 'Ingreso',
        categoria: 'Ventas',
        monto: 15000.00,
        descripcion: 'Ventas del día',
        sucursalId: sucursalPrincipal.id,
        usuarioEntregaId: empleado1.id
      },
      {
        fecha: hoy,
        tipo: 'Gasto',
        categoria: 'Alquiler',
        monto: 5000.00,
        descripcion: 'Pago de alquiler mensual',
        sucursalId: sucursalPrincipal.id,
        usuarioEntregaId: admin.id
      },
      {
        fecha: ayer,
        tipo: 'Ingreso',
        categoria: 'Ventas',
        monto: 12000.00,
        descripcion: 'Ventas del día anterior',
        sucursalId: sucursalPrincipal.id,
        usuarioEntregaId: empleado1.id
      }
    ]
  })

  // Movimientos para Sucursal Norte
  await prisma.movimiento.createMany({
    data: [
      {
        fecha: hoy,
        tipo: 'Ingreso',
        categoria: 'Ventas',
        monto: 8500.00,
        descripcion: 'Ventas del día',
        sucursalId: sucursalNorte.id,
        usuarioEntregaId: empleado2.id
      },
      {
        fecha: hoy,
        tipo: 'Gasto',
        categoria: 'Servicios Públicos',
        monto: 1200.00,
        descripcion: 'Pago de luz y agua',
        sucursalId: sucursalNorte.id,
        usuarioEntregaId: gerenteNorte.id
      }
    ]
  })

  console.log('✅ Movimientos creados')

  // Crear fondos de caja
  await prisma.fondoCaja.createMany({
    data: [
      {
        fecha: hoy,
        saldoInicial: 2000.00,
        saldoFinal: 18000.00,
        sucursalId: sucursalPrincipal.id
      },
      {
        fecha: hoy,
        saldoInicial: 1500.00,
        saldoFinal: 8800.00,
        sucursalId: sucursalNorte.id
      },
      {
        fecha: hoy,
        saldoInicial: 1000.00,
        saldoFinal: null,
        sucursalId: sucursalSur.id
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
        marca: 'Samsung',
        codigo: 'SM-G991',
        cantidad: 2,
        descripcion: 'Samsung Galaxy S21',
        precioVenta: 800.00,
        total: 1600.00,
        anticipo: 400.00,
        fechaPedido: hoy,
        fechaEntrega: fechaEntrega,
        estado: 'Pendiente',
        usuarioId: empleado1.id,
        sucursalId: sucursalPrincipal.id
      },
      {
        marca: 'Apple',
        codigo: 'IPH-13',
        cantidad: 1,
        descripcion: 'iPhone 13 Pro',
        precioVenta: 1200.00,
        total: 1200.00,
        anticipo: 600.00,
        fechaPedido: ayer,
        fechaEntrega: fechaEntrega,
        estado: 'Confirmado',
        usuarioId: empleado2.id,
        sucursalId: sucursalNorte.id
      }
    ]
  })

  console.log('✅ Pedidos especiales creados')

  console.log('🎉 Semilla completada exitosamente!')
  console.log('\n📋 Usuarios de prueba creados:')
  console.log('👑 Administrador: admin@librodiario.com (contraseña: 123456)')
  console.log('👨‍💼 Gerente Norte: gerente.norte@librodiario.com (contraseña: 123456)')
  console.log('👨‍💼 Gerente Sur: gerente.sur@librodiario.com (contraseña: 123456)')
  console.log('👤 Empleado 1: empleado1@librodiario.com (contraseña: 123456)')
  console.log('👤 Empleado 2: empleado2@librodiario.com (contraseña: 123456)')
}

main()
  .catch((e) => {
    console.error('❌ Error en la semilla:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
