import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

// Permisos del sistema
const PERMISOS = [
  // Dashboard
  { codigo: 'VER_DASHBOARD', descripcion: 'Acceder al dashboard principal', categoria: 'Dashboard' },
  { codigo: 'VER_RESUMEN', descripcion: 'Ver Resumen Empresarial / BI', categoria: 'Dashboard' },
  // Movimientos
  { codigo: 'VER_CONTROL', descripcion: 'Ver Control diario de movimientos', categoria: 'Movimientos' },
  { codigo: 'VER_GASTOS', descripcion: 'Ver y registrar Gastos', categoria: 'Movimientos' },
  { codigo: 'EDITAR_REGISTROS', descripcion: 'Editar registros existentes (con bitácora)', categoria: 'Movimientos' },
  // Finanzas
  { codigo: 'VER_DEPOSITOS', descripcion: 'Ver y registrar Depósitos bancarios', categoria: 'Finanzas' },
  { codigo: 'VER_TPV', descripcion: 'Ver y registrar Cobros TPV', categoria: 'Finanzas' },
  { codigo: 'VER_FONDO_CAJA', descripcion: 'Ver y registrar Fondo de Caja Inicial', categoria: 'Finanzas' },
  // Ventas
  { codigo: 'VER_PEDIDOS', descripcion: 'Ver y gestionar Pedidos Especiales', categoria: 'Ventas' },
  { codigo: 'AUTORIZAR_MOVIMIENTOS', descripcion: 'Autorizar entregas y movimientos importantes', categoria: 'Ventas' },
  // Almacén
  { codigo: 'VER_MERCADERIAS', descripcion: 'Ver Entradas/Salidas de mercadería', categoria: 'Almacen' },
  { codigo: 'VER_GARANTIAS', descripcion: 'Ver y gestionar Garantías', categoria: 'Almacen' },
  { codigo: 'VER_INVENTARIO', descripcion: 'Acceder al módulo de Inventario digital', categoria: 'Almacen' },
  // Reportes
  { codigo: 'VER_REPORTES', descripcion: 'Ver reportes y estadísticas', categoria: 'Reportes' },
  { codigo: 'CONSULTAR_INDICADORES', descripcion: 'Consultar indicadores estratégicos (CEO/Director)', categoria: 'Reportes' },
  { codigo: 'EXPORTAR_EXCEL', descripcion: 'Exportar datos a Excel', categoria: 'Reportes' },
  // RRHH
  { codigo: 'VER_VACACIONES', descripcion: 'Ver módulo de Control de Vacaciones', categoria: 'RRHH' },
  // Admin
  { codigo: 'VER_TODAS_SUCURSALES', descripcion: 'Ver datos de todas las sucursales', categoria: 'Admin' },
  { codigo: 'ADMINISTRAR_USUARIOS', descripcion: 'Crear y gestionar usuarios', categoria: 'Admin' },
  { codigo: 'ADMINISTRAR_SUCURSALES', descripcion: 'Gestionar sucursales y bloques', categoria: 'Admin' },
  { codigo: 'ADMINISTRAR_CONFIGURACION', descripcion: 'Acceder a configuración del sistema', categoria: 'Admin' },
]

