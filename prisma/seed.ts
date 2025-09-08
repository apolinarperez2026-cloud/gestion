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

  // Crear movimientos de ejemplo con datos reales
  const movimientosData = [
    // 1/1/2024 - Sin datos
    {
      fecha: new Date('2024-01-01'),
      tipo: 'MOVIMIENTO',
      categoria: 'ventasBrutas',
      monto: 0,
      descripcion: 'Día sin movimientos',
      ventasBrutas: 0,
      credito: 0,
      abonosCredito: 0,
      recargas: 0,
      pagoTarjeta: 0,
      gastos: 0,
      depositoManual: 0,
      saldoDia: 0,
      deposito: 0,
      saldoAcumulado: 0,
      sucursalId: sucursalPrincipal.id,
      usuarioEntregaId: empleado1.id
    },
    // 1/2/2024
    {
      fecha: new Date('2024-01-02'),
      tipo: 'MOVIMIENTO',
      categoria: 'ventasBrutas',
      monto: 2073.50,
      descripcion: 'Venta Bruta: $2188.5, gastos: $115',
      ventasBrutas: 2188.50,
      credito: 0,
      abonosCredito: 0,
      recargas: 0,
      pagoTarjeta: 0,
      gastos: 115.00,
      depositoManual: 0,
      saldoDia: 2073.50,
      deposito: 2000.00,
      saldoAcumulado: 73.50,
      sucursalId: sucursalPrincipal.id,
      usuarioEntregaId: empleado1.id
    },
    // 1/3/2024
    {
      fecha: new Date('2024-01-03'),
      tipo: 'MOVIMIENTO',
      categoria: 'recargas',
      monto: 1451.00,
      descripcion: 'Venta Bruta: $1501, recargas: $50',
      ventasBrutas: 1501.00,
      credito: 0,
      abonosCredito: 0,
      recargas: 50.00,
      pagoTarjeta: 0,
      gastos: 0,
      depositoManual: 0,
      saldoDia: 1451.00,
      deposito: 0,
      saldoAcumulado: 1524.50,
      sucursalId: sucursalPrincipal.id,
      usuarioEntregaId: empleado1.id
    },
    // 1/4/2024
    {
      fecha: new Date('2024-01-04'),
      tipo: 'MOVIMIENTO',
      categoria: 'abonosCredito',
      monto: 516.25,
      descripcion: 'Venta Bruta: $1905.25, abonos de crédito: $100, pago con tarjeta: $662, gastos: $827',
      ventasBrutas: 1905.25,
      credito: 0,
      abonosCredito: 100.00,
      recargas: 0,
      pagoTarjeta: 662.00,
      gastos: 827.00,
      depositoManual: 0,
      saldoDia: 516.25,
      deposito: 1000.00,
      saldoAcumulado: 1040.75,
      sucursalId: sucursalPrincipal.id,
      usuarioEntregaId: empleado1.id
    },
    // 1/5/2024
    {
      fecha: new Date('2024-01-05'),
      tipo: 'MOVIMIENTO',
      categoria: 'ventasBrutas',
      monto: 1876.00,
      descripcion: 'Venta Bruta: $1876',
      ventasBrutas: 1876.00,
      credito: 0,
      abonosCredito: 0,
      recargas: 0,
      pagoTarjeta: 0,
      gastos: 0,
      depositoManual: 0,
      saldoDia: 1876.00,
      deposito: 1850.00,
      saldoAcumulado: 1066.75,
      sucursalId: sucursalPrincipal.id,
      usuarioEntregaId: empleado1.id
    },
    // 1/6/2024
    {
      fecha: new Date('2024-01-06'),
      tipo: 'MOVIMIENTO',
      categoria: 'ventasBrutas',
      monto: 3797.00,
      descripcion: 'Venta Bruta: $3797',
      ventasBrutas: 3797.00,
      credito: 0,
      abonosCredito: 0,
      recargas: 0,
      pagoTarjeta: 0,
      gastos: 0,
      depositoManual: 0,
      saldoDia: 3797.00,
      deposito: 3700.00,
      saldoAcumulado: 1163.75,
      sucursalId: sucursalPrincipal.id,
      usuarioEntregaId: empleado1.id
    },
    // 1/7/2024
    {
      fecha: new Date('2024-01-07'),
      tipo: 'MOVIMIENTO',
      categoria: 'ventasBrutas',
      monto: 3091.00,
      descripcion: 'Venta Bruta: $3091',
      ventasBrutas: 3091.00,
      credito: 0,
      abonosCredito: 0,
      recargas: 0,
      pagoTarjeta: 0,
      gastos: 0,
      depositoManual: 0,
      saldoDia: 3091.00,
      deposito: 3100.00,
      saldoAcumulado: 1154.75,
      sucursalId: sucursalPrincipal.id,
      usuarioEntregaId: empleado1.id
    },
    // 1/8/2024
    {
      fecha: new Date('2024-01-08'),
      tipo: 'MOVIMIENTO',
      categoria: 'gastos',
      monto: -457.25,
      descripcion: 'Venta Bruta: $1002.75, gastos: $1460',
      ventasBrutas: 1002.75,
      credito: 0,
      abonosCredito: 0,
      recargas: 0,
      pagoTarjeta: 0,
      gastos: 1460.00,
      depositoManual: 0,
      saldoDia: -457.25,
      deposito: 0,
      saldoAcumulado: 697.50,
      sucursalId: sucursalPrincipal.id,
      usuarioEntregaId: empleado1.id
    },
    // 1/9/2024
    {
      fecha: new Date('2024-01-09'),
      tipo: 'MOVIMIENTO',
      categoria: 'abonosCredito',
      monto: 3846.50,
      descripcion: 'Venta Bruta: $2175.5, abonos de crédito: $1671',
      ventasBrutas: 2175.50,
      credito: 0,
      abonosCredito: 1671.00,
      recargas: 0,
      pagoTarjeta: 0,
      gastos: 0,
      depositoManual: 0,
      saldoDia: 3846.50,
      deposito: 4500.00,
      saldoAcumulado: 44.00,
      sucursalId: sucursalPrincipal.id,
      usuarioEntregaId: empleado1.id
    },
    // 1/10/2024
    {
      fecha: new Date('2024-01-10'),
      tipo: 'MOVIMIENTO',
      categoria: 'pagoTarjeta',
      monto: 1307.00,
      descripcion: 'Venta Bruta: $1384, pago con tarjeta: $54, gastos: $23',
      ventasBrutas: 1384.00,
      credito: 0,
      abonosCredito: 0,
      recargas: 0,
      pagoTarjeta: 54.00,
      gastos: 23.00,
      depositoManual: 0,
      saldoDia: 1307.00,
      deposito: 1500.00,
      saldoAcumulado: -149.00,
      sucursalId: sucursalPrincipal.id,
      usuarioEntregaId: empleado1.id
    },
    // 1/11/2024
    {
      fecha: new Date('2024-01-11'),
      tipo: 'MOVIMIENTO',
      categoria: 'pagoTarjeta',
      monto: 753.50,
      descripcion: 'Venta Bruta: $31215, pago con tarjeta: $29613, gastos: $848.5',
      ventasBrutas: 31215.00,
      credito: 0,
      abonosCredito: 0,
      recargas: 0,
      pagoTarjeta: 29613.00,
      gastos: 848.50,
      depositoManual: 0,
      saldoDia: 753.50,
      deposito: 600.00,
      saldoAcumulado: 4.50,
      sucursalId: sucursalPrincipal.id,
      usuarioEntregaId: empleado1.id
    },
    // 1/12/2024
    {
      fecha: new Date('2024-01-12'),
      tipo: 'MOVIMIENTO',
      categoria: 'pagoTarjeta',
      monto: 715.00,
      descripcion: 'Venta Bruta: $4639, pago con tarjeta: $3344, gastos: $580',
      ventasBrutas: 4639.00,
      credito: 0,
      abonosCredito: 0,
      recargas: 0,
      pagoTarjeta: 3344.00,
      gastos: 580.00,
      depositoManual: 0,
      saldoDia: 715.00,
      deposito: 0,
      saldoAcumulado: 719.50,
      sucursalId: sucursalPrincipal.id,
      usuarioEntregaId: empleado1.id
    },
    // 1/13/2024
    {
      fecha: new Date('2024-01-13'),
      tipo: 'MOVIMIENTO',
      categoria: 'pagoTarjeta',
      monto: 5235.50,
      descripcion: 'Venta Bruta: $8455.5, pago con tarjeta: $134, gastos: $3086',
      ventasBrutas: 8455.50,
      credito: 0,
      abonosCredito: 0,
      recargas: 0,
      pagoTarjeta: 134.00,
      gastos: 3086.00,
      depositoManual: 0,
      saldoDia: 5235.50,
      deposito: 6000.00,
      saldoAcumulado: -45.00,
      sucursalId: sucursalPrincipal.id,
      usuarioEntregaId: empleado1.id
    },
    // 1/14/2024
    {
      fecha: new Date('2024-01-14'),
      tipo: 'MOVIMIENTO',
      categoria: 'ventasBrutas',
      monto: 2479.50,
      descripcion: 'Venta Bruta: $2479.5',
      ventasBrutas: 2479.50,
      credito: 0,
      abonosCredito: 0,
      recargas: 0,
      pagoTarjeta: 0,
      gastos: 0,
      depositoManual: 0,
      saldoDia: 2479.50,
      deposito: 0,
      saldoAcumulado: 2434.50,
      sucursalId: sucursalPrincipal.id,
      usuarioEntregaId: empleado1.id
    },
    // 1/15/2024
    {
      fecha: new Date('2024-01-15'),
      tipo: 'MOVIMIENTO',
      categoria: 'gastos',
      monto: 6591.00,
      descripcion: 'Venta Bruta: $6979.5, gastos: $388.5',
      ventasBrutas: 6979.50,
      credito: 0,
      abonosCredito: 0,
      recargas: 0,
      pagoTarjeta: 0,
      gastos: 388.50,
      depositoManual: 0,
      saldoDia: 6591.00,
      deposito: 8500.00,
      saldoAcumulado: 525.50,
      sucursalId: sucursalPrincipal.id,
      usuarioEntregaId: empleado1.id
    },
    // 1/16/2024
    {
      fecha: new Date('2024-01-16'),
      tipo: 'MOVIMIENTO',
      categoria: 'gastos',
      monto: 956.00,
      descripcion: 'Venta Bruta: $1474, gastos: $518',
      ventasBrutas: 1474.00,
      credito: 0,
      abonosCredito: 0,
      recargas: 0,
      pagoTarjeta: 0,
      gastos: 518.00,
      depositoManual: 0,
      saldoDia: 956.00,
      deposito: 0,
      saldoAcumulado: 1481.50,
      sucursalId: sucursalPrincipal.id,
      usuarioEntregaId: empleado1.id
    },
    // 1/17/2024
    {
      fecha: new Date('2024-01-17'),
      tipo: 'MOVIMIENTO',
      categoria: 'pagoTarjeta',
      monto: 849.50,
      descripcion: 'Venta Bruta: $119937.5, pago con tarjeta: $119000, gastos: $88',
      ventasBrutas: 119937.50,
      credito: 0,
      abonosCredito: 0,
      recargas: 0,
      pagoTarjeta: 119000.00,
      gastos: 88.00,
      depositoManual: 0,
      saldoDia: 849.50,
      deposito: 2300.00,
      saldoAcumulado: 31.00,
      sucursalId: sucursalPrincipal.id,
      usuarioEntregaId: empleado1.id
    },
    // 1/18/2024
    {
      fecha: new Date('2024-01-18'),
      tipo: 'MOVIMIENTO',
      categoria: 'pagoTarjeta',
      monto: 3470.00,
      descripcion: 'Venta Bruta: $3950, pago con tarjeta: $40, gastos: $440',
      ventasBrutas: 3950.00,
      credito: 0,
      abonosCredito: 0,
      recargas: 0,
      pagoTarjeta: 40.00,
      gastos: 440.00,
      depositoManual: 0,
      saldoDia: 3470.00,
      deposito: 3400.00,
      saldoAcumulado: 101.00,
      sucursalId: sucursalPrincipal.id,
      usuarioEntregaId: empleado1.id
    },
    // 1/19/2024
    {
      fecha: new Date('2024-01-19'),
      tipo: 'MOVIMIENTO',
      categoria: 'pagoTarjeta',
      monto: 1109.00,
      descripcion: 'Venta Bruta: $1655, pago con tarjeta: $223, gastos: $323',
      ventasBrutas: 1655.00,
      credito: 0,
      abonosCredito: 0,
      recargas: 0,
      pagoTarjeta: 223.00,
      gastos: 323.00,
      depositoManual: 0,
      saldoDia: 1109.00,
      deposito: 1000.00,
      saldoAcumulado: 210.00,
      sucursalId: sucursalPrincipal.id,
      usuarioEntregaId: empleado1.id
    }
  ]

  // Crear los movimientos
  await prisma.movimiento.createMany({
    data: movimientosData
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
