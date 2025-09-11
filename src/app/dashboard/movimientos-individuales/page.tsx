'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthUser, FormaDePago, TipoGasto, Movimiento, MovimientoTipo } from '@/types/database'
import ConfirmModal from '@/components/ConfirmModal'
import { useConfirmModal } from '@/hooks/useConfirmModal'
import UploadThingComponent from '@/components/UploadThing'

interface MovimientoForm {
  descripcion: string
  monto: string
  tipo: MovimientoTipo
  imagen: string
  formaDePagoId: string
  tipoGastoId: string
}

export default function MovimientosIndividualesPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [formasDePago, setFormasDePago] = useState<FormaDePago[]>([])
  const [tiposGasto, setTiposGasto] = useState<TipoGasto[]>([])
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const { modalState, showConfirm, hideConfirm, handleConfirm } = useConfirmModal()
  const [formData, setFormData] = useState<MovimientoForm>({
    descripcion: '',
    monto: '',
    tipo: MovimientoTipo.VENTA,
    imagen: '',
    formaDePagoId: '',
    tipoGastoId: ''
  })
  const [editingMovimiento, setEditingMovimiento] = useState<Movimiento | null>(null)
  const [isEditing, setIsEditing] = useState(false)
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
          await Promise.all([
            fetchFormasDePago(),
            fetchTiposGasto(),
            fetchMovimientos()
          ])
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

  const fetchFormasDePago = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/formas-pago', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setFormasDePago(data.formasDePago || [])
      }
    } catch (error) {
      console.error('Error al cargar formas de pago:', error)
    }
  }

  const fetchTiposGasto = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/tipos-gasto', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setTiposGasto(data.tiposGasto || [])
      }
    } catch (error) {
      console.error('Error al cargar tipos de gasto:', error)
    }
  }

  const fetchMovimientos = async () => {
    try {
      const response = await fetch('/api/movimientos')
      if (response.ok) {
        const data = await response.json()
        setMovimientos(data.movimientos || [])
      }
    } catch (error) {
      console.error('Error al cargar movimientos:', error)
    }
  }

  const handleImageUploadComplete = (url: string) => {
    setFormData(prev => ({
      ...prev,
      imagen: url
    }))
    setUploadingImage(false)
    showConfirm({
      title: 'Imagen Subida',
      message: 'La imagen se ha subido exitosamente',
      confirmText: 'Entendido',
      cancelText: '',
      type: 'success'
    })
  }

  const handleImageUploadError = (error: Error) => {
    setUploadingImage(false)
    showConfirm({
      title: 'Error al Subir Imagen',
      message: error.message || 'Error al subir la imagen',
      confirmText: 'Entendido',
      cancelText: '',
      type: 'error'
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validaciones del frontend
    if (!formData.descripcion || !formData.monto) {
      showConfirm({
        title: 'Campos Requeridos',
        message: 'Por favor completa todos los campos requeridos',
        confirmText: 'Entendido',
        cancelText: '',
        type: 'warning'
      })
      return
    }

    if (formData.tipo === MovimientoTipo.VENTA && !formData.formaDePagoId) {
      showConfirm({
        title: 'Forma de Pago Requerida',
        message: 'Por favor selecciona una forma de pago para la venta',
        confirmText: 'Entendido',
        cancelText: '',
        type: 'warning'
      })
      return
    }

    if (formData.tipo === MovimientoTipo.GASTO && !formData.tipoGastoId) {
      showConfirm({
        title: 'Tipo de Gasto Requerido',
        message: 'Por favor selecciona un tipo de gasto',
        confirmText: 'Entendido',
        cancelText: '',
        type: 'warning'
      })
      return
    }

    if (!user?.sucursalId) {
      showConfirm({
        title: 'Sucursal Requerida',
        message: 'Los administradores deben seleccionar una sucursal antes de registrar movimientos',
        confirmText: 'Entendido',
        cancelText: '',
        type: 'warning'
      })
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const requestData = {
        descripcion: formData.descripcion,
        monto: parseFloat(formData.monto),
        tipo: formData.tipo,
        imagen: formData.imagen || null,
        formaDePagoId: formData.tipo === MovimientoTipo.VENTA ? parseInt(formData.formaDePagoId) : null,
        tipoGastoId: formData.tipo === MovimientoTipo.GASTO ? parseInt(formData.tipoGastoId) : null,
        sucursalId: user.sucursalId,
        usuarioId: user.id
      }

      console.log('Enviando datos:', requestData)

      const response = await fetch('/api/movimientos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      })

      if (response.ok) {
        const data = await response.json()
        setMovimientos([data.movimiento, ...movimientos])
        
        // Limpiar formulario
        setFormData({
          descripcion: '',
          monto: '',
          tipo: MovimientoTipo.VENTA,
          imagen: '',
          formaDePagoId: '',
          tipoGastoId: ''
        })
        
        showConfirm({
          title: 'Movimiento Guardado',
          message: 'El movimiento se ha registrado exitosamente',
          confirmText: 'Entendido',
          cancelText: '',
          type: 'success'
        })
      } else {
        const error = await response.json()
        console.error('Error del servidor:', error)
        showConfirm({
          title: 'Error al Guardar',
          message: error.error || 'Error al guardar el movimiento',
          confirmText: 'Entendido',
          cancelText: '',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error al guardar movimiento:', error)
      showConfirm({
        title: 'Error de Conexión',
        message: 'Error al guardar el movimiento. Verifica tu conexión.',
        confirmText: 'Entendido',
        cancelText: '',
        type: 'error'
      })
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Limpiar campos cuando cambia el tipo
      ...(name === 'tipo' && {
        formaDePagoId: '',
        tipoGastoId: ''
      })
    }))
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/auth/login')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  const handleEdit = (movimiento: Movimiento) => {
    setEditingMovimiento(movimiento)
    setIsEditing(true)
    setFormData({
      descripcion: movimiento.descripcion,
      monto: movimiento.monto.toString(),
      tipo: movimiento.tipo,
      imagen: movimiento.imagen || '',
      formaDePagoId: movimiento.formaDePagoId?.toString() || '',
      tipoGastoId: movimiento.tipoGastoId?.toString() || ''
    })
  }

  const handleDelete = async (movimiento: Movimiento) => {
    // Verificar si el usuario es administrador
    if (user?.rol.nombre !== 'Administrador') {
      showConfirm({
        title: 'Acceso Denegado',
        message: 'Solo los administradores pueden eliminar movimientos.',
        confirmText: 'Entendido',
        cancelText: '',
        type: 'warning',
        onConfirm: hideConfirm
      })
      return
    }

    showConfirm({
      title: 'Eliminar Movimiento',
      message: `¿Estás seguro de que quieres eliminar el movimiento "${movimiento.descripcion}"?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'warning',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token')
          if (!token) return

          const response = await fetch(`/api/movimientos/${movimiento.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })

          if (response.ok) {
            showConfirm({
              title: 'Movimiento Eliminado',
              message: 'El movimiento ha sido eliminado exitosamente.',
              confirmText: 'Aceptar',
              cancelText: '',
              type: 'success',
              onConfirm: () => {
                fetchMovimientos()
                hideConfirm()
              }
            })
          } else {
            showConfirm({
              title: 'Error',
              message: 'No se pudo eliminar el movimiento. Inténtalo de nuevo.',
              confirmText: 'Aceptar',
              cancelText: '',
              type: 'error',
              onConfirm: hideConfirm
            })
          }
        } catch (error) {
          console.error('Error al eliminar movimiento:', error)
          showConfirm({
            title: 'Error de Conexión',
            message: 'No se pudo conectar con el servidor. Verifica tu conexión.',
            confirmText: 'Aceptar',
            cancelText: '',
            type: 'error',
            onConfirm: hideConfirm
          })
        }
      }
    })
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingMovimiento) return

    // Validaciones
    if (!formData.descripcion.trim()) {
      showConfirm({
        title: 'Campos Requeridos',
        message: 'La descripción es obligatoria.',
        confirmText: 'Aceptar',
        type: 'warning',
        onConfirm: hideConfirm
      })
      return
    }

    if (!formData.monto || parseFloat(formData.monto) <= 0) {
      showConfirm({
        title: 'Campos Requeridos',
        message: 'El monto debe ser mayor a 0.',
        confirmText: 'Aceptar',
        type: 'warning',
        onConfirm: hideConfirm
      })
      return
    }

    if (formData.tipo === MovimientoTipo.VENTA && !formData.formaDePagoId) {
      showConfirm({
        title: 'Campos Requeridos',
        message: 'Debes seleccionar una forma de pago para las ventas.',
        confirmText: 'Aceptar',
        type: 'warning',
        onConfirm: hideConfirm
      })
      return
    }

    if (formData.tipo === MovimientoTipo.GASTO && !formData.tipoGastoId) {
      showConfirm({
        title: 'Campos Requeridos',
        message: 'Debes seleccionar un tipo de gasto.',
        confirmText: 'Aceptar',
        type: 'warning',
        onConfirm: hideConfirm
      })
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/movimientos/${editingMovimiento.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          descripcion: formData.descripcion,
          monto: parseFloat(formData.monto),
          tipo: formData.tipo,
          imagen: formData.imagen || null,
          formaDePagoId: formData.tipo === MovimientoTipo.VENTA ? parseInt(formData.formaDePagoId) : null,
          tipoGastoId: formData.tipo === MovimientoTipo.GASTO ? parseInt(formData.tipoGastoId) : null,
          usuarioId: user.id
        })
      })

      if (response.ok) {
        showConfirm({
          title: 'Movimiento Actualizado',
          message: 'El movimiento ha sido actualizado exitosamente.',
          confirmText: 'Aceptar',
          cancelText: '',
          type: 'success',
          onConfirm: () => {
            fetchMovimientos()
            setIsEditing(false)
            setEditingMovimiento(null)
            setFormData({
              descripcion: '',
              monto: '',
              tipo: MovimientoTipo.VENTA,
              imagen: '',
              formaDePagoId: '',
              tipoGastoId: ''
            })
            hideConfirm()
          }
        })
      } else {
        showConfirm({
          title: 'Error',
          message: 'No se pudo actualizar el movimiento. Inténtalo de nuevo.',
          confirmText: 'Aceptar',
          cancelText: '',
          type: 'error',
          onConfirm: hideConfirm
        })
      }
    } catch (error) {
      console.error('Error al actualizar movimiento:', error)
      showConfirm({
        title: 'Error de Conexión',
        message: 'No se pudo conectar con el servidor. Verifica tu conexión.',
        confirmText: 'Aceptar',
        cancelText: '',
        type: 'error',
        onConfirm: hideConfirm
      })
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditingMovimiento(null)
    setFormData({
      descripcion: '',
      monto: '',
      tipo: MovimientoTipo.VENTA,
      imagen: '',
      formaDePagoId: '',
      tipoGastoId: ''
    })
  }

  // Filtrar movimientos por término de búsqueda y solo mostrar gastos
  const movimientosFiltrados = movimientos.filter(movimiento => {
    // Solo mostrar gastos
    if (movimiento.tipo !== 'GASTO') return false
    
    if (!searchTerm) return true
    
    const termino = searchTerm.toLowerCase()
    return (
      movimiento.descripcion.toLowerCase().includes(termino) ||
      movimiento.tipo.toLowerCase().includes(termino) ||
      (movimiento.formaDePago?.nombre.toLowerCase().includes(termino)) ||
      (movimiento.tipoGasto?.nombre.toLowerCase().includes(termino)) ||
      movimiento.monto.toString().includes(termino) ||
      new Date(movimiento.fecha).toLocaleDateString().includes(termino)
    )
  })

  // Calcular paginación
  const totalPages = Math.ceil(movimientosFiltrados.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const movimientosPaginados = movimientosFiltrados.slice(startIndex, endIndex)

  // Resetear página cuando cambia el filtro de búsqueda
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

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
                  Gastos Individuales
                </h1>
                <p className="text-sm text-gray-600">
                  {user.sucursal?.nombre}
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
        {/* Formulario para nuevo movimiento */}
        <div className="card mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {isEditing ? 'Editar Gasto' : 'Nuevo Gasto'}
          </h3>
          
          {!user?.sucursalId ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Selecciona una sucursal
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>Como administrador, debes seleccionar una sucursal antes de registrar movimientos.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          
          <form onSubmit={isEditing ? handleUpdate : handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Movimiento *
                </label>
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  className="input-field"
                  required
                  disabled={!user?.sucursalId}
                >
                  <option value="GASTO">Gasto</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Gasto *
                </label>
                <select
                  name="tipoGastoId"
                  value={formData.tipoGastoId}
                  onChange={handleChange}
                  className="input-field"
                  required
                  disabled={!user?.sucursalId}
                >
                  <option value="">Seleccionar...</option>
                  {tiposGasto.map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monto *
                </label>
                <input
                  type="number"
                  name="monto"
                  value={formData.monto}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="0.00"
                  step="0.01"
                  required
                  disabled={!user?.sucursalId}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción *
              </label>
              <input
                type="text"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                className="input-field"
                placeholder="Descripción del movimiento"
                required
                disabled={!user?.sucursalId}
              />
            </div>

            {/* Campo de imagen */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Imagen (Opcional)
              </label>
              <div className="space-y-3">
                <UploadThingComponent
                  onUploadComplete={handleImageUploadComplete}
                  onUploadError={handleImageUploadError}
                  disabled={!user?.sucursalId}
                />
                
                {formData.imagen && (
                  <div className="mt-3">
                    <img
                      src={formData.imagen}
                      alt="Imagen del movimiento"
                      className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, imagen: '' }))}
                      className="mt-2 text-sm text-red-600 hover:text-red-800"
                    >
                      Eliminar imagen
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              {isEditing && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                className={`btn-primary bg-red-600 hover:bg-red-700 ${!user?.sucursalId ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!user?.sucursalId}
              >
                {isEditing ? 'Actualizar Gasto' : 'Registrar Gasto'}
              </button>
            </div>
          </form>
        </div>

        {/* Lista de movimientos */}
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Gastos Recientes</h3>
              <p className="text-sm text-gray-500 mt-1">
                {searchTerm ? (
                  <>Mostrando {movimientosPaginados.length} de {movimientosFiltrados.length} resultados (de {movimientos.length} total)</>
                ) : (
                  <>Mostrando {movimientosPaginados.length} de {movimientos.length} gastos</>
                )}
              </p>
            </div>
            
            {/* Buscador */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Buscar movimientos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10 pr-4 py-2 w-full sm:w-64"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          {movimientos.length > 0 ? (
            <>
              {movimientosFiltrados.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
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
                            Descripción
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Categoría
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Monto
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Imagen
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Registrado por
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {movimientosPaginados.map((movimiento) => (
                        <tr key={movimiento.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(movimiento.fecha).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              movimiento.tipo === MovimientoTipo.VENTA 
                                ? 'bg-green-100 text-green-800' 
                                : movimiento.tipo === MovimientoTipo.GASTO
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {movimiento.tipo === MovimientoTipo.FONDO_CAJA ? 'FONDO CAJA' : movimiento.tipo}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {movimiento.descripcion}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {movimiento.tipo === MovimientoTipo.VENTA 
                              ? movimiento.formaDePago?.nombre || 'N/A'
                              : movimiento.tipo === MovimientoTipo.GASTO
                              ? movimiento.tipoGasto?.nombre || 'N/A'
                              : 'N/A'
                            }
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                            movimiento.tipo === MovimientoTipo.VENTA 
                              ? 'text-green-600' 
                              : movimiento.tipo === MovimientoTipo.GASTO
                              ? 'text-red-600'
                              : 'text-blue-600'
                          }`}>
                            {movimiento.tipo === MovimientoTipo.VENTA 
                              ? '+' 
                              : movimiento.tipo === MovimientoTipo.GASTO
                              ? '-'
                              : ''
                            }${movimiento.monto.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {movimiento.imagen ? (
                              <img
                                src={movimiento.imagen}
                                alt="Imagen del movimiento"
                                className="w-12 h-12 object-cover rounded border border-gray-300"
                              />
                            ) : (
                              <span className="text-gray-400">Sin imagen</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {movimiento.usuario ? (
                              <div className="flex flex-col">
                                <span className="font-medium">{movimiento.usuario.nombre}</span>
                                <span className="text-xs text-gray-500">
                                  {movimiento.usuario.rol?.nombre || 'Sin rol'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">Sistema</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEdit(movimiento)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Editar"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              {user?.rol.nombre === 'Administrador' && (
                                <button
                                  onClick={() => handleDelete(movimiento)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Eliminar"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Controles de paginación */}
                  {totalPages > 1 && (
                    <div className="bg-white px-4 py-3 border-t border-gray-200">
                      <div className="flex justify-center mb-4">
                        {/* Versión móvil */}
                        <div className="flex justify-center space-x-2 sm:hidden">
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Anterior
                          </button>
                          <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Siguiente
                          </button>
                        </div>

                        {/* Versión escritorio */}
                        <nav className="hidden sm:inline-flex relative z-0 rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
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
                                  onClick={() => setCurrentPage(page)}
                                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                    page === currentPage
                                      ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
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
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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

                      {/* Información centrada debajo de los botones */}
                      <div className="text-center">
                        <p className="text-sm text-gray-700">
                          Mostrando{' '}
                          <span className="font-medium">{startIndex + 1}</span>
                          {' '}a{' '}
                          <span className="font-medium">{Math.min(endIndex, movimientosFiltrados.length)}</span>
                          {' '}de{' '}
                          <span className="font-medium">{movimientosFiltrados.length}</span>
                          {' '}resultados
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="px-6 py-12 text-center">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-lg font-medium text-gray-900 mb-2">No se encontraron resultados</p>
                  <p className="text-gray-500">No hay movimientos que coincidan con "{searchTerm}"</p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-4 text-primary-600 hover:text-primary-500 text-sm font-medium"
                  >
                    Limpiar búsqueda
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="px-6 py-12 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-lg font-medium text-gray-900 mb-2">No hay movimientos registrados</p>
              <p className="text-gray-500">Comienza registrando tu primer movimiento</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal de confirmación */}
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
    </div>
  )
}
