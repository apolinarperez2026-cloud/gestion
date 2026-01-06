'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthUser } from '@/types/database'
import SuccessModal from '@/components/SuccessModal'
import NotificationModal from '@/components/NotificationModal'
import { displayDateOnly } from '@/lib/dateUtils'

interface FondoCajaInicial {
  id: number
  monto: number
  fecha: string
  sucursal: {
    id: number
    nombre: string
  }
  usuario?: {
    id: number
    nombre: string
    rol: {
      nombre: string
    }
  }
  createdAt: string
}

export default function FondoCajaInicialPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [fondosCajaInicial, setFondosCajaInicial] = useState<FondoCajaInicial[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    monto: '',
    fecha: new Date().toISOString().split('T')[0]
  })
  const [submitting, setSubmitting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [editingFondo, setEditingFondo] = useState<FondoCajaInicial | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [fondoToDelete, setFondoToDelete] = useState<FondoCajaInicial | null>(null)
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
      } else {
        router.push('/auth/login')
      }
    } catch (error) {
      router.push('/auth/login')
    }
  }

  const fetchFondosCajaInicial = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/fondo-caja-inicial', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setFondosCajaInicial(data.fondosCajaInicial || [])
      } else if (response.status === 401) {
        router.push('/auth/login')
      }
    } catch (error) {
      console.error('Error al obtener fondos de caja iniciales:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
    fetchFondosCajaInicial()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/fondo-caja-inicial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setFormData({
          monto: '',
          fecha: new Date().toISOString().split('T')[0]
        })
        setShowForm(false)
        fetchFondosCajaInicial()
        setShowSuccessModal(true)
      } else {
        const error = await response.json()
        setErrorMessage(error.error || 'Error al crear fondo de caja inicial')
        setShowErrorModal(true)
      }
    } catch (error) {
      console.error('Error al crear fondo de caja inicial:', error)
      setErrorMessage('Error al crear fondo de caja inicial')
      setShowErrorModal(true)
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleEdit = (fondo: FondoCajaInicial) => {
    setEditingFondo(fondo)
    setIsEditing(true)
    setFormData({
      monto: fondo.monto.toString(),
      fecha: new Date(fondo.fecha).toISOString().split('T')[0]
    })
    setShowForm(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingFondo) return

    setSubmitting(true)

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/fondo-caja-inicial/${editingFondo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          monto: parseFloat(formData.monto),
          fecha: formData.fecha
        })
      })

      if (response.ok) {
        setFormData({
          monto: '',
          fecha: new Date().toISOString().split('T')[0]
        })
        setShowForm(false)
        setIsEditing(false)
        setEditingFondo(null)
        fetchFondosCajaInicial()
        setShowSuccessModal(true)
      } else {
        const error = await response.json()
        setErrorMessage(error.error || 'Error al actualizar fondo de caja inicial')
        setShowErrorModal(true)
      }
    } catch (error) {
      console.error('Error al actualizar fondo:', error)
      setErrorMessage('Error al actualizar fondo de caja inicial')
      setShowErrorModal(true)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditingFondo(null)
    setFormData({
      monto: '',
      fecha: new Date().toISOString().split('T')[0]
    })
    setShowForm(false)
  }

  const handleDelete = (fondo: FondoCajaInicial) => {
    setFondoToDelete(fondo)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!fondoToDelete) return

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/fondo-caja-inicial/${fondoToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        fetchFondosCajaInicial()
        setShowDeleteModal(false)
        setFondoToDelete(null)
        setShowSuccessModal(true)
      } else {
        const error = await response.json()
        setErrorMessage(error.error || 'Error al eliminar fondo de caja inicial')
        setShowErrorModal(true)
        setShowDeleteModal(false)
        setFondoToDelete(null)
      }
    } catch (error) {
      console.error('Error al eliminar fondo:', error)
      setErrorMessage('Error al eliminar fondo de caja inicial')
      setShowErrorModal(true)
      setShowDeleteModal(false)
      setFondoToDelete(null)
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
                  {user.sucursal ? user.sucursal.nombre : 'Libro Diario'}
                </h1>
                <p className="text-sm text-gray-600">Fondo de Caja Inicial</p>
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
        {/* Botón para agregar nuevo fondo inicial */}
        <div className="mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? 'Cancelar' : 'Nuevo Fondo de Caja Inicial'}
          </button>
        </div>

        {/* Formulario para nuevo fondo inicial */}
        {showForm && (
          <div className="card mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {isEditing ? 'Editar Fondo de Caja Inicial' : 'Nuevo Fondo de Caja Inicial'}
            </h2>
            <form onSubmit={isEditing ? handleUpdate : handleSubmit} className="space-y-4">
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
                    Monto Inicial *
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
                  onClick={isEditing ? handleCancelEdit : () => setShowForm(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting}
                >
                  {submitting ? (isEditing ? 'Actualizando...' : 'Guardando...') : (isEditing ? 'Actualizar Fondo' : 'Guardar Fondo Inicial')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de fondos iniciales */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Fondos de Caja Iniciales Registrados
          </h2>
          
          {fondosCajaInicial.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No hay fondos de caja iniciales registrados
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registrado por
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha de Registro
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fondosCajaInicial.map((fondo) => (
                    <tr key={fondo.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {displayDateOnly(fondo.fecha)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        ${fondo.monto.toLocaleString('en-US')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {fondo.usuario ? (
                          <div>
                            <div className="font-medium">{fondo.usuario.nombre}</div>
                            <div className="text-xs text-gray-500">{fondo.usuario.rol.nombre}</div>
                          </div>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {displayDateOnly(fondo.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(fondo)}
                            className="text-blue-600 hover:text-blue-900 font-medium"
                          >
                            Editar
                          </button>
                          {user.rol.nombre === 'Administrador' && (
                            <button
                              onClick={() => handleDelete(fondo)}
                              className="text-red-600 hover:text-red-900 font-medium"
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
          )}
        </div>
      </main>

      {/* Modal de éxito */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={isEditing ? "¡Fondo Inicial Actualizado!" : "¡Fondo Inicial Eliminado!"}
        message={
          isEditing 
            ? "El fondo de caja inicial se ha actualizado exitosamente."
            : "El fondo de caja inicial se ha eliminado exitosamente."
        }
      />

      {/* Modal de error */}
      <NotificationModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        type="error"
        title="Error"
        message={errorMessage}
      />

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && fondoToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Confirmar Eliminación
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              ¿Estás seguro que deseas eliminar el fondo de caja inicial de ${fondoToDelete.monto.toLocaleString('en-US')} del {displayDateOnly(fondoToDelete.fecha)}? 
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setFondoToDelete(null)
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
