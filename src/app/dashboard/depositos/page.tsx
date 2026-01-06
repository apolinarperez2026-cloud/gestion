'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthUser } from '@/types/database'
import UploadThing from '@/components/UploadThing'
import SuccessModal from '@/components/SuccessModal'
import NotificationModal from '@/components/NotificationModal'
import { displayDateOnly } from '@/lib/dateUtils'

interface Deposito {
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

export default function DepositosPage() {
  // Estado para borrar
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Estado para editar
  const [editId, setEditId] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    monto: '',
    fecha: '',
    imagen: ''
  });

  // Estado para modal de detalles
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDeposito, setSelectedDeposito] = useState<Deposito | null>(null);

  // Abre el modal de confirmación y almacena el id
  const handleOpenDeleteModal = (id: number) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  // Abre el modal de edición
  const handleOpenEditModal = (deposito: Deposito) => {
    setEditId(deposito.id);
    setEditFormData({
      monto: deposito.monto.toString(),
      fecha: new Date(deposito.fecha).toISOString().split('T')[0],
      imagen: deposito.imagen || ''
    });
    setShowEditModal(true);
  };

  // Abre el modal de detalles
  const handleOpenDetailsModal = (deposito: Deposito) => {
    setSelectedDeposito(deposito);
    setShowDetailsModal(true);
  };

  // Realiza la edición
  const handleEditDeposito = async () => {
    if (!editId) return;
    const token = localStorage.getItem('token')
    if (!token) {
      setErrorMessage('No hay token de autenticación. Inicia sesión nuevamente.');
      setShowErrorModal(true);
      setShowEditModal(false);
      return;
    }
    try {
      const response = await fetch(`/api/depositos/${editId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editFormData)
      });
      if (response.ok) {
        fetchDepositos();
        setShowEditModal(false);
        setEditId(null);
        setEditFormData({ monto: '', fecha: '', imagen: '' });
        setShowSuccessModal(true);
      } else {
        const error = await response.json();
        setErrorMessage(error.error || 'No se pudo editar el depósito');
        setShowErrorModal(true);
      }
    } catch (error) {
      setErrorMessage('Error al editar depósito');
      setShowErrorModal(true);
    }
  };
  // Realiza el borrado luego de confirmar en modal
  const handleDeleteDeposito = async () => {
    if (!deleteId) return;
    const token = localStorage.getItem('token')
    if (!token) {
      setErrorMessage('No hay token de autenticación. Inicia sesión nuevamente.');
      setShowErrorModal(true);
      setShowDeleteModal(false);
      return;
    }
    try {
      const response = await fetch(`/api/depositos/${deleteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        fetchDepositos();
        setShowSuccessModal(true);
      } else {
        const error = await response.json();
        setErrorMessage(error.error || 'No se pudo eliminar el depósito');
        setShowErrorModal(true);
      }
    } catch (error) {
      setErrorMessage('Error al eliminar depósito');
      setShowErrorModal(true);
    } finally {
      setShowDeleteModal(false);
      setDeleteId(null);
    }
  }

  const [user, setUser] = useState<AuthUser | null>(null)
  const [depositos, setDepositos] = useState<Deposito[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })
  const [stats, setStats] = useState({
    totalMonto: 0,
    countDepositos: 0
  })
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

  // Función para calcular estadísticas
  const calculateStats = (depositos: Deposito[]) => {
    const totalMonto = depositos.reduce((sum, deposito) => sum + deposito.monto, 0)
    
    setStats({
      totalMonto,
      countDepositos: depositos.length
    })
  }

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

  const fetchDepositos = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/depositos?month=${selectedMonth}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setDepositos(data.depositos || [])
        calculateStats(data.depositos || [])
      }
    } catch (error) {
      console.error('Error al obtener depósitos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
    fetchDepositos()
  }, [selectedMonth])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/depositos', {
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
        fetchDepositos()
        setShowSuccessModal(true)
      } else {
        const error = await response.json()
        setErrorMessage(error.error || 'Error al crear depósito bancario')
        setShowErrorModal(true)
      }
    } catch (error) {
      console.error('Error al crear depósito:', error)
      setErrorMessage('Error al crear depósito bancario')
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
              <p className="text-sm text-gray-600">Depósitos Bancarios</p>
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
                }}
                className="input-field"
              />
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-primary h-fit mt-6"
            >
              {showForm ? 'Cancelar' : 'Nuevo Depósito Bancario'}
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total del Mes</p>
                <p className="text-2xl font-semibold text-green-600">${stats.totalMonto.toLocaleString('en-US')}</p>
              </div>
            </div>
          </div>

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
                <p className="text-sm font-medium text-gray-500">Cantidad de Depósitos</p>
                <p className="text-2xl font-semibold text-blue-600">{stats.countDepositos}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulario para nuevo depósito */}
        {showForm && (
          <div className="card mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Nuevo Depósito Bancario
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            Depósitos Bancarios Registrados
          </h2>
          
          {depositos.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No hay depósitos bancarios registrados
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {depositos.map((deposito) => (
                    <tr 
                      key={deposito.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleOpenDetailsModal(deposito)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {displayDateOnly(deposito.fecha)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        ${deposito.monto.toLocaleString('en-US')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {deposito.usuario ? (
                          <div>
                            <div className="font-medium">{deposito.usuario.nombre}</div>
                            <div className="text-xs text-gray-500">{deposito.usuario.rol.nombre}</div>
                          </div>
                        ) : (
                          'N/A'
                        )}
                      </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 flex items-center gap-3 min-w-[180px]">
                        {deposito.imagen ? (
                          <img 
                            src={deposito.imagen} 
                            alt="Comprobante" 
                            className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => handleOpenDetailsModal(deposito)}
                          />
                        ) : (
                          <span className="text-gray-400">Sin comprobante</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {displayDateOnly(deposito.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            className="bg-blue-600 hover:bg-blue-700 rounded-full text-white px-3 py-2 text-xs shadow transition-colors duration-150"
                            title="Editar depósito"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenEditModal(deposito)
                            }}
                          >
                            Editar
                          </button>
                          <button
                            className="bg-red-600 hover:bg-red-700 rounded-full text-white px-3 py-2 text-xs shadow transition-colors duration-150"
                            title="Eliminar depósito"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenDeleteModal(deposito.id)
                            }}
                          >
                            Borrar
                          </button>
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

      {/* Modal de detalles del depósito */}
      {showDetailsModal && selectedDeposito && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Detalles del Depósito Bancario</h3>
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
                    <label className="block text-sm font-medium text-gray-700">Fecha del Depósito</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {displayDateOnly(selectedDeposito.fecha)}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Monto</label>
                    <p className="mt-1 text-sm font-bold text-green-600">
                      ${selectedDeposito.monto.toLocaleString('en-US')}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sucursal</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedDeposito.sucursal.nombre}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Registrado por</label>
                    <div className="mt-1 text-sm text-gray-900">
                      {selectedDeposito.usuario ? (
                        <>
                          <div className="font-medium">{selectedDeposito.usuario.nombre}</div>
                          <div className="text-xs text-gray-500">{selectedDeposito.usuario.rol.nombre}</div>
                        </>
                      ) : (
                        'N/A'
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Imagen */}
                {selectedDeposito.imagen && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Comprobante del Depósito</label>
                    <div className="flex justify-center">
                      <img
                        src={selectedDeposito.imagen}
                        alt="Comprobante del depósito"
                        className="max-w-full h-auto max-h-96 object-contain rounded-lg border border-gray-300"
                      />
                    </div>
                  </div>
                )}
                
                {/* Información adicional */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha de Registro</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {displayDateOnly(selectedDeposito.createdAt)}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ID del Depósito</label>
                    <p className="mt-1 text-sm text-gray-900">
                      #{selectedDeposito.id}
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

      {/* Modal de edición */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full animate-fade-in">
            <h3 className="text-xl font-bold mb-6 text-gray-900">Editar Depósito</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha *
                </label>
                <input
                  type="date"
                  value={editFormData.fecha}
                  onChange={(e) => setEditFormData({ ...editFormData, fecha: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editFormData.monto}
                  onChange={(e) => setEditFormData({ ...editFormData, monto: e.target.value })}
                  className="input"
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comprobante (Opcional)
                </label>
                <UploadThing
                  onUploadComplete={(url) => {
                    setEditFormData({ ...editFormData, imagen: url })
                  }}
                  onUploadError={(error: Error) => {
                    console.error('Error al subir imagen:', error)
                    setErrorMessage('Error al subir la imagen: ' + error.message)
                    setShowErrorModal(true)
                  }}
                />
                {(editFormData.imagen) && (
                  <div className="mt-2">
                    <p className="text-sm text-green-600 mb-2">✓ Imagen actual</p>
                    <img 
                      src={editFormData.imagen} 
                      alt="Comprobante" 
                      className="w-24 h-24 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => window.open(editFormData.imagen, '_blank')}
                    />
                    <p className="text-xs text-gray-500 mt-1">Haz clic para ver en tamaño completo</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-4 justify-center mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditId(null)
                  setEditFormData({ monto: '', fecha: '', imagen: '' })
                }}
                className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded shadow text-gray-800"
              >Cancelar</button>
              <button
                onClick={handleEditDeposito}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow font-semibold focus:ring-2 focus:ring-blue-400"
              >Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal propio de confirmación de borrado */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full text-center animate-fade-in">
            <h3 className="text-xl font-bold mb-3 text-gray-900">¿Confirmar borrado?</h3>
            <p className="text-gray-700 mb-6">¿Estás seguro/a de que quieres eliminar este depósito? <br /> <span className="font-semibold text-red-600">Esta acción no se puede deshacer.</span></p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded shadow text-gray-800"
              >Cancelar</button>
              <button
                onClick={handleDeleteDeposito}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow font-semibold focus:ring-2 focus:ring-red-400"
              >Borrar definitivamente</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de éxito */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="¡Operación exitosa!"
        message="El depósito bancario se ha procesado correctamente."
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