// Permisos por nivel de rol
const PERMISOS_POR_NIVEL: Record<number, string[]> = {
  1: [ // Empleado/Vendedor
    'VER_DASHBOARD', 'VER_CONTROL', 'VER_GASTOS',
    'VER_PEDIDOS', 'VER_MERCADERIAS', 'VER_GARANTIAS',
    'VER_TPV', 'VER_FONDO_CAJA', 'VER_VACACIONES',
  ],
  2: [ // Gerente/Líder
    'VER_DASHBOARD', 'VER_CONTROL', 'VER_GASTOS',
    'VER_PEDIDOS', 'VER_MERCADERIAS', 'VER_GARANTIAS',
    'VER_TPV', 'VER_FONDO_CAJA', 'VER_DEPOSITOS',
    'VER_REPORTES', 'CONSULTAR_INDICADORES', 'VER_RESUMEN',
    'VER_INVENTARIO', 'VER_VACACIONES', 'EXPORTAR_EXCEL',
    'AUTORIZAR_MOVIMIENTOS',
  ],
  3: [ // Director
    'VER_DASHBOARD', 'VER_CONTROL', 'VER_GASTOS',
    'VER_PEDIDOS', 'VER_MERCADERIAS', 'VER_GARANTIAS',
    'VER_TPV', 'VER_FONDO_CAJA', 'VER_DEPOSITOS',
    'VER_REPORTES', 'CONSULTAR_INDICADORES', 'VER_RESUMEN',
    'VER_INVENTARIO', 'VER_VACACIONES', 'EXPORTAR_EXCEL',
    'AUTORIZAR_MOVIMIENTOS', 'EDITAR_REGISTROS',
    'VER_TODAS_SUCURSALES',
  ],
  4: [ // CEO
    'VER_DASHBOARD', 'VER_CONTROL', 'VER_GASTOS',
    'VER_PEDIDOS', 'VER_MERCADERIAS', 'VER_GARANTIAS',
    'VER_TPV', 'VER_FONDO_CAJA', 'VER_DEPOSITOS',
    'VER_REPORTES', 'CONSULTAR_INDICADORES', 'VER_RESUMEN',
    'VER_INVENTARIO', 'VER_VACACIONES', 'EXPORTAR_EXCEL',
    'AUTORIZAR_MOVIMIENTOS', 'EDITAR_REGISTROS',
    'VER_TODAS_SUCURSALES',
  ],
  5: [ // Administrador — todos
    'VER_DASHBOARD', 'VER_CONTROL', 'VER_GASTOS',
    'VER_PEDIDOS', 'VER_MERCADERIAS', 'VER_GARANTIAS',
    'VER_TPV', 'VER_FONDO_CAJA', 'VER_DEPOSITOS',
    'VER_REPORTES', 'CONSULTAR_INDICADORES', 'VER_RESUMEN',
    'VER_INVENTARIO', 'VER_VACACIONES', 'EXPORTAR_EXCEL',
    'AUTORIZAR_MOVIMIENTOS', 'EDITAR_REGISTROS',
    'VER_TODAS_SUCURSALES', 'ADMINISTRAR_USUARIOS',
    'ADMINISTRAR_SUCURSALES', 'ADMINISTRAR_CONFIGURACION',
  ],
}

// Niveles predeterminados por nombre de rol
const NIVEL_POR_NOMBRE: Record<string, number> = {
  'Administrador': 5,
  'CEO': 4,
  'Director': 3,
  'Gerente': 2,
  'Lider': 2,
  'Líder': 2,
  'Empleado': 1,
  'Vendedor': 1,
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 })
    }
    const decoded = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET!) as any
    if (decoded.rol !== 'Administrador') {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    // 1. Crear/actualizar todos los permisos
    for (const p of PERMISOS) {
      await prisma.permiso.upsert({
        where: { codigo: p.codigo },
        update: { descripcion: p.descripcion, categoria: p.categoria },
        create: p
      })
    }

    // 2. Actualizar nivel de roles existentes y asignar permisos
    const roles = await prisma.rol.findMany()
    for (const rol of roles) {
      const nivel = NIVEL_POR_NOMBRE[rol.nombre] ?? 1
      await prisma.rol.update({ where: { id: rol.id }, data: { nivel } })

      const codigos = PERMISOS_POR_NIVEL[nivel] || PERMISOS_POR_NIVEL[1]
      const permisos = await prisma.permiso.findMany({ where: { codigo: { in: codigos } } })

      for (const p of permisos) {
        await prisma.rolPermiso.upsert({
          where: { rolId_permisoId: { rolId: rol.id, permisoId: p.id } },
          update: {},
          create: { rolId: rol.id, permisoId: p.id }
        })
      }
    }

    return NextResponse.json({ message: 'Permisos inicializados correctamente', roles: roles.length, permisos: PERMISOS.length })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
