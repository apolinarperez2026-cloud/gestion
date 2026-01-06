'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthUser } from '@/types/database'
import { displayDateOnly } from '@/lib/dateUtils'

interface MercaderiaData {
  fecha: string
  tipo: 'entrada' | 'salida'
  referencia: string
  entrega: string
  recibe: string
  monto: number | string
}

export default function MercaderiasPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<MercaderiaData>({
    fecha: new Date().toISOString().split('T')[0],
    tipo: 'entrada',
    referencia: '',
    entrega: '',
    recibe: '',
    monto: ''
  })
  const [mercaderias, setMercaderias] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [modalMessage, setModalMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [mercaderiaToDelete, setMercaderiaToDelete] = useState<any>(null)
  const [editFormData, setEditFormData] = useState<MercaderiaData>({
    fecha: '',
    tipo: 'entrada',
    referencia: '',
    entrega: '',
    recibe: '',
    monto: ''
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
        // Establecer el nombre del usuario logueado en el campo "recibe"
        setFormData(prev => ({
          ...prev,
          recibe: userData.user.nombre
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

  const fetchMercaderias = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/mercaderias', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setMercaderias(data.mercaderias || [])
      }
    } catch (error) {
      console.error('Error al cargar mercaderías:', error)
    }
  }

  useEffect(() => {
    fetchUser()
    fetchMercaderias()
  }, [])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch('/api/mercaderias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          monto: typeof formData.monto === 'string' ? (parseFloat(formData.monto) || 0) : formData.monto
        })
      })

      if (response.ok) {
        setFormData({
          fecha: new Date().toISOString().split('T')[0],
          tipo: 'entrada',
          referencia: '',
          entrega: '',
          recibe: user?.nombre || '',
          monto: ''
        })
        setShowForm(false)
        fetchMercaderias()
        setModalMessage('Mercadería registrada exitosamente')
        setShowSuccessModal(true)
      } else {
        const error = await response.json()
        setModalMessage(`Error: ${error.message || 'Error al registrar mercadería'}`)
        setShowErrorModal(true)
      }
    } catch (error) {
      console.error('Error:', error)
      setModalMessage('Error al registrar mercadería')
      setShowErrorModal(true)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (mercaderia: any) => {
    setEditingId(mercaderia.id)
    setEditFormData({
      fecha: new Date(mercaderia.fecha).toISOString().split('T')[0],
      tipo: mercaderia.tipo,
      referencia: mercaderia.referencia,
      entrega: mercaderia.entrega,
      recibe: mercaderia.recibe,
      monto: mercaderia.monto.toString()
    })
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    if (name === 'monto') {
      // Solo permitir números, punto decimal y cadena vacía
      const numericValue = value.replace(/[^0-9.]/g, '')
      // Evitar múltiples puntos decimales
      const parts = numericValue.split('.')
      const validValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericValue
      
      setEditFormData(prev => ({
        ...prev,
        [name]: validValue === '' ? '' : validValue
      }))
    } else {
      setEditFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch('/api/mercaderias', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: editingId,
          ...editFormData,
          monto: typeof editFormData.monto === 'string' ? (parseFloat(editFormData.monto) || 0) : editFormData.monto
        })
      })

      if (response.ok) {
        setEditingId(null)
        setEditFormData({
          fecha: '',
          tipo: 'entrada',
          referencia: '',
          entrega: '',
          recibe: '',
          monto: ''
        })
        fetchMercaderias()
        setModalMessage('Mercadería actualizada exitosamente')
        setShowSuccessModal(true)
      } else {
        const error = await response.json()
        setModalMessage(`Error: ${error.message || 'Error al actualizar mercadería'}`)
        setShowErrorModal(true)
      }
    } catch (error) {
      console.error('Error:', error)
      setModalMessage('Error al actualizar mercadería')
      setShowErrorModal(true)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditFormData({
      fecha: '',
      tipo: 'entrada',
      referencia: '',
      entrega: '',
      recibe: '',
      monto: ''
    })
  }

  const handleDelete = (mercaderia: any) => {
    setMercaderiaToDelete(mercaderia)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!mercaderiaToDelete) return

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/mercaderias/${mercaderiaToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        fetchMercaderias()
        setShowDeleteModal(false)
        setMercaderiaToDelete(null)
        setModalMessage('Mercadería eliminada exitosamente')
        setShowSuccessModal(true)
      } else {
        const error = await response.json()
        setModalMessage(`Error: ${error.error || 'Error al eliminar mercadería'}`)
        setShowErrorModal(true)
        setShowDeleteModal(false)
        setMercaderiaToDelete(null)
      }
    } catch (error) {
      console.error('Error al eliminar mercadería:', error)
      setModalMessage('Error al eliminar mercadería')
      setShowErrorModal(true)
      setShowDeleteModal(false)
      setMercaderiaToDelete(null)
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

  // Función para filtrar mercaderías
  const filteredMercaderias = mercaderias.filter(mercaderia =>
    mercaderia.referencia.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mercaderia.entrega.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mercaderia.recibe.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mercaderia.tipo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Función para obtener mercaderías de la página actual
  const getCurrentPageMercaderias = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredMercaderias.slice(startIndex, endIndex)
  }

  // Función para calcular el número total de páginas
  const totalPages = Math.ceil(filteredMercaderias.length / itemsPerPage)

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
                  Mercaderías
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
        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Total Entradas</h3>
                <p className="text-2xl font-bold text-green-600">
                  ${filteredMercaderias.filter(m => m.tipo === 'entrada').reduce((sum, m) => sum + m.monto, 0).toLocaleString('en-US')}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Total Salidas</h3>
                <p className="text-2xl font-bold text-red-600">
                  ${filteredMercaderias.filter(m => m.tipo === 'salida').reduce((sum, m) => sum + m.monto, 0).toLocaleString('en-US')}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Balance</h3>
                <p className={`text-2xl font-bold ${
                  (filteredMercaderias.filter(m => m.tipo === 'entrada').reduce((sum, m) => sum + m.monto, 0) - 
                   filteredMercaderias.filter(m => m.tipo === 'salida').reduce((sum, m) => sum + m.monto, 0)) >= 0 
                    ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${(filteredMercaderias.filter(m => m.tipo === 'entrada').reduce((sum, m) => sum + m.monto, 0) - 
                     filteredMercaderias.filter(m => m.tipo === 'salida').reduce((sum, m) => sum + m.monto, 0)).toLocaleString('en-US')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Botón para agregar mercadería */}
        <div className="mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? 'Cancelar' : '+ Nueva Entrada/Salida'}
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
              value={searchTerm}
              onChange={handleSearch}
              className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Buscar por referencia, entrega, recibe o tipo..."
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

        {/* Formulario */}
        {showForm && (
          <div className="card mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Registrar Entrada/Salida de Mercadería
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    name="fecha"
                    value={formData.fecha}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleChange}
                    className="input-field"
                    required
                  >
                    <option value="entrada">Entrada</option>
                    <option value="salida">Salida</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Referencia/ODOO *
                  </label>
                  <input
                    type="text"
                    name="referencia"
                    value={formData.referencia}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Número de referencia o ODOO"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Entrega *
                  </label>
                  <input
                    type="text"
                    name="entrega"
                    value={formData.entrega}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Nombre de quien entrega"
                    required
                  />
                </div>


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto *
                  </label>
                  <input
                    type="text"
                    name="monto"
                    value={formData.monto === '' ? '' : formData.monto}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                    className="input-field"
                    placeholder="0.00"
                    required
                  />
                </div>
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

        {/* Lista de mercaderías */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Historial de Entradas/Salidas
            </h3>
            {filteredMercaderias.length > 0 && (
              <span className="text-sm text-gray-500">
                Página {currentPage} de {totalPages} ({filteredMercaderias.length} registros)
              </span>
            )}
          </div>
          {filteredMercaderias.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {searchTerm ? 'No se encontraron registros que coincidan con la búsqueda' : 'No hay registros de mercaderías'}
            </p>
          ) : (
            <>
              {/* Vista de tarjetas para móvil */}
              <div className="block lg:hidden space-y-4 p-4">
                {getCurrentPageMercaderias().map((mercaderia) => (
                  <div 
                    key={mercaderia.id} 
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
                  >
                    {editingId === mercaderia.id ? (
                      // Formulario de edición
                      <form onSubmit={handleEditSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Fecha</label>
                            <input
                              type="date"
                              name="fecha"
                              value={editFormData.fecha}
                              onChange={handleEditChange}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                            <select
                              name="tipo"
                              value={editFormData.tipo}
                              onChange={handleEditChange}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              required
                            >
                              <option value="entrada">Entrada</option>
                              <option value="salida">Salida</option>
                            </select>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Referencia</label>
                          <input
                            type="text"
                            name="referencia"
                            value={editFormData.referencia}
                            onChange={handleEditChange}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            required
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Entrega</label>
                            <input
                              type="text"
                              name="entrega"
                              value={editFormData.entrega}
                              onChange={handleEditChange}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Recibe</label>
                            <input
                              type="text"
                              name="recibe"
                              value={editFormData.recibe}
                              onChange={handleEditChange}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                              required
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Monto</label>
                          <input
                            type="text"
                            name="monto"
                            value={editFormData.monto}
                            onChange={handleEditChange}
                            onKeyPress={handleKeyPress}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            required
                          />
                        </div>
                        
                        <div className="flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={submitting}
                            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                          >
                            {submitting ? 'Guardando...' : 'Guardar'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      // Vista normal
                      <>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                mercaderia.tipo === 'entrada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {mercaderia.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                              </span>
                              <span className="text-sm text-gray-500">
                                {displayDateOnly(mercaderia.fecha)}
                              </span>
                            </div>
                            <h3 className="text-sm font-medium text-gray-900 mb-1">
                              Ref: {mercaderia.referencia}
                            </h3>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-lg font-bold text-blue-600">
                              ${mercaderia.monto.toLocaleString('en-US')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Entrega</p>
                            <p className="text-sm font-medium text-gray-900">
                              {mercaderia.entrega}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Recibe</p>
                            <p className="text-sm font-medium text-gray-900">
                              {mercaderia.recibe}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex justify-end mt-3 pt-3 border-t border-gray-200">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(mercaderia)}
                              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                              Editar
                            </button>
                            {user.rol.nombre === 'Administrador' && (
                              <button
                                onClick={() => handleDelete(mercaderia)}
                                className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                              >
                                Eliminar
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
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
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Referencia
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entrega
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recibe
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getCurrentPageMercaderias().map((mercaderia) => (
                      <tr key={mercaderia.id}>
                        {editingId === mercaderia.id ? (
                          // Fila de edición
                          <>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="date"
                                name="fecha"
                                value={editFormData.fecha}
                                onChange={handleEditChange}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                required
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                name="tipo"
                                value={editFormData.tipo}
                                onChange={handleEditChange}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                required
                              >
                                <option value="entrada">Entrada</option>
                                <option value="salida">Salida</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="text"
                                name="referencia"
                                value={editFormData.referencia}
                                onChange={handleEditChange}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                required
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="text"
                                name="entrega"
                                value={editFormData.entrega}
                                onChange={handleEditChange}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                required
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="text"
                                name="recibe"
                                value={editFormData.recibe}
                                onChange={handleEditChange}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                required
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="text"
                                name="monto"
                                value={editFormData.monto}
                                onChange={handleEditChange}
                                onKeyPress={handleKeyPress}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                required
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={handleEditSubmit}
                                  disabled={submitting}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                >
                                  {submitting ? 'Guardando...' : 'Guardar'}
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="text-gray-600 hover:text-gray-900"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          // Fila normal
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {displayDateOnly(mercaderia.fecha)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                mercaderia.tipo === 'entrada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {mercaderia.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {mercaderia.referencia}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {mercaderia.entrega}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {mercaderia.recibe}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                              ${mercaderia.monto.toLocaleString('en-US')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEdit(mercaderia)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Editar
                                </button>
                                {user.rol.nombre === 'Administrador' && (
                                  <button
                                    onClick={() => handleDelete(mercaderia)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    Eliminar
                                  </button>
                                )}
                              </div>
                            </td>
                          </>
                        )}
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
                      {Math.min((currentPage - 1) * itemsPerPage + 1, filteredMercaderias.length)}
                    </span>{' '}
                    a{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, filteredMercaderias.length)}
                    </span>{' '}
                    de{' '}
                    <span className="font-medium">{filteredMercaderias.length}</span>{' '}
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

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && mercaderiaToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Confirmar Eliminación
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              ¿Estás seguro que deseas eliminar esta mercadería de {mercaderiaToDelete.tipo} por ${mercaderiaToDelete.monto.toLocaleString('en-US')}? 
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setMercaderiaToDelete(null)
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
