'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthUser } from '@/types/database'
import UploadThingComponent from '@/components/UploadThing'
import { displayDateOnly } from '@/lib/dateUtils'

interface TpvData {
  fecha: string
  quienCobro: string
  monto: number | string
  estado: 'exitoso' | 'en_proceso'
  foto: string
  usuarioRegistro: string
}

export default function TpvPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<TpvData>({
    fecha: new Date().toISOString().split('T')[0],
    quienCobro: '',
    monto: '',
    estado: 'exitoso',
    foto: '',
    usuarioRegistro: ''
  })
  const [tpvs, setTpvs] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [modalMessage, setModalMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedTpv, setSelectedTpv] = useState<any>(null)
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

  const fetchTpvs = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/tpv', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTpvs(data.tpvs || [])
      }
    } catch (error) {
      console.error('Error al cargar TPVs:', error)
    }
  }

  useEffect(() => {
    fetchUser()
    fetchTpvs()
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

  const handleImageUploadComplete = (url: string) => {
    setFormData(prev => ({
      ...prev,
      foto: url
    }))
  }

  const handleImageUploadError = (error: Error) => {
    console.error('Error al subir imagen:', error)
    setModalMessage('Error al subir la imagen')
    setShowErrorModal(true)
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

      const response = await fetch('/api/tpv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          monto: typeof formData.monto === 'string' ? parseFloat(formData.monto) || 0 : formData.monto
        })
      })

      if (response.ok) {
        setFormData({
          fecha: new Date().toISOString().split('T')[0],
          quienCobro: '',
          monto: '',
          estado: 'exitoso',
          foto: '',
          usuarioRegistro: user?.nombre || ''
        })
        setShowForm(false)
        fetchTpvs()
        setModalMessage('Cobro TPV registrado exitosamente')
        setShowSuccessModal(true)
      } else {
        const error = await response.json()
        setModalMessage(`Error: ${error.message || 'Error al registrar cobro TPV'}`)
        setShowErrorModal(true)
      }
    } catch (error) {
      console.error('Error:', error)
      setModalMessage('Error al registrar cobro TPV')
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

  // Función para filtrar TPVs
  const filteredTpvs = tpvs.filter(tpv =>
    tpv.quienCobro.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tpv.usuarioRegistro.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tpv.estado.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Función para obtener TPVs de la página actual
  const getCurrentPageTpvs = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredTpvs.slice(startIndex, endIndex)
  }

  // Función para calcular el número total de páginas
  const totalPages = Math.ceil(filteredTpvs.length / itemsPerPage)

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

  const handleRowClick = (tpv: any) => {
    setSelectedTpv(tpv)
    setShowDetailsModal(true)
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
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
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
                  Cobros TPV
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
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Botón para agregar cobro TPV */}
        <div className="mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? 'Cancelar' : '+ Nuevo Cobro TPV'}
          </button>
        </div>


        {/* Formulario */}
        {showForm && (
          <div className="card mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Registrar Nuevo Cobro TPV
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
                    Quien Cobró *
                  </label>
                  <input
                    type="text"
                    name="quienCobro"
                    value={formData.quienCobro}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Nombre de quien cobró"
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
                    <option value="exitoso">Exitoso</option>
                    <option value="en_proceso">En Proceso</option>
                  </select>
                </div>
              </div>

              {/* Campo de imagen */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Foto (Opcional)
                </label>
                <div className="space-y-3">
                  <UploadThingComponent
                    onUploadComplete={handleImageUploadComplete}
                    onUploadError={handleImageUploadError}
                  />
                  {formData.foto && (
                    <div className="mt-2">
                      <img
                        src={formData.foto}
                        alt="Foto de cobro TPV"
                        className="h-32 w-32 object-cover rounded-lg border"
                      />
                    </div>
                  )}
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

        {/* Lista de TPVs */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Historial de Cobros TPV
            </h3>
            {filteredTpvs.length > 0 && (
              <span className="text-sm text-gray-500">
                Página {currentPage} de {totalPages} ({filteredTpvs.length} registros)
              </span>
            )}
          </div>

          {/* Barra de búsqueda */}
          <div className="mb-4">
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
                placeholder="Buscar por quien cobró, usuario o estado..."
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
          {filteredTpvs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {searchTerm ? 'No se encontraron registros que coincidan con la búsqueda' : 'No hay registros de cobros TPV'}
            </p>
          ) : (
            <>
              {/* Vista de tarjetas para móvil */}
              <div className="block lg:hidden space-y-4 p-4">
                {getCurrentPageTpvs().map((tpv) => (
                  <div 
                    key={tpv.id} 
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleRowClick(tpv)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            tpv.estado === 'exitoso' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {tpv.estado === 'en_proceso' ? 'En Proceso' : 'Exitoso'}
                          </span>
                          <span className="text-sm text-gray-500">
                            {displayDateOnly(tpv.fecha)}
                          </span>
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 mb-1">
                          {tpv.quienCobro}
                        </h3>
                        <p className="text-xs text-gray-500">
                          Registrado por: {tpv.usuarioRegistro}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-lg font-bold text-blue-600">
                          ${tpv.monto.toLocaleString()}
                        </p>
                        {tpv.foto && (
                          <div className="mt-2">
                            <img
                              src={tpv.foto}
                              alt="Foto de cobro TPV"
                              className="h-12 w-12 object-cover rounded border border-gray-300"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-center pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-400">
                        Toca para ver detalles
                      </p>
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
                        Quien Cobró
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuario Registro
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Foto
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getCurrentPageTpvs().map((tpv) => (
                      <tr 
                        key={tpv.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleRowClick(tpv)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {displayDateOnly(tpv.fecha)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {tpv.quienCobro}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          ${tpv.monto.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            tpv.estado === 'exitoso' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {tpv.estado === 'en_proceso' ? 'En Proceso' : 'Exitoso'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {tpv.usuarioRegistro}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {tpv.foto ? (
                            <img
                              src={tpv.foto}
                              alt="Foto de cobro TPV"
                              className="h-8 w-8 object-cover rounded"
                            />
                          ) : (
                            <span className="text-gray-400">Sin foto</span>
                          )}
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
                      {Math.min((currentPage - 1) * itemsPerPage + 1, filteredTpvs.length)}
                    </span>{' '}
                    a{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, filteredTpvs.length)}
                    </span>{' '}
                    de{' '}
                    <span className="font-medium">{filteredTpvs.length}</span>{' '}
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

      {/* Modal de detalles del cobro TPV */}
      {showDetailsModal && selectedTpv && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Detalles del Cobro TPV</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Información básica */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {displayDateOnly(selectedTpv.fecha)}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Monto</label>
                    <p className="mt-1 text-sm font-bold text-blue-600">
                      ${selectedTpv.monto.toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quien Cobró</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedTpv.quienCobro}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Estado</label>
                    <p className="mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedTpv.estado === 'exitoso' ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedTpv.estado === 'en_proceso' ? 'En Proceso' : 'Exitoso'}
                      </span>
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Registrado por</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedTpv.usuarioRegistro}
                    </p>
                  </div>
                </div>
                
                {/* Imagen */}
                {selectedTpv.foto && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Comprobante</label>
                    <div className="flex justify-center">
                      <img
                        src={selectedTpv.foto}
                        alt="Comprobante del cobro TPV"
                        className="max-w-full h-auto max-h-96 object-contain rounded-lg border border-gray-300"
                      />
                    </div>
                  </div>
                )}
                
                {/* Información adicional */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha de Creación</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedTpv.createdAt).toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Última Actualización</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedTpv.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Cerrar
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
    </div>
  )
}
