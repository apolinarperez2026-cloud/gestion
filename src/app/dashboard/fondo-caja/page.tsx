'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthUser } from '@/types/database'
import UploadThing from '@/components/UploadThing'
import SuccessModal from '@/components/SuccessModal'
import NotificationModal from '@/components/NotificationModal'
import { displayDateOnly } from '@/lib/dateUtils'

interface FondoCaja {
  id: number
  monto: number
  fecha: string
  imagen?: string
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

export default function FondoCajaPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [fondosCaja, setFondosCaja] = useState<FondoCaja[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    imagen: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
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

  const fetchFondosCaja = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/fondo-caja', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setFondosCaja(data.fondosCaja)
      }
    } catch (error) {
      console.error('Error al obtener depósitos de caja:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
    fetchFondosCaja()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/fondo-caja', {
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
          fecha: new Date().toISOString().split('T')[0],
          imagen: ''
        })
        setShowForm(false)
        fetchFondosCaja()
        setShowSuccessModal(true)
      } else {
        const error = await response.json()
        setErrorMessage(error.error || 'Error al crear depósito de caja')
        setShowErrorModal(true)
      }
    } catch (error) {
      console.error('Error al crear depósito:', error)
      setErrorMessage('Error al crear depósito de caja')
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {user.sucursal ? user.sucursal.nombre : 'Libro Diario'}
              </h1>
              <p className="text-sm text-gray-600">Depósitos de Caja</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.nombre}</p>
                <p className="text-xs text-gray-500">{user.rol.nombre}</p>
                {user.sucursal && (
                  <p className="text-xs text-blue-600 font-medium">
                    📍 {user.sucursal.nombre}
                  </p>
                )}
              </div>
              <button
                onClick={() => router.push('/dashboard')}
                className="btn-secondary text-sm"
              >
                Volver al Dashboard
              </button>
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
        {/* Botón para agregar nuevo depósito */}
        <div className="mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? 'Cancelar' : 'Nuevo Depósito de Caja'}
          </button>
        </div>

        {/* Formulario para nuevo depósito */}
        {showForm && (
          <div className="card mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Nuevo Depósito de Caja
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                    className="input"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comprobante (Opcional)
                </label>
                <UploadThing
                  onUploadComplete={(url) => {
                    setFormData({ ...formData, imagen: url })
                  }}
                  onUploadError={(error: Error) => {
                    console.error('Error al subir imagen:', error)
                    setErrorMessage('Error al subir la imagen: ' + error.message)
                    setShowErrorModal(true)
                  }}
                />
                {formData.imagen && (
                  <div className="mt-2">
                    <p className="text-sm text-green-600 mb-2">✓ Imagen subida correctamente</p>
                    <img 
                      src={formData.imagen} 
                      alt="Comprobante" 
                      className="w-32 h-32 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => window.open(formData.imagen, '_blank')}
                    />
                    <p className="text-xs text-gray-500 mt-1">Haz clic para ver en tamaño completo</p>
                  </div>
                )}
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                >
                  {submitting ? 'Guardando...' : 'Guardar Depósito'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de depósitos */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Depósitos de Caja Registrados
          </h2>
          
          {fondosCaja.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No hay depósitos de caja registrados
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
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comprobante
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registrado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fondosCaja.map((fondo) => (
                    <tr key={fondo.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {displayDateOnly(fondo.fecha)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        ${fondo.monto.toLocaleString()}
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {fondo.imagen ? (
                          <img 
                            src={fondo.imagen} 
                            alt="Comprobante" 
                            className="w-16 h-16 object-cover rounded border cursor-pointer"
                            onClick={() => window.open(fondo.imagen, '_blank')}
                          />
                        ) : (
                          <span className="text-gray-400">Sin comprobante</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {displayDateOnly(fondo.createdAt)}
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
        title="¡Depósito Creado!"
        message="El depósito de caja se ha registrado exitosamente con todos los datos y el comprobante."
        buttonText="Continuar"
      />

      {/* Modal de error */}
      <NotificationModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Error"
        message={errorMessage}
        type="error"
      />
    </div>
  )
}
