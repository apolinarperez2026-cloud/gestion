'use client'

import { useState, useEffect } from 'react'
import { PedidoEspecialHistorial } from '@/types/database'

interface PedidoHistorialProps {
  pedidoId: number
  isOpen: boolean
  onClose: () => void
}

export default function PedidoHistorial({ pedidoId, isOpen, onClose }: PedidoHistorialProps) {
  const [historial, setHistorial] = useState<PedidoEspecialHistorial[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && pedidoId) {
      fetchHistorial()
    }
  }, [isOpen, pedidoId])

  const fetchHistorial = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        return
      }

      const response = await fetch(`/api/pedidos-especiales/${pedidoId}/historial`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setHistorial(data.historial)
      }
    } catch (error) {
      console.error('Error al cargar historial:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAccionIcon = (accion: string) => {
    switch (accion) {
      case 'CREADO':
        return '➕'
      case 'ACTUALIZADO':
        return '✏️'
      case 'CANCELADO':
        return '❌'
      case 'RECIBIDO':
        return '📦'
      case 'ENTREGADO':
        return '✅'
      default:
        return '📝'
    }
  }

  const getAccionDescription = (item: PedidoEspecialHistorial) => {
    if (item.accion === 'CREADO') {
      return `Pedido creado: ${item.datosNuevos?.marca || 'N/A'} - ${item.datosNuevos?.codigo || 'N/A'}`
    }
    
    if (item.accion === 'ACTUALIZADO' && item.datosAnteriores && item.datosNuevos) {
      const cambios = Object.keys(item.datosNuevos).filter(key => 
        item.datosAnteriores[key] !== item.datosNuevos[key]
      )
      
      if (cambios.length === 1) {
        const campo = cambios[0]
        const labels: { [key: string]: string } = {
          marca: 'Marca',
          codigo: 'Código',
          cantidad: 'Cantidad',
          descripcion: 'Descripción',
          precioVenta: 'Precio de Venta',
          total: 'Total',
          anticipo: 'Anticipo',
          fechaPedido: 'Fecha de Pedido'
        }
        return `Campo "${labels[campo] || campo}" actualizado`
      } else if (cambios.length > 1) {
        return `${cambios.length} campos actualizados`
      }
    }
    
    if (item.accion === 'CANCELADO') {
      return 'Pedido cancelado'
    }
    
    if (item.accion === 'RECIBIDO') {
      return 'Pedido marcado como recibido'
    }
    
    if (item.accion === 'ENTREGADO') {
      return 'Pedido entregado con comprobante'
    }
    
    return item.descripcion
  }

  const getAccionColor = (accion: string) => {
    switch (accion) {
      case 'CREADO':
        return 'bg-green-100 text-green-800'
      case 'ACTUALIZADO':
        return 'bg-blue-100 text-blue-800'
      case 'CANCELADO':
        return 'bg-red-100 text-red-800'
      case 'RECIBIDO':
        return 'bg-orange-100 text-orange-800'
      case 'ENTREGADO':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Historial del Pedido #{pedidoId}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Cargando historial...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {historial.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay historial disponible</p>
              ) : (
                historial.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <span className="text-2xl">{getAccionIcon(item.accion)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAccionColor(item.accion)}`}>
                            {item.accion}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(item.fechaAccion).toLocaleString('en-US')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 mb-2">{getAccionDescription(item)}</p>
                        <p className="text-xs text-gray-500">
                          Por: <span className="font-medium">{item.usuario?.nombre || 'Usuario desconocido'}</span>
                        </p>
                        
                        {/* Mostrar cambios si existen */}
                        {item.datosAnteriores && item.datosNuevos && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-md">
                            <h4 className="text-xs font-medium text-gray-700 mb-2">Cambios realizados:</h4>
                            <div className="space-y-2 text-xs">
                              {(() => {
                                const cambios = Object.keys(item.datosNuevos).filter(key => 
                                  item.datosAnteriores[key] !== item.datosNuevos[key]
                                )
                                
                                if (cambios.length === 0) {
                                  return (
                                    <div className="text-gray-500 italic">
                                      No se detectaron cambios específicos
                                    </div>
                                  )
                                }
                                
                                return cambios.map((key) => {
                                  const valorAnterior = item.datosAnteriores[key]
                                  const valorNuevo = item.datosNuevos[key]
                                
                                const getFieldLabel = (field: string) => {
                                  const labels: { [key: string]: string } = {
                                    marca: 'Marca',
                                    codigo: 'Código',
                                    cantidad: 'Cantidad',
                                    descripcion: 'Descripción',
                                    precioVenta: 'Precio de Venta',
                                    total: 'Total',
                                    anticipo: 'Anticipo',
                                    fechaPedido: 'Fecha de Pedido',
                                    estado: 'Estado',
                                    fechaEntrega: 'Fecha de Entrega',
                                    comprobante: 'Comprobante'
                                  }
                                  return labels[field] || field
                                }
                                
                                const formatValue = (value: any, field: string) => {
                                  if (field === 'fechaPedido' || field === 'fechaEntrega') {
                                    return value ? new Date(value).toLocaleDateString() : 'N/A'
                                  }
                                  if (field === 'precioVenta' || field === 'total' || field === 'anticipo') {
                                    return `$${Number(value).toLocaleString('en-US')}`
                                  }
                                  if (field === 'cantidad') {
                                    return Number(value).toString()
                                  }
                                  return value?.toString() || 'N/A'
                                }
                                
                                  return (
                                    <div key={key} className="flex items-center justify-between p-2 bg-white rounded border">
                                      <span className="font-medium text-gray-700">{getFieldLabel(key)}:</span>
                                      <div className="flex items-center space-x-2">
                                        <span className="text-red-600 line-through">
                                          {formatValue(valorAnterior, key)}
                                        </span>
                                        <span className="text-gray-400">→</span>
                                        <span className="text-green-600 font-medium">
                                          {formatValue(valorNuevo, key)}
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
