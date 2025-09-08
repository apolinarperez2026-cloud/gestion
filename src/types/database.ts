export interface Sucursal {
  id: number
  nombre: string
  direccion: string
  usuarios?: Usuario[]
  movimientos?: Movimiento[]
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
  sucursal: Sucursal
  sucursalId: number
  movimientosEntrega?: Movimiento[]
  movimientosRecibe?: Movimiento[]
  pedidosEspeciales?: PedidoEspecial[]
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

export interface Movimiento {
  id: number
  fecha: Date
  tipo: string
  categoria?: string
  monto: number
  descripcion?: string
  referencia?: string
  tipoGasto?: TipoGasto
  tipoGastoId?: number
  usuarioEntrega?: Usuario
  usuarioEntregaId?: number
  usuarioRecibe?: Usuario
  usuarioRecibeId?: number
  sucursal: Sucursal
  sucursalId: number
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
  tipo: string
  categoria?: string
  monto: number
  descripcion?: string
  referencia?: string
  tipoGastoId?: number
  usuarioEntregaId?: number
  usuarioRecibeId?: number
  sucursalId: number
}

export interface CreateSucursalData {
  nombre: string
  direccion: string
}

export interface CreatePedidoEspecialData {
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
  usuarioId: number
  sucursalId: number
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
  }
}
