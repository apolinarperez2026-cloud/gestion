'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthUser, Garantia } from '@/types/database'
import UploadThingComponent from '@/components/UploadThing'
import { displayDateOnly, formatDateOnly } from '@/lib/dateUtils'

interface GarantiaData {
  fechaRegistro: string
  cliente: string
  marca: string
  sku: string
  cantidad: number | string
  descripcion: string
  estado: 'en_reparacion' | 'cancelada' | 'proceso_reembolso' | 'proceso_reemplazo' | 'completada'
  comentarios: string
  fechaEntregaFabricante: string
  fechaRegresoFabricante: string
  fechaEntregaCliente: string
  fotoReciboEntrega: string
}

export default function GarantiaPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<GarantiaData>({
    fechaRegistro: new Date().toISOString().split('T')[0],
    cliente: '',
    marca: '',
    sku: '',
    cantidad: '',
    descripcion: '',
    estado: 'en_reparacion',
    comentarios: '',
    fechaEntregaFabricante: '',
    fechaRegresoFabricante: '',
    fechaEntregaCliente: '',
    fotoReciboEntrega: ''
  })
  const [garantias, setGarantias] = useState<Garantia[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [modalMessage, setModalMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<GarantiaData>>({
    fechaRegistro: '',
    cliente: '',
    marca: '',
    sku: '',
    cantidad: '',
    descripcion: '',
    estado: 'en_reparacion'
  })
  const [selectedGarantia, setSelectedGarantia] = useState<Garantia | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    completadas: 0,
    enProgreso: 0,
    canceladas: 0,
    enReparacion: 0,
    procesoReembolso: 0,
    procesoReemplazo: 0
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [garantiaToDelete, setGarantiaToDelete] = useState<Garantia | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })
  const router = useRouter()

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const userData = await response.json()
        setUser(userData.user)
        // Establecer el nombre del usuario logueado en el campo "usuarioRegistro"
        setFormData(prev => ({
          ...prev,
          usuarioRegistro: userData.user.nombre
        }))
      } else {
        router.push('/auth/login')
      }
    } catch (error) {
      router.push('/auth/login')
    } finally {
      setLoading(false)
    }
  }

  const fetchGarantias = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/garantias?month=${selectedMonth}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setGarantias(data.garantias || [])
        calculateStats(data.garantias || [])
      }
    } catch (error) {
      console.error('Error al cargar garantías:', error)
    }
  }

  useEffect(() => {
    fetchUser()
    fetchGarantias()
  }, [selectedMonth])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    if (name === 'monto') {
      // Solo permitir números, punto decimal y cadena vacía
      const numericValue = value.replace(/[^0-9.]/g, '')
      // Evitar múltiples puntos decimales
      const parts = numericValue.split('.')
      const validValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericValue
      
      setFormData(prev => ({
        ...prev,
        [name]: validValue === '' ? '' : validValue
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
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

  const handleImageUploadComplete = (url: string) => {
    setFormData(prev => ({
      ...prev,
      fotoReciboEntrega: url
    }))
  }

  const handleImageUploadError = (error: Error) => {
    console.error('Error al subir imagen:', error)
    setModalMessage('Error al subir la imagen')
    setShowErrorModal(true)
  }

  // Funciones para edición
  const handleEdit = (garantia: Garantia) => {
    setEditingId(garantia.id.toString())
    setEditFormData({
      fechaRegistro: formatDateOnly(garantia.fechaRegistro),
      cliente: garantia.cliente,
      marca: garantia.marca,
      sku: garantia.sku,
      cantidad: garantia.cantidad.toString(),
      descripcion: garantia.descripcion,
      estado: garantia.estado as 'en_reparacion' | 'cancelada' | 'proceso_reembolso' | 'proceso_reemplazo' | 'completada'
    })
  }

  // Función para determinar qué acción mostrar según el estado
  const getActionButton = (garantia: Garantia) => {
    if (!garantia.fechaEntregaFabricante) {
      return { text: "Enviar a Proveedor", action: "enviar_proveedor" }
    } else if (!garantia.fechaRegresoFabricante) {
      return { text: "Recibido de Proveedor", action: "recibido_proveedor" }
    } else if (!garantia.fechaEntregaCliente) {
      return { text: "Entregar al Cliente", action: "entregar_cliente" }
    } else {
      return { text: "Completado", action: "completado" }
    }
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    if (name === 'cantidad') {
      // Solo permitir números positivos
      const numericValue = value.replace(/[^0-9]/g, '')
      setEditFormData(prev => ({
        ...prev,
        [name]: numericValue
      }))
    } else {
      setEditFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleEditSubmit = async (garantiaId: string) => {
    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      console.log('Enviando datos:', editFormData) // Debug

      const response = await fetch(`/api/garantias/${garantiaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editFormData)
      })

      if (response.ok) {
        setEditingId(null)
        setEditFormData({})
        fetchGarantias()
        setModalMessage('Garantía actualizada exitosamente')
        setShowSuccessModal(true)
      } else {
        const error = await response.json()
        console.error('Error response:', error) // Debug
        setModalMessage(`Error: ${error.error || 'Error al actualizar garantía'}`)
        setShowErrorModal(true)
      }
    } catch (error) {
      console.error('Error al actualizar garantía:', error)
      setModalMessage('Error al actualizar garantía')
      setShowErrorModal(true)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditFormData({})
  }



  const handleDelete = (garantia: Garantia) => {
    setGarantiaToDelete(garantia)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!garantiaToDelete) return

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/garantias/${garantiaToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        fetchGarantias()
        setShowDeleteModal(false)
        setGarantiaToDelete(null)
        setModalMessage('Garantía eliminada exitosamente')
        setShowSuccessModal(true)
      } else {
        const error = await response.json()
        setModalMessage(`Error: ${error.error || 'Error al eliminar garantía'}`)
        setShowErrorModal(true)
        setShowDeleteModal(false)
        setGarantiaToDelete(null)
      }
    } catch (error) {
      console.error('Error al eliminar garantía:', error)
      setModalMessage('Error al eliminar garantía')
      setShowErrorModal(true)
      setShowDeleteModal(false)
      setGarantiaToDelete(null)
    }
  }

  // Función para abrir modal de detalles
  const handleShowDetails = (garantia: Garantia) => {
    setSelectedGarantia(garantia)
    setShowDetailsModal(true)
  }

  const handleCloseDetails = () => {
    setSelectedGarantia(null)
    setShowDetailsModal(false)
  }

  // Función para calcular estadísticas
  const calculateStats = (garantias: Garantia[]) => {
    const newStats = {
      total: garantias.length,
      completadas: garantias.filter(g => g.estado === 'completada').length,
      enProgreso: garantias.filter(g => g.estado === 'en_reparacion').length,
      canceladas: garantias.filter(g => g.estado === 'cancelada').length,
      enReparacion: garantias.filter(g => g.estado === 'en_reparacion').length,
      procesoReembolso: garantias.filter(g => g.estado === 'proceso_reembolso').length,
      procesoReemplazo: garantias.filter(g => g.estado === 'proceso_reemplazo').length
    }
    setStats(newStats)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch('/api/garantias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          cantidad: typeof formData.cantidad === 'string' ? (parseInt(formData.cantidad) || 0) : formData.cantidad
        })
      })

      if (response.ok) {
        setFormData({
          fechaRegistro: new Date().toISOString().split('T')[0],
          cliente: '',
          marca: '',
          sku: '',
          cantidad: '',
          descripcion: '',
          estado: 'en_reparacion',
          comentarios: '',
          fechaEntregaFabricante: '',
          fechaRegresoFabricante: '',
          fechaEntregaCliente: '',
          fotoReciboEntrega: ''
        })
        setShowForm(false)
        fetchGarantias()
        setModalMessage('Garantía registrada exitosamente')
        setShowSuccessModal(true)
      } else {
        const error = await response.json()
        setModalMessage(`Error: ${error.message || 'Error al registrar garantía'}`)
        setShowErrorModal(true)
      }
    } catch (error) {
      console.error('Error:', error)
      setModalMessage('Error al registrar garantía')
      setShowErrorModal(true)
    } finally {
      setSubmitting(false)
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

  // Función para filtrar garantías
  const filteredGarantias = garantias.filter(garantia =>
    garantia.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    garantia.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
    garantia.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    garantia.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    garantia.estado.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Función para obtener garantías de la página actual
  const getCurrentPageGarantias = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredGarantias.slice(startIndex, endIndex)
  }

  // Función para calcular el número total de páginas
  const totalPages = Math.ceil(filteredGarantias.length / itemsPerPage)

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
                  Garantías
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controles superiores */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mes y Año
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value)
                  setCurrentPage(1)
                }}
                className="input-field"
              />
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-primary h-fit mt-6"
            >
              {showForm ? 'Cancelar' : '+ Nueva Garantía'}
            </button>
          </div>
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
              value={searchTerm}
              onChange={handleSearch}
              className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Buscar por cliente, marca, SKU, descripción o estado..."
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
        </div>

        {/* Indicador del período seleccionado */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-blue-800 font-medium">
              Mostrando datos de: {new Date(selectedMonth + '-01').toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })}
            </span>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Completadas</p>
                <p className="text-2xl font-semibold text-green-600">{stats.completadas}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">En Progreso</p>
                <p className="text-2xl font-semibold text-blue-600">{stats.enProgreso}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Reembolso</p>
                <p className="text-2xl font-semibold text-yellow-600">{stats.procesoReembolso}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Reemplazo</p>
                <p className="text-2xl font-semibold text-orange-600">{stats.procesoReemplazo}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Canceladas</p>
                <p className="text-2xl font-semibold text-red-600">{stats.canceladas}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">En Reparación</p>
                <p className="text-2xl font-semibold text-purple-600">{stats.enReparacion}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulario */}
        {showForm && (
          <div className="card mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Registrar Nueva Garantía
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Registro *
                  </label>
                  <input
                    type="date"
                    name="fechaRegistro"
                    value={formData.fechaRegistro}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente *
                  </label>
                  <input
                    type="text"
                    name="cliente"
                    value={formData.cliente}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Nombre del cliente"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marca *
                  </label>
                  <input
                    type="text"
                    name="marca"
                    value={formData.marca}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Marca del producto"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado *
                  </label>
                  <select
                    name="estado"
                    value={formData.estado}
                    onChange={handleChange}
                    className="input-field"
                    required
                  >
                    <option value="en_reparacion">En Reparación</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SKU *
                  </label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Código SKU"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad *
                  </label>
                  <input
                    type="number"
                    name="cantidad"
                    value={formData.cantidad}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="1"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción *
                </label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Descripción del problema o garantía"
                  rows={3}
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
                  disabled={submitting}
                >
                  {submitting ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de garantías */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Historial de Garantías
            </h3>
            {filteredGarantias.length > 0 && (
              <span className="text-sm text-gray-500">
                Página {currentPage} de {totalPages} ({filteredGarantias.length} registros)
              </span>
            )}
          </div>
          {filteredGarantias.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {searchTerm ? 'No se encontraron registros que coincidan con la búsqueda' : 'No hay registros de garantías'}
            </p>
          ) : (
            <>
              {/* Vista de tarjetas para móvil */}
              <div className="block lg:hidden space-y-4 p-4">
                {getCurrentPageGarantias().map((garantia) => (
                  <div 
                    key={garantia.id} 
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleShowDetails(garantia)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            garantia.estado === 'completada' ? 'bg-green-100 text-green-800' :
                            garantia.estado === 'en_reparacion' ? 'bg-blue-100 text-blue-800' :
                            garantia.estado === 'proceso_reembolso' ? 'bg-yellow-100 text-yellow-800' :
                            garantia.estado === 'proceso_reemplazo' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {garantia.estado.replace('_', ' ')}
                          </span>
                          <span className="text-sm text-gray-500">
                            {displayDateOnly(garantia.fechaRegistro)}
                          </span>
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 mb-1">
                          {garantia.cliente}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {garantia.marca} - {garantia.sku} (Cant: {garantia.cantidad})
                        </p>
                        <p className="text-xs text-gray-500">
                          Registrado por: {garantia.usuario?.nombre}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm text-gray-600">
                          {garantia.descripcion}
                        </p>
                        {garantia.fotoReciboEntrega && (
                          <div className="mt-2">
                            <img
                              src={garantia.fotoReciboEntrega}
                              alt="Recibo de entrega"
                              className="h-12 w-12 object-cover rounded border border-gray-300"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Botones de acción */}
                    <div className="mt-3 flex justify-end space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(garantia)
                        }}
                        className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Editar
                      </button>
                      {user.rol.nombre === 'Administrador' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(garantia)
                          }}
                          className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Vista de tabla para desktop */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Marca/SKU
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cantidad
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Foto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getCurrentPageGarantias().map((garantia) => (
                      <tr 
                        key={garantia.id}
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleShowDetails(garantia)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {displayDateOnly(garantia.fechaRegistro)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {garantia.cliente}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {garantia.marca} - {garantia.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {garantia.cantidad}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            garantia.estado === 'completada' ? 'bg-green-100 text-green-800' :
                            garantia.estado === 'en_reparacion' ? 'bg-blue-100 text-blue-800' :
                            garantia.estado === 'proceso_reembolso' ? 'bg-yellow-100 text-yellow-800' :
                            garantia.estado === 'proceso_reemplazo' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {garantia.estado.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {garantia.usuario?.nombre}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {garantia.fotoReciboEntrega ? (
                            <img
                              src={garantia.fotoReciboEntrega}
                              alt="Recibo de entrega"
                              className="h-8 w-8 object-cover rounded"
                            />
                          ) : (
                            <span className="text-gray-400">Sin foto</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEdit(garantia)
                              }}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Editar
                            </button>
                            {user.rol.nombre === 'Administrador' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDelete(garantia)
                                }}
                                className="text-red-600 hover:text-red-800 font-medium"
                              >
                                Eliminar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                      {Math.min((currentPage - 1) * itemsPerPage + 1, filteredGarantias.length)}
                    </span>{' '}
                    a{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, filteredGarantias.length)}
                    </span>{' '}
                    de{' '}
                    <span className="font-medium">{filteredGarantias.length}</span>{' '}
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
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
                    ))}
                    
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
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">{modalMessage}</p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="px-4 py-2 bg-green-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-300"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Error */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Error</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">{modalMessage}</p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={() => setShowErrorModal(false)}
                  className="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición */}
      {editingId && (() => {
        const garantia = garantias.find(g => g.id.toString() === editingId)
        if (!garantia) return null
        
        return (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Editar Garantía
                </h3>
                <form onSubmit={(e) => { e.preventDefault(); handleEditSubmit(editingId); }} className="space-y-4">
                  
                  {/* Información Básica */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Registro *
                      </label>
                      <input
                        type="date"
                        name="fechaRegistro"
                        value={editFormData.fechaRegistro || ''}
                        onChange={handleEditChange}
                        className="input-field"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cliente *
                      </label>
                      <input
                        type="text"
                        name="cliente"
                        value={editFormData.cliente || ''}
                        onChange={handleEditChange}
                        className="input-field"
                        placeholder="Nombre del cliente"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Marca *
                      </label>
                      <input
                        type="text"
                        name="marca"
                        value={editFormData.marca || ''}
                        onChange={handleEditChange}
                        className="input-field"
                        placeholder="Marca del producto"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SKU *
                      </label>
                      <input
                        type="text"
                        name="sku"
                        value={editFormData.sku || ''}
                        onChange={handleEditChange}
                        className="input-field"
                        placeholder="Código SKU"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cantidad *
                      </label>
                      <input
                        type="number"
                        name="cantidad"
                        value={editFormData.cantidad || ''}
                        onChange={handleEditChange}
                        className="input-field"
                        placeholder="1"
                        min="1"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estado *
                      </label>
                      <select
                        name="estado"
                        value={editFormData.estado || ''}
                        onChange={handleEditChange}
                        className="input-field"
                        required
                      >
                        <option value="en_reparacion">En Reparación</option>
                        <option value="proceso_reembolso">Proceso de Reembolso</option>
                        <option value="proceso_reemplazo">Proceso de Reemplazo</option>
                        <option value="cancelada">Cancelada</option>
                        <option value="completada">Completada</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción *
                    </label>
                    <textarea
                      name="descripcion"
                      value={editFormData.descripcion || ''}
                      onChange={handleEditChange}
                      className="input-field"
                      placeholder="Descripción del problema o garantía"
                      rows={3}
                      required
                    />
                  </div>







                  <div className="flex justify-end space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="btn-secondary"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={submitting}
                    >
                      {submitting ? 'Guardando...' : 'Actualizar Garantía'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal de Detalles */}
      {showDetailsModal && selectedGarantia && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-medium text-gray-900">
                  Detalles de la Garantía
                </h3>
                <button
                  onClick={handleCloseDetails}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Información Básica */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Información Básica</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha de Registro</label>
                    <p className="mt-1 text-sm text-gray-900">{displayDateOnly(selectedGarantia.fechaRegistro)}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cliente</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedGarantia.cliente}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Marca</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedGarantia.marca}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">SKU</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedGarantia.sku}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cantidad</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedGarantia.cantidad}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Estado</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                      selectedGarantia.estado === 'completada' ? 'bg-green-100 text-green-800' :
                      selectedGarantia.estado === 'en_reparacion' ? 'bg-blue-100 text-blue-800' :
                      selectedGarantia.estado === 'proceso_reembolso' ? 'bg-yellow-100 text-yellow-800' :
                      selectedGarantia.estado === 'proceso_reemplazo' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedGarantia.estado.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Información del Proceso */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Proceso de Garantía</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha de Envío a Proveedor</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedGarantia.fechaEntregaFabricante ? displayDateOnly(selectedGarantia.fechaEntregaFabricante) : 'No enviado'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha de Recibo de Proveedor</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedGarantia.fechaRegresoFabricante ? displayDateOnly(selectedGarantia.fechaRegresoFabricante) : 'No recibido'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha de Entrega a Cliente</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedGarantia.fechaEntregaCliente ? displayDateOnly(selectedGarantia.fechaEntregaCliente) : 'No entregado'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Registrado por</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedGarantia.usuario?.nombre}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sucursal</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedGarantia.sucursal?.nombre}</p>
                  </div>
                </div>
              </div>

              {/* Descripción y Comentarios */}
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Descripción</label>
                  <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                    {selectedGarantia.descripcion}
                  </p>
                </div>

                {selectedGarantia.comentarios && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Comentarios</label>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                      {selectedGarantia.comentarios}
                    </p>
                  </div>
                )}
              </div>

              {/* Foto del Recibo */}
              {selectedGarantia.fotoReciboEntrega && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Foto del Recibo de Entrega</label>
                  <div className="flex justify-center">
                    <img
                      src={selectedGarantia.fotoReciboEntrega}
                      alt="Recibo de entrega"
                      className="max-w-full h-auto max-h-96 object-contain rounded-lg border border-gray-300"
                    />
                  </div>
                </div>
              )}

              {/* Botones de Acción */}
              <div className="mt-6 flex justify-end space-x-4">
                <button
                  onClick={handleCloseDetails}
                  className="btn-secondary"
                >
                  Cerrar
                </button>
                {getActionButton(selectedGarantia).action !== 'completado' && (
                  <button
                    onClick={() => {
                      handleCloseDetails()
                      handleEdit(selectedGarantia)
                    }}
                    className="btn-primary"
                  >
                    {getActionButton(selectedGarantia).text}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && garantiaToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Confirmar Eliminación
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              ¿Estás seguro que deseas eliminar la garantía de {garantiaToDelete.cliente} para el producto {garantiaToDelete.marca} - {garantiaToDelete.sku}? 
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setGarantiaToDelete(null)
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
