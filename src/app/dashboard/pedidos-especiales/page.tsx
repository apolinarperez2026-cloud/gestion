'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PedidoEspecial, AuthUser } from '@/types/database'
import UploadThingComponent from '@/components/UploadThing'
import PedidoHistorial from '@/components/PedidoHistorial'

export default function PedidosEspecialesPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [pedidos, setPedidos] = useState<PedidoEspecial[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showHistorialModal, setShowHistorialModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [modalMessage, setModalMessage] = useState('')
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null)
  const [selectedPedido, setSelectedPedido] = useState<PedidoEspecial | null>(null)
  const [pedidoHistorial, setPedidoHistorial] = useState<any[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [deliveryData, setDeliveryData] = useState({
    comprobante: ''
  })
  const [editData, setEditData] = useState({
    marca: '',
    codigo: '',
    cantidad: '',
    descripcion: '',
    precioVenta: '',
    anticipo: '',
    fechaPedido: ''
  })
  const [formData, setFormData] = useState({
    marca: '',
    codigo: '',
    cantidad: '',
    descripcion: '',
    precioVenta: '',
    anticipo: '',
    fechaPedido: new Date().toISOString().split('T')[0]
  })
  const router = useRouter()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const userData = await response.json()
          setUser(userData.user)
          fetchPedidos()
        } else {
          router.push('/auth/login')
        }
      } catch (error) {
        router.push('/auth/login')
      }
    }

    fetchUser()
  }, [router])

  const fetchPedidos = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch('/api/pedidos-especiales', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setPedidos(data.pedidos)
      }
    } catch (error) {
      console.error('Error al cargar pedidos especiales:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch('/api/pedidos-especiales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          cantidad: parseInt(formData.cantidad),
          precioVenta: parseFloat(formData.precioVenta),
          total: calculateTotal(),
          anticipo: parseFloat(formData.anticipo),
          fechaPedido: new Date(formData.fechaPedido),
          estado: 'Pendiente'
        }),
      })

      if (response.ok) {
        setShowForm(false)
        setFormData({
          marca: '',
          codigo: '',
          cantidad: '',
          descripcion: '',
          precioVenta: '',
          anticipo: '',
          fechaPedido: new Date().toISOString().split('T')[0]
        })
        fetchPedidos()
      }
    } catch (error) {
      console.error('Error al crear pedido especial:', error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    // Campos que solo deben permitir números
    const numericFields = ['precioVenta', 'anticipo', 'cantidad']
    
    if (numericFields.includes(name)) {
      // Solo permitir números, punto decimal y cadena vacía
      const numericValue = value.replace(/[^0-9.]/g, '')
      // Evitar múltiples puntos decimales
      const parts = numericValue.split('.')
      const validValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericValue
      
      setFormData(prev => ({ ...prev, [name]: validValue === '' ? '' : validValue }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Solo permitir números, punto decimal, backspace, delete, tab, escape, enter
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
    const isNumber = /[0-9]/.test(e.key)
    const isDecimal = e.key === '.'
    const isAllowedKey = allowedKeys.includes(e.key)
    
    if (!isNumber && !isDecimal && !isAllowedKey) {
      e.preventDefault()
    }
    
    // Evitar múltiples puntos decimales
    if (isDecimal && (e.target as HTMLInputElement).value.includes('.')) {
      e.preventDefault()
    }
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    // Campos que solo deben permitir números
    const numericFields = ['precioVenta', 'anticipo', 'cantidad']
    
    if (numericFields.includes(name)) {
      // Solo permitir números, punto decimal y cadena vacía
      const numericValue = value.replace(/[^0-9.]/g, '')
      // Evitar múltiples puntos decimales
      const parts = numericValue.split('.')
      const validValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericValue
      
      setEditData(prev => ({ ...prev, [name]: validValue === '' ? '' : validValue }))
    } else {
      setEditData(prev => ({ ...prev, [name]: value }))
    }
  }

  // Función para calcular el total
  const calculateTotal = () => {
    const cantidad = parseInt(formData.cantidad)
    const precio = parseFloat(formData.precioVenta)
    if (!isNaN(cantidad) && !isNaN(precio)) {
      return cantidad * precio
    }
    return 0
  }

  const handleEdit = (pedido: PedidoEspecial) => {
    setSelectedPedido(pedido)
    setEditData({
      marca: pedido.marca,
      codigo: pedido.codigo,
      cantidad: pedido.cantidad.toString(),
      descripcion: pedido.descripcion,
      precioVenta: pedido.precioVenta.toString(),
      anticipo: pedido.anticipo.toString(),
      fechaPedido: new Date(pedido.fechaPedido).toISOString().split('T')[0]
    })
    setShowEditModal(true)
  }

  const handleCancelar = async (pedido: PedidoEspecial) => {
    showConfirm('¿Estás seguro de que quieres cancelar este pedido?', async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          router.push('/auth/login')
          return
        }

        const response = await fetch(`/api/pedidos-especiales/${pedido.id}/estado`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ estado: 'Cancelado' }),
        })

        if (response.ok) {
          fetchPedidos()
          showModal('Pedido cancelado exitosamente', 'success')
        } else {
          showModal('Error al cancelar el pedido')
        }
      } catch (error) {
        console.error('Error al cancelar pedido:', error)
        showModal('Error al cancelar el pedido')
      }
    })
  }

  const handleRecibido = async (pedido: PedidoEspecial) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(`/api/pedidos-especiales/${pedido.id}/estado`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ estado: 'Recibido' }),
      })

      if (response.ok) {
        fetchPedidos()
        showModal('Pedido marcado como recibido', 'success')
      } else {
        showModal('Error al actualizar el estado del pedido')
      }
    } catch (error) {
      console.error('Error al actualizar estado:', error)
      showModal('Error al actualizar el estado del pedido')
    }
  }

  const handleEntregar = (pedido: PedidoEspecial) => {
    setSelectedPedido(pedido)
    setDeliveryData({ comprobante: '' })
    setShowDeliveryModal(true)
  }

  const handleDeliverySubmit = async () => {
    if (!selectedPedido || !deliveryData.comprobante) {
      showModal('Por favor, sube el comprobante de entrega')
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(`/api/pedidos-especiales/${selectedPedido.id}/entregar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          comprobante: deliveryData.comprobante
        }),
      })

      if (response.ok) {
        setShowDeliveryModal(false)
        setSelectedPedido(null)
        setDeliveryData({ comprobante: '' })
        fetchPedidos()
        showModal('Pedido entregado exitosamente', 'success')
      } else {
        showModal('Error al entregar el pedido')
      }
    } catch (error) {
      console.error('Error al entregar pedido:', error)
      showModal('Error al entregar el pedido')
    }
  }

  const handleEliminar = (pedido: PedidoEspecial) => {
    showConfirm('¿Estás seguro de que quieres eliminar este pedido?', async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          router.push('/auth/login')
          return
        }

        const response = await fetch(`/api/pedidos-especiales/${pedido.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          fetchPedidos()
          showModal('Pedido eliminado exitosamente', 'success')
        } else {
          const errorData = await response.json()
          showModal(errorData.error || 'Error al eliminar el pedido')
        }
      } catch (error) {
        console.error('Error al eliminar pedido:', error)
        showModal('Error al eliminar el pedido')
      }
    })
  }

  const handleEditSubmit = async () => {
    if (!selectedPedido) return

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(`/api/pedidos-especiales/${selectedPedido.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...editData,
          cantidad: parseInt(editData.cantidad),
          precioVenta: parseFloat(editData.precioVenta),
          total: parseInt(editData.cantidad) * parseFloat(editData.precioVenta),
          anticipo: parseFloat(editData.anticipo),
          fechaPedido: new Date(editData.fechaPedido)
        }),
      })

      if (response.ok) {
        setShowEditModal(false)
        setSelectedPedido(null)
        fetchPedidos()
        showModal('Pedido actualizado exitosamente', 'success')
      } else {
        showModal('Error al actualizar el pedido')
      }
    } catch (error) {
      console.error('Error al actualizar pedido:', error)
      showModal('Error al actualizar el pedido')
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/auth/login')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  const showModal = (message: string, type: 'success' | 'notification' = 'notification') => {
    setModalMessage(message)
    if (type === 'success') {
      setShowSuccessModal(true)
    } else {
      setShowNotificationModal(true)
    }
  }

  const showConfirm = (message: string, action: () => void) => {
    setModalMessage(message)
    setConfirmAction(() => action)
    setShowConfirmModal(true)
  }

  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction()
    }
    setShowConfirmModal(false)
    setConfirmAction(null)
  }

  const handleShowDetails = async (pedido: PedidoEspecial) => {
    setSelectedPedido(pedido)
    setShowDetailsModal(true)
    
    // Cargar historial del pedido
    if (pedido.estado === 'Entregado') {
      await fetchPedidoHistorial(pedido.id)
    }
  }

  const fetchPedidoHistorial = async (pedidoId: number) => {
    try {
      setLoadingHistorial(true)
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(`/api/pedidos-especiales/${pedidoId}/historial`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setPedidoHistorial(data.historial)
      }
    } catch (error) {
      console.error('Error al cargar historial:', error)
    } finally {
      setLoadingHistorial(false)
    }
  }

  const handleShowHistorial = (pedidoId: number) => {
    setSelectedPedido({ id: pedidoId } as PedidoEspecial)
    setShowHistorialModal(true)
  }

  // Función para obtener información de usuarios del historial
  const getUsuarioInfo = (accion: string) => {
    const historialItem = pedidoHistorial.find(item => item.accion === accion)
    return historialItem?.usuario?.nombre || 'N/A'
  }

  const getFechaAccion = (accion: string) => {
    const historialItem = pedidoHistorial.find(item => item.accion === accion)
    return historialItem ? new Date(historialItem.fechaAccion).toLocaleDateString() : 'N/A'
  }

  // Función para filtrar pedidos por término de búsqueda
  const filteredPedidos = pedidos.filter(pedido => 
    pedido.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pedido.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pedido.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pedido.estado.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Función para obtener pedidos de la página actual
  const getCurrentPagePedidos = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredPedidos.slice(startIndex, endIndex)
  }

  // Función para calcular el número total de páginas
  const totalPages = Math.ceil(filteredPedidos.length / itemsPerPage)

  // Función para manejar el cambio de página
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Función para manejar la búsqueda
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1) // Reset a la primera página cuando se busca
  }

  // Función para limpiar la búsqueda
  const clearSearch = () => {
    setSearchTerm('')
    setCurrentPage(1)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const pedidosPendientes = filteredPedidos.filter(p => p.estado === 'Pendiente').length
  const pedidosRecibidos = filteredPedidos.filter(p => p.estado === 'Recibido').length
  const pedidosEntregados = filteredPedidos.filter(p => p.estado === 'Entregado').length
  const pedidosCancelados = filteredPedidos.filter(p => p.estado === 'Cancelado').length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Volver al Dashboard
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Pedidos Especiales
                </h1>
                <p className="text-sm text-gray-600">
                  {user.sucursal?.nombre || 'Sin sucursal'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.nombre}</p>
                <p className="text-xs text-gray-500">{user.rol.nombre}</p>
              </div>
              <button
                onClick={handleLogout}
                className="btn-secondary text-sm"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="  mx-auto sm:px-0 lg:px-40 py-8">
        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Pendientes</h3>
                <p className="text-2xl font-bold text-yellow-600">{pedidosPendientes}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Recibidos</h3>
                <p className="text-2xl font-bold text-orange-600">{pedidosRecibidos}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Entregados</h3>
                <p className="text-2xl font-bold text-green-600">{pedidosEntregados}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Cancelados</h3>
                <p className="text-2xl font-bold text-red-600">{pedidosCancelados}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Botón para agregar pedido */}
        <div className="mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? 'Cancelar' : '+ Nuevo Pedido Especial'}
          </button>
        </div>

        {/* Barra de búsqueda */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar por marca, código, descripción o estado..."
              value={searchTerm}
              onChange={handleSearch}
              className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchTerm && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  onClick={clearSearch}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          {searchTerm && (
            <p className="mt-2 text-sm text-gray-600">
              Mostrando {filteredPedidos.length} de {pedidos.length} pedidos
            </p>
          )}
        </div>

        {/* Formulario para nuevo pedido */}
        {showForm && (
          <div className="card mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Nuevo Pedido Especial</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Marca
                  </label>
                  <input
                    type="text"
                    name="marca"
                    value={formData.marca}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Ej: Samsung, Apple, etc."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código
                  </label>
                  <input
                    type="text"
                    name="codigo"
                    value={formData.codigo}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Código del producto"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cantidad
                  </label>
                  <input
                    type="text"
                    name="cantidad"
                    value={formData.cantidad}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                    className="input-field"
                    placeholder="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio de Venta
                  </label>
                  <input
                    type="text"
                    name="precioVenta"
                    value={formData.precioVenta}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                    className="input-field"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Anticipo
                  </label>
                  <input
                    type="text"
                    name="anticipo"
                    value={formData.anticipo}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                    className="input-field"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Pedido
                  </label>
                  <input
                    type="date"
                    name="fechaPedido"
                    value={formData.fechaPedido}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleChange}
                  className="input-field"
                  rows={3}
                  placeholder="Descripción detallada del producto..."
                  required
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Guardar Pedido
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de pedidos especiales */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Historial de Pedidos Especiales</h3>
            {filteredPedidos.length > 0 && (
              <span className="text-sm text-gray-500">
                Página {currentPage} de {totalPages} ({filteredPedidos.length} pedidos)
              </span>
            )}
          </div>
          {filteredPedidos.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {searchTerm ? 'No se encontraron pedidos que coincidan con la búsqueda' : 'No hay pedidos especiales registrados'}
            </p>
          ) : (
            <>
              {/* Vista de escritorio - Tabla */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Marca
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descripción
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cantidad
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Creado por
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha Creación
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha Entrega
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Historial
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getCurrentPagePedidos().map((pedido) => (
                      <tr 
                        key={pedido.id}
                        className={pedido.estado === 'Entregado' ? 'cursor-pointer hover:bg-gray-50' : ''}
                        onClick={pedido.estado === 'Entregado' ? () => handleShowDetails(pedido) : undefined}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {pedido.marca}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {pedido.descripcion}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {pedido.cantidad}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          ${pedido.total.toLocaleString('en-US')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            pedido.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                            pedido.estado === 'Recibido' ? 'bg-orange-100 text-orange-800' :
                            pedido.estado === 'Entregado' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {pedido.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {pedido.creador?.nombre || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(pedido.creadoEn).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {pedido.fechaEntrega ? new Date(pedido.fechaEntrega).toLocaleDateString() : 'Pendiente'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleShowHistorial(pedido.id)
                            }}
                            className="text-purple-600 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded text-xs font-medium transition-colors"
                          >
                            Ver Historial
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex flex-wrap gap-1">
                            
                             {/* Botones para estado Pendiente */}
                            {pedido.estado === 'Pendiente' && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEdit(pedido)
                                  }}
                                  className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded text-xs font-medium transition-colors"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCancelar(pedido)
                                  }}
                                  className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-xs font-medium transition-colors"
                                >
                                  Cancelar
                                </button>
                              </>
                            )}
                            
                             {/* Botones para estado En Proceso */}
                            {pedido.estado === 'En Proceso' && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEdit(pedido)
                                  }}
                                  className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded text-xs font-medium transition-colors"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCancelar(pedido)
                                  }}
                                  className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-xs font-medium transition-colors"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEntregar(pedido)
                                  }}
                                  className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-2 py-1 rounded text-xs font-medium transition-colors"
                                >
                                  Entregar
                                </button>
                              </>
                            )}
                            
                             {/* Botones para estado Recibido - solo editar y eliminar */}
                             {pedido.estado === 'Recibido' && (
                               <>
                                 {/* Botón de Editar - disponible para todos */}
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation()
                                     handleEdit(pedido)
                                   }}
                                   className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded text-xs font-medium transition-colors"
                                 >
                                   Editar
                                 </button>
                                 {/* Botón de Eliminar - solo para administradores */}
                                 {user?.rol.nombre === 'Administrador' && (
                                   <button
                                     onClick={(e) => {
                                       e.stopPropagation()
                                       handleEliminar(pedido)
                                     }}
                                     className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-xs font-medium transition-colors"
                                   >
                                     Eliminar
                                   </button>
                                 )}
                               </>
                             )}
                            
                             {/* Estados finales */}
                             {pedido.estado === 'Entregado' && (
                               <>
                                 {/* Botón de Editar - disponible para todos */}
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation()
                                     handleEdit(pedido)
                                   }}
                                   className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded text-xs font-medium transition-colors"
                                 >
                                   Editar
                                 </button>
                                 {/* Botón de Eliminar - solo para administradores */}
                                 {user?.rol.nombre === 'Administrador' && (
                                   <button
                                     onClick={(e) => {
                                       e.stopPropagation()
                                       handleEliminar(pedido)
                                     }}
                                     className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-xs font-medium transition-colors"
                                   >
                                     Eliminar
                                   </button>
                                 )}
                               </>
                             )}
                            
                            {pedido.estado === 'Cancelado' && (
                              <span className="text-red-600 text-xs font-medium">✗ Cancelado</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vista móvil - Tarjetas */}
              <div className="lg:hidden space-y-4">
                {getCurrentPagePedidos().map((pedido) => (
                  <div 
                    key={pedido.id}
                    className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${
                      pedido.estado === 'Entregado' ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
                    }`}
                    onClick={pedido.estado === 'Entregado' ? () => handleShowDetails(pedido) : undefined}
                  >
                    {/* Header de la tarjeta */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{pedido.marca}</h3>
                        <p className="text-sm text-gray-600">{pedido.codigo}</p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        pedido.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                        pedido.estado === 'Recibido' ? 'bg-orange-100 text-orange-800' :
                        pedido.estado === 'Entregado' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {pedido.estado}
                      </span>
                    </div>

                    {/* Información del pedido */}
                    <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                      <div>
                        <span className="text-gray-500">Cantidad:</span>
                        <span className="ml-1 font-medium">{pedido.cantidad}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Total:</span>
                        <span className="ml-1 font-medium text-blue-600">${pedido.total.toLocaleString('en-US')}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Creado por:</span>
                        <span className="ml-1 font-medium">{pedido.creador?.nombre || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Fecha:</span>
                        <span className="ml-1 font-medium">{new Date(pedido.creadoEn).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Descripción */}
                    <div className="mb-3">
                      <p className="text-sm text-gray-700 line-clamp-2">{pedido.descripcion}</p>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleShowHistorial(pedido.id)
                        }}
                        className="text-purple-600 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-3 py-1 rounded text-xs font-medium transition-colors"
                      >
                        Historial
                      </button>
                      
                       {/* Botones para estado Pendiente */}
                      {pedido.estado === 'Pendiente' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEdit(pedido)
                            }}
                            className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded text-xs font-medium transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCancelar(pedido)
                            }}
                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded text-xs font-medium transition-colors"
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                      
                       {/* Botones para estado En Proceso */}
                      {pedido.estado === 'En Proceso' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEdit(pedido)
                            }}
                            className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded text-xs font-medium transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCancelar(pedido)
                            }}
                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded text-xs font-medium transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEntregar(pedido)
                            }}
                            className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-3 py-1 rounded text-xs font-medium transition-colors"
                          >
                            Entregar
                          </button>
                        </>
                      )}
                      
                       {/* Botones para estado Recibido - solo editar y eliminar */}
                       {pedido.estado === 'Recibido' && (
                         <>
                           {/* Botón de Editar - disponible para todos */}
                           <button
                             onClick={(e) => {
                               e.stopPropagation()
                               handleEdit(pedido)
                             }}
                             className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded text-xs font-medium transition-colors"
                           >
                             Editar
                           </button>
                           {/* Botón de Eliminar - solo para administradores */}
                           {user?.rol.nombre === 'Administrador' && (
                             <button
                               onClick={(e) => {
                                 e.stopPropagation()
                                 handleEliminar(pedido)
                               }}
                               className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded text-xs font-medium transition-colors"
                             >
                               Eliminar
                             </button>
                           )}
                         </>
                       )}
                      
                       {/* Estados finales */}
                       {pedido.estado === 'Entregado' && (
                         <>
                           {/* Botón de Editar - disponible para todos */}
                           <button
                             onClick={(e) => {
                               e.stopPropagation()
                               handleEdit(pedido)
                             }}
                             className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded text-xs font-medium transition-colors"
                           >
                             Editar
                           </button>
                           {/* Botón de Eliminar - solo para administradores */}
                           {user?.rol.nombre === 'Administrador' && (
                             <button
                               onClick={(e) => {
                                 e.stopPropagation()
                                 handleEliminar(pedido)
                               }}
                               className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded text-xs font-medium transition-colors"
                             >
                               Eliminar
                             </button>
                           )}
                         </>
                       )}
                      
                      {pedido.estado === 'Cancelado' && (
                        <span className="text-red-600 text-xs font-medium px-3 py-1 bg-red-50 rounded">✗ Cancelado</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Mostrando{' '}
                    <span className="font-medium">
                      {Math.min((currentPage - 1) * itemsPerPage + 1, filteredPedidos.length)}
                    </span>{' '}
                    a{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, filteredPedidos.length)}
                    </span>{' '}
                    de{' '}
                    <span className="font-medium">{filteredPedidos.length}</span>{' '}
                    resultados
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Anterior</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {/* Números de página */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Mostrar solo algunas páginas alrededor de la actual
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              page === currentPage
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      } else if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return (
                          <span key={page} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                            ...
                          </span>
                        )
                      }
                      return null
                    })}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Siguiente</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal de Entrega */}
      {showDeliveryModal && selectedPedido && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Entregar Pedido: {selectedPedido.marca} - {selectedPedido.codigo}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comprobante de Entrega
                  </label>
                  <UploadThingComponent
                    onUploadComplete={(url) => {
                      setDeliveryData(prev => ({ ...prev, comprobante: url }))
                    }}
                    onUploadError={(error: Error) => {
                      console.error('Error uploading comprobante:', error)
                      alert('Error al subir comprobante: ' + error.message)
                    }}
                  />
                  {deliveryData.comprobante && (
                    <p className="text-sm text-green-600 mt-1">✓ Comprobante subido</p>
                  )}
                </div>

              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowDeliveryModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeliverySubmit}
                  disabled={!deliveryData.comprobante}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Confirmar Entrega
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición */}
      {showEditModal && selectedPedido && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Editar Pedido: {selectedPedido.marca} - {selectedPedido.codigo}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Marca
                  </label>
                  <input
                    type="text"
                    value={editData.marca}
                    onChange={(e) => setEditData(prev => ({ ...prev, marca: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código
                  </label>
                  <input
                    type="text"
                    value={editData.codigo}
                    onChange={(e) => setEditData(prev => ({ ...prev, codigo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cantidad
                  </label>
                  <input
                    type="text"
                    name="cantidad"
                    value={editData.cantidad}
                    onChange={handleEditChange}
                    onKeyPress={handleKeyPress}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio de Venta
                  </label>
                  <input
                    type="text"
                    name="precioVenta"
                    value={editData.precioVenta}
                    onChange={handleEditChange}
                    onKeyPress={handleKeyPress}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Anticipo
                  </label>
                  <input
                    type="text"
                    name="anticipo"
                    value={editData.anticipo}
                    onChange={handleEditChange}
                    onKeyPress={handleKeyPress}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={editData.descripcion}
                    onChange={(e) => setEditData(prev => ({ ...prev, descripcion: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEditSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles del Pedido */}
      {showDetailsModal && selectedPedido && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Detalles del Pedido: {selectedPedido.marca} - {selectedPedido.codigo}
                </h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Información del Pedido */}
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Información del Pedido</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Marca</label>
                      <p className="text-sm text-gray-900">{selectedPedido.marca}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Código</label>
                      <p className="text-sm text-gray-900">{selectedPedido.codigo}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Cantidad</label>
                      <p className="text-sm text-gray-900">{selectedPedido.cantidad}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Precio de Venta</label>
                      <p className="text-sm text-gray-900">${selectedPedido.precioVenta.toLocaleString('en-US')}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Total</label>
                      <p className="text-sm font-bold text-blue-600">${selectedPedido.total.toLocaleString('en-US')}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Anticipo</label>
                      <p className="text-sm text-gray-900">${selectedPedido.anticipo.toLocaleString('en-US')}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Descripción</label>
                    <p className="text-sm text-gray-900 mt-1 p-3 bg-gray-50 rounded-md">{selectedPedido.descripcion}</p>
                  </div>
                </div>

                {/* Fechas y Estado */}
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Fechas y Estado</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Fecha de Pedido</label>
                      <p className="text-sm text-gray-900">{new Date(selectedPedido.fechaPedido).toLocaleDateString()}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Fecha de Entrega</label>
                      <p className="text-sm text-gray-900">
                        {selectedPedido.fechaEntrega ? new Date(selectedPedido.fechaEntrega).toLocaleDateString() : 'Pendiente'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Estado</label>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                        selectedPedido.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                        selectedPedido.estado === 'En Proceso' ? 'bg-blue-100 text-blue-800' :
                        selectedPedido.estado === 'Recibido' ? 'bg-orange-100 text-orange-800' :
                        selectedPedido.estado === 'Entregado' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {selectedPedido.estado}
                      </span>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Usuario Responsable</label>
                      <p className="text-sm text-gray-900">{selectedPedido.usuario?.nombre || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Creado por</label>
                      <p className="text-sm text-gray-900">{selectedPedido.creador?.nombre || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Última actualización por</label>
                      <p className="text-sm text-gray-900">{selectedPedido.actualizador?.nombre || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Información de Proceso para Pedidos Entregados */}
              {selectedPedido.estado === 'Entregado' && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-800 border-b pb-2 mb-4">Proceso de Entrega</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Fecha de Recepción</label>
                        <p className="text-sm text-gray-900">
                          {loadingHistorial ? 'Cargando...' : getFechaAccion('RECIBIDO')}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Fecha de Entrega</label>
                        <p className="text-sm text-gray-900">
                          {loadingHistorial ? 'Cargando...' : getFechaAccion('ENTREGADO')}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Recibido por</label>
                        <p className="text-sm text-gray-900">
                          {loadingHistorial ? 'Cargando...' : getUsuarioInfo('RECIBIDO')}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Entregado por</label>
                        <p className="text-sm text-gray-900">
                          {loadingHistorial ? 'Cargando...' : getUsuarioInfo('ENTREGADO')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Comprobante de Entrega */}
              {selectedPedido.comprobante && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-800 border-b pb-2 mb-4">Comprobante de Entrega</h4>
                  <div className="flex justify-center">
                    <img 
                      src={selectedPedido.comprobante} 
                      alt="Comprobante de entrega" 
                      className="max-w-full h-auto max-h-96 rounded-lg shadow-md"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowDetailsModal(false)
                    setPedidoHistorial([])
                    setLoadingHistorial(false)
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Confirmar Acción</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">{modalMessage}</p>
              </div>
              <div className="flex justify-center space-x-3 mt-6">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Éxito */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">¡Éxito!</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">{modalMessage}</p>
              </div>
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Notificación */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Atención</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">{modalMessage}</p>
              </div>
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setShowNotificationModal(false)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Historial */}
      {showHistorialModal && selectedPedido && (
        <PedidoHistorial
          pedidoId={selectedPedido.id}
          isOpen={showHistorialModal}
          onClose={() => setShowHistorialModal(false)}
        />
      )}
    </div>
  )
}
