import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

export const PERMISOS = {
  VER_DASHBOARD: 'VER_DASHBOARD',
  VER_RESUMEN: 'VER_RESUMEN',
  VER_CONTROL: 'VER_CONTROL',
  VER_GASTOS: 'VER_GASTOS',
  EDITAR_REGISTROS: 'EDITAR_REGISTROS',
  VER_DEPOSITOS: 'VER_DEPOSITOS',
  VER_TPV: 'VER_TPV',
  VER_FONDO_CAJA: 'VER_FONDO_CAJA',
  VER_PEDIDOS: 'VER_PEDIDOS',
  AUTORIZAR_MOVIMIENTOS: 'AUTORIZAR_MOVIMIENTOS',
  VER_MERCADERIAS: 'VER_MERCADERIAS',
  VER_GARANTIAS: 'VER_GARANTIAS',
  VER_INVENTARIO: 'VER_INVENTARIO',
  VER_REPORTES: 'VER_REPORTES',
  CONSULTAR_INDICADORES: 'CONSULTAR_INDICADORES',
  EXPORTAR_EXCEL: 'EXPORTAR_EXCEL',
  VER_VACACIONES: 'VER_VACACIONES',
  VER_TODAS_SUCURSALES: 'VER_TODAS_SUCURSALES',
  ADMINISTRAR_USUARIOS: 'ADMINISTRAR_USUARIOS',
  ADMINISTRAR_SUCURSALES: 'ADMINISTRAR_SUCURSALES',
  ADMINISTRAR_CONFIGURACION: 'ADMINISTRAR_CONFIGURACION',
} as const

export type PermisoCodigo = keyof typeof PERMISOS

/**
 * Verifica si el usuario (por su rolId) tiene un permiso específico.
 * Administradores siempre tienen todos los permisos.
 */
export async function tienePermiso(rolId: number, rolNombre: string, codigo: string): Promise<boolean> {
  if (rolNombre === 'Administrador') return true

  const rp = await prisma.rolPermiso.findFirst({
    where: {
      rolId,
      permiso: { codigo }
    }
  })
  return rp !== null
}

/**
 * Obtiene todos los permisos de un rol como array de códigos.
 */
export async function getPermisosDeRol(rolId: number, rolNombre: string): Promise<string[]> {
  if (rolNombre === 'Administrador') {
    const todos = await prisma.permiso.findMany({ select: { codigo: true } })
    return todos.map(p => p.codigo)
  }

  const rps = await prisma.rolPermiso.findMany({
    where: { rolId },
    include: { permiso: { select: { codigo: true } } }
  })
  return rps.map(rp => rp.permiso.codigo)
}

/**
 * Extrae y verifica el token JWT. Devuelve decoded o lanza error.
 */
export function verifyToken(authHeader: string | null): any {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('TOKEN_MISSING')
  }
  return jwt.verify(authHeader.substring(7), process.env.JWT_SECRET!) as any
}
