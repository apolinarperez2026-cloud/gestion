'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthUser, FormaDePago, TipoGasto } from '@/types/database'
import ConfirmModal from '@/components/ConfirmModal'
import SuccessModal from '@/components/SuccessModal'
import { useConfirmModal } from '@/hooks/useConfirmModal'
import { useSuccessModal } from '@/hooks/useSuccessModal'

export default function ConfiguracionPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [formasDePago, setFormasDePago] = useState<FormaDePago[]>([])
  const [tiposGasto, setTiposGasto] = useState<TipoGasto[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'formas-pago' | 'tipos-gasto'>('formas-pago')
  const { modalState, showConfirm, hideConfirm, handleConfirm } = useConfirmModal()
  const { modalState: successState, showSuccess, hideSuccess, handleClose } = useSuccessModal()
  
  // Estados para formularios...
  const [showFormaPagoForm, setShowFormaPagoForm] = useState(false)
  const [showTipoGastoForm, setShowTipoGastoForm] = useState(false)
  const [editingFormaPago, setEditingFormaPago] = useState<FormaDePago | null>(null)
  const [editingTipoGasto, setEditingTipoGasto] = useState<TipoGasto | null>(null)
  const [formaPagoNombre, setFormaPagoNombre] = useState('')
  const [tipoGastoNombre, setTipoGastoNombre] = useState('')
  
  const router = useRouter()

  useEffect(() => {
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
          fetchData()
        } else {
          router.push('/auth/login')
        }
      } catch (error) {
        router.push('/auth/login')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [router])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      // Fetch formas de pago
      const formasResponse = await fetch('/api/formas-pago', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (formasResponse.ok) {
        const formasData = await formasResponse.json()
        setFormasDePago(formasData.formasDePago || [])
      }

      // Fetch tipos de gasto
      const tiposResponse = await fetch('/api/tipos-gasto', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (tiposResponse.ok) {
        const tiposData = await tiposResponse.json()
        setTiposGasto(tiposData.tiposGasto || [])
      }
    } catch (error) {
      console.error('Error al cargar datos:', error)
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

  // Funciones para Formas de Pago
  const handleCreateFormaPago = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formaPagoNombre.trim()) {
      showConfirm({
        title: 'Campo Requerido',
        message: 'El nombre de la forma de pago es obligatorio.',
        confirmText: 'Aceptar',
        cancelText: '',
        type: 'warning',
        onConfirm: hideConfirm
      })
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/formas-pago', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nombre: formaPagoNombre.trim() })
      })

      if (response.ok) {
        showSuccess({
          title: 'Forma de Pago Creada',
          message: 'La forma de pago se ha creado exitosamente.',
          buttonText: 'Aceptar',
          onClose: () => {
            fetchData()
            setFormaPagoNombre('')
            setShowFormaPagoForm(false)
          }
        })
      } else {
        const error = await response.json()
        showConfirm({
          title: 'Error',
          message: error.error || 'Error al crear la forma de pago.',
          confirmText: 'Aceptar',
          cancelText: '',
          type: 'error',
          onConfirm: hideConfirm
        })
      }
    } catch (error) {
      console.error('Error al crear forma de pago:', error)
      showConfirm({
        title: 'Error de Conexión',
        message: 'No se pudo conectar con el servidor.',
        confirmText: 'Aceptar',
        cancelText: '',
        type: 'error',
        onConfirm: hideConfirm
      })
    }
  }

  const handleEditFormaPago = (formaPago: FormaDePago) => {
    setEditingFormaPago(formaPago)
    setFormaPagoNombre(formaPago.nombre)
    setShowFormaPagoForm(true)
  }

  const handleUpdateFormaPago = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingFormaPago || !formaPagoNombre.trim()) {
      showConfirm({
        title: 'Campo Requerido',
        message: 'El nombre de la forma de pago es obligatorio.',
        confirmText: 'Aceptar',
        cancelText: '',
        type: 'warning',
        onConfirm: hideConfirm
      })
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/formas-pago/${editingFormaPago.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nombre: formaPagoNombre.trim() })
      })

      if (response.ok) {
        showSuccess({
          title: 'Forma de Pago Actualizada',
          message: 'La forma de pago se ha actualizado exitosamente.',
          buttonText: 'Aceptar',
          onClose: () => {
            fetchData()
            setFormaPagoNombre('')
            setEditingFormaPago(null)
            setShowFormaPagoForm(false)
          }
        })
      } else {
        const error = await response.json()
        showConfirm({
          title: 'Error',
          message: error.error || 'Error al actualizar la forma de pago.',
          confirmText: 'Aceptar',
          cancelText: '',
          type: 'error',
          onConfirm: hideConfirm
        })
      }
    } catch (error) {
      console.error('Error al actualizar forma de pago:', error)
      showConfirm({
        title: 'Error de Conexión',
        message: 'No se pudo conectar con el servidor.',
        confirmText: 'Aceptar',
        cancelText: '',
        type: 'error',
        onConfirm: hideConfirm
      })
    }
  }

  const handleDeleteFormaPago = (formaPago: FormaDePago) => {
    showConfirm({
      title: 'Eliminar Forma de Pago',
      message: `¿Estás seguro de que quieres eliminar "${formaPago.nombre}"?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'warning',
      onConfirm: async () => {
        hideConfirm() // Cerrar el modal de confirmación primero
        try {
          const token = localStorage.getItem('token')
          if (!token) return

          const response = await fetch(`/api/formas-pago/${formaPago.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })

          if (response.ok) {
            showSuccess({
              title: 'Forma de Pago Eliminada',
              message: 'La forma de pago ha sido eliminada exitosamente.',
              buttonText: 'Aceptar',
              onClose: () => {
                fetchData()
              }
            })
          } else {
            showConfirm({
              title: 'Error',
              message: 'No se pudo eliminar la forma de pago.',
              confirmText: 'Aceptar',
              cancelText: '',
              type: 'error',
              onConfirm: hideConfirm
            })
          }
        } catch (error) {
          console.error('Error al eliminar forma de pago:', error)
          showConfirm({
            title: 'Error de Conexión',
            message: 'No se pudo conectar con el servidor.',
            confirmText: 'Aceptar',
            cancelText: '',
            type: 'error',
            onConfirm: hideConfirm
          })
        }
      }
    })
  }

  // Funciones para Tipos de Gasto
  const handleCreateTipoGasto = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!tipoGastoNombre.trim()) {
      showConfirm({
        title: 'Campo Requerido',
        message: 'El nombre del tipo de gasto es obligatorio.',
        confirmText: 'Aceptar',
        cancelText: '',
        type: 'warning',
        onConfirm: hideConfirm
      })
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/tipos-gasto', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nombre: tipoGastoNombre.trim() })
      })

      if (response.ok) {
        showSuccess({
          title: 'Tipo de Gasto Creado',
          message: 'El tipo de gasto se ha creado exitosamente.',
          buttonText: 'Aceptar',
          onClose: () => {
            fetchData()
            setTipoGastoNombre('')
            setShowTipoGastoForm(false)
          }
        })
      } else {
        const error = await response.json()
        showConfirm({
          title: 'Error',
          message: error.error || 'Error al crear el tipo de gasto.',
          confirmText: 'Aceptar',
          cancelText: '',
          type: 'error',
          onConfirm: hideConfirm
        })
      }
    } catch (error) {
      console.error('Error al crear tipo de gasto:', error)
      showConfirm({
        title: 'Error de Conexión',
        message: 'No se pudo conectar con el servidor.',
        confirmText: 'Aceptar',
        cancelText: '',
        type: 'error',
        onConfirm: hideConfirm
      })
    }
  }

  const handleEditTipoGasto = (tipoGasto: TipoGasto) => {
    setEditingTipoGasto(tipoGasto)
    setTipoGastoNombre(tipoGasto.nombre)
    setShowTipoGastoForm(true)
  }

  const handleUpdateTipoGasto = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingTipoGasto || !tipoGastoNombre.trim()) {
      showConfirm({
        title: 'Campo Requerido',
        message: 'El nombre del tipo de gasto es obligatorio.',
        confirmText: 'Aceptar',
        cancelText: '',
        type: 'warning',
        onConfirm: hideConfirm
      })
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/tipos-gasto/${editingTipoGasto.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nombre: tipoGastoNombre.trim() })
      })

      if (response.ok) {
        showSuccess({
          title: 'Tipo de Gasto Actualizado',
          message: 'El tipo de gasto se ha actualizado exitosamente.',
          buttonText: 'Aceptar',
          onClose: () => {
            fetchData()
            setTipoGastoNombre('')
            setEditingTipoGasto(null)
            setShowTipoGastoForm(false)
          }
        })
      } else {
        const error = await response.json()
        showConfirm({
          title: 'Error',
          message: error.error || 'Error al actualizar el tipo de gasto.',
          confirmText: 'Aceptar',
          cancelText: '',
          type: 'error',
          onConfirm: hideConfirm
        })
      }
    } catch (error) {
      console.error('Error al actualizar tipo de gasto:', error)
      showConfirm({
        title: 'Error de Conexión',
        message: 'No se pudo conectar con el servidor.',
        confirmText: 'Aceptar',
        cancelText: '',
        type: 'error',
        onConfirm: hideConfirm
      })
    }
  }

  const handleDeleteTipoGasto = (tipoGasto: TipoGasto) => {
    showConfirm({
      title: 'Eliminar Tipo de Gasto',
      message: `¿Estás seguro de que quieres eliminar "${tipoGasto.nombre}"?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'warning',
      onConfirm: async () => {
        hideConfirm() // Cerrar el modal de confirmación primero
        try {
          const token = localStorage.getItem('token')
          if (!token) return

          const response = await fetch(`/api/tipos-gasto/${tipoGasto.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })

          if (response.ok) {
            showSuccess({
              title: 'Tipo de Gasto Eliminado',
              message: 'El tipo de gasto ha sido eliminado exitosamente.',
              buttonText: 'Aceptar',
              onClose: () => {
                fetchData()
              }
            })
          } else {
            showConfirm({
              title: 'Error',
              message: 'No se pudo eliminar el tipo de gasto.',
              confirmText: 'Aceptar',
              cancelText: '',
              type: 'error',
              onConfirm: hideConfirm
            })
          }
        } catch (error) {
          console.error('Error al eliminar tipo de gasto:', error)
          showConfirm({
            title: 'Error de Conexión',
            message: 'No se pudo conectar con el servidor.',
            confirmText: 'Aceptar',
            cancelText: '',
            type: 'error',
            onConfirm: hideConfirm
          })
        }
      }
    })
  }

  const resetForms = () => {
    setFormaPagoNombre('')
    setTipoGastoNombre('')
    setEditingFormaPago(null)
    setEditingTipoGasto(null)
    setShowFormaPagoForm(false)
    setShowTipoGastoForm(false)
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
                  Configuración
                </h1>
                <p className="text-sm text-gray-600">
                  {user.sucursal ? user.sucursal.nombre : 'Administración General'}
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
        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('formas-pago')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'formas-pago'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Formas de Pago
              </button>
              <button
                onClick={() => setActiveTab('tipos-gasto')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'tipos-gasto'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Tipos de Gasto
              </button>
            </nav>
          </div>
        </div>

        {/* Formas de Pago Tab */}
        {activeTab === 'formas-pago' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Formas de Pago</h2>
                <p className="text-sm text-gray-500">Administra las formas de pago disponibles</p>
              </div>
              <button
                onClick={() => {
                  resetForms()
                  setShowFormaPagoForm(true)
                }}
                className="btn-primary"
              >
                + Agregar Forma de Pago
              </button>
            </div>

            {/* Formulario */}
            {showFormaPagoForm && (
              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingFormaPago ? 'Editar Forma de Pago' : 'Nueva Forma de Pago'}
                </h3>
                <form onSubmit={editingFormaPago ? handleUpdateFormaPago : handleCreateFormaPago} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={formaPagoNombre}
                      onChange={(e) => setFormaPagoNombre(e.target.value)}
                      className="input-field"
                      placeholder="Ej: Efectivo, Tarjeta de Crédito, etc."
                      required
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        resetForms()
                        setActiveTab('formas-pago')
                      }}
                      className="btn-secondary"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                    >
                      {editingFormaPago ? 'Actualizar' : 'Crear'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Lista */}
            <div className="card">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nombre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha de Creación
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {formasDePago.map((forma) => (
                      <tr key={forma.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {forma.nombre}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(forma.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditFormaPago(forma)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Editar"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteFormaPago(forma)}
                              className="text-red-600 hover:text-red-900"
                              title="Eliminar"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tipos de Gasto Tab */}
        {activeTab === 'tipos-gasto' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Tipos de Gasto</h2>
                <p className="text-sm text-gray-500">Administra los tipos de gasto disponibles</p>
              </div>
              <button
                onClick={() => {
                  resetForms()
                  setShowTipoGastoForm(true)
                }}
                className="btn-primary"
              >
                + Agregar Tipo de Gasto
              </button>
            </div>

            {/* Formulario */}
            {showTipoGastoForm && (
              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingTipoGasto ? 'Editar Tipo de Gasto' : 'Nuevo Tipo de Gasto'}
                </h3>
                <form onSubmit={editingTipoGasto ? handleUpdateTipoGasto : handleCreateTipoGasto} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={tipoGastoNombre}
                      onChange={(e) => setTipoGastoNombre(e.target.value)}
                      className="input-field"
                      placeholder="Ej: Alquiler, Servicios, etc."
                      required
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        resetForms()
                        setActiveTab('tipos-gasto')
                      }}
                      className="btn-secondary"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                    >
                      {editingTipoGasto ? 'Actualizar' : 'Crear'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Lista */}
            <div className="card">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nombre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha de Creación
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tiposGasto.map((tipo) => (
                      <tr key={tipo.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {tipo.nombre}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(tipo.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditTipoGasto(tipo)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Editar"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteTipoGasto(tipo)}
                              className="text-red-600 hover:text-red-900"
                              title="Eliminar"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal de Confirmación */}
      <ConfirmModal
        isOpen={modalState.isOpen}
        onClose={hideConfirm}
        onConfirm={handleConfirm}
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        type={modalState.type}
      />

      {/* Modal de Éxito */}
      <SuccessModal
        isOpen={successState.isOpen}
        onClose={handleClose}
        title={successState.title}
        message={successState.message}
        buttonText={successState.buttonText}
      />
    </div>
  )
}
