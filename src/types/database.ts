export interface Sucursal {
  id: number
  nombre: string
  direccion: string
  usuarios?: Usuario[]
  movimientos?: Movimiento[]
  movimientosDiarios?: MovimientoDiario[]
  fondoCajas?: FondoCaja[]
  pedidosEspeciales?: PedidoEspecial[]
  createdAt: Date
  updatedAt: Date
}

export interface Rol {
  id: number
  nombre: string
  usuarios?: Usuario[]
  createdAt: Date
  updatedAt: Date
}

export interface Usuario {
  id: number
  nombre: string
  email: string
  password: string
  rol: Rol
  rolId: number
  sucursal: Sucursal | null
  sucursalId: number | null
  pedidosEspeciales?: PedidoEspecial[]
  movimientos?: Movimiento[]
  movimientosDiarios?: MovimientoDiario[]
  movimientosDiariosHistorial?: MovimientoDiarioHistorial[]
  createdAt: Date
  updatedAt: Date
}

export interface TipoGasto {
  id: number
  nombre: string
  movimientos?: Movimiento[]
  createdAt: Date
  updatedAt: Date
}


export interface FondoCaja {
  id: number
  fecha: Date
  saldoInicial: number
  saldoFinal?: number
  sucursal: Sucursal
  sucursalId: number
  createdAt: Date
  updatedAt: Date
}

export interface PedidoEspecial {
  id: number
  marca: string
  codigo: string
  cantidad: number
  descripcion: string
  precioVenta: number
  total: number
  anticipo: number
  fechaPedido: Date
  fechaEntrega: Date
  estado: string
  usuario: Usuario
  usuarioId: number
  sucursal: Sucursal
  sucursalId: number
  createdAt: Date
  updatedAt: Date
}

// Tipos para formularios
export interface CreateUsuarioData {
  nombre: string
  email: string
  password: string
  rolId: number
  sucursalId: number
}

export interface CreateMovimientoData {
  fecha: Date
  tipo?: string // ENTRADA, SALIDA
  categoria?: string
  monto: number
  descripcion?: string
  referencia?: string // Referencia ODOO
  tipoGastoId?: number
  usuarioEntregaId?: number
  usuarioRecibeId?: number
  sucursalId: number
  // Campos del formulario
  ventasBrutas: number
  tipoPago?: string
  importeTipoPago?: string
  depositoManual?: string
  // Campos adicionales para el formato específico
  efectivo?: number
  credito?: number
  abonosCredito?: number
  recargas?: number
  pagoTarjeta?: number
  transferencias?: number
  gastos?: number
  saldoDia?: number
  deposito?: number
  saldoAcumulado?: number
}

export interface CreateMovimientoDiarioData {
  fecha: Date
  ventasBrutas: number
  efectivo: number
  credito: number
  abonosCredito: number
  recargas: number
  pagoTarjeta: number
  transferencias: number
  gastos: number
  observaciones?: string
  sucursalId: number
}

export interface MovimientoDiarioForm {
  fecha: string
  ventasBrutas: string
  efectivo: string
  credito: string
  abonosCredito: string
  recargas: string
  pagoTarjeta: string
  transferencias: string
  observaciones: string
}

export interface CreateSucursalData {
  nombre: string
  direccion: string
}

export interface CreatePedidoEspecialData {
  descripcion: string
  monto: number
  fecha?: Date
}

// Tipos para autenticación
export interface LoginData {
  email: string
  password: string
}

export interface AuthUser {
  id: number
  nombre: string
  email: string
  rol: {
    id: number
    nombre: string
  }
  sucursal: {
    id: number
    nombre: string
  } | null
  sucursalId: number | null
}

// Nuevos modelos para el sistema de movimientos unificados

export enum MovimientoTipo {
  VENTA = 'VENTA',
  GASTO = 'GASTO',
  FONDO_CAJA = 'FONDO_CAJA'
}

export interface FormaDePago {
  id: number
  nombre: string
  movimientos?: Movimiento[]
  createdAt: Date
  updatedAt: Date
}

export interface Movimiento {
  id: number
  fecha: Date
  descripcion: string
  monto: number
  tipo: MovimientoTipo
  imagen?: string
  formaDePagoId?: number
  formaDePago?: FormaDePago
  tipoGastoId?: number
  tipoGasto?: TipoGasto
  sucursal: Sucursal
  sucursalId: number
  usuario?: Usuario
  usuarioId?: number
  createdAt: Date
  updatedAt: Date
}

export interface MovimientoDiario {
  id: number
  fecha: Date
  ventasBrutas: number
  efectivo: number
  credito: number
  abonosCredito: number
  recargas: number
  pagoTarjeta: number
  transferencias: number
  gastos: number
  saldoDia: number
  observaciones?: string
  sucursal: Sucursal
  sucursalId: number
  usuario?: Usuario
  usuarioId?: number
  historial?: MovimientoDiarioHistorial[]
  createdAt: Date
  updatedAt: Date
}

export interface MovimientoDiarioHistorial {
  id: number
  movimientoDiarioId: number
  movimientoDiario?: MovimientoDiario
  usuarioId: number
  usuario?: Usuario
  campoModificado: string
  valorAnterior: string
  valorNuevo: string
  fechaCambio: Date
  observaciones?: string
}