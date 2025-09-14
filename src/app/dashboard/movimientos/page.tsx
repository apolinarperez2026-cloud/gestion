'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthUser, MovimientoDiario, MovimientoDiarioForm } from '@/types/database'
import ConfirmModal from '@/components/ConfirmModal'
import { useConfirmModal } from '@/hooks/useConfirmModal'

export default function MovimientosPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [movimientosDiarios, setMovimientosDiarios] = useState<MovimientoDiario[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const { modalState, showConfirm, hideConfirm, handleConfirm } = useConfirmModal()
  const [formData, setFormData] = useState<MovimientoDiarioForm>({
    fecha: new Date().toISOString().split('T')[0],
    ventasBrutas: '',
    efectivo: '',
    credito: '',
    abonosCredito: '',
    recargas: '',
    pagoTarjeta: '',
    transferencias: '',
    observaciones: ''
  })
  const [editingMovimiento, setEditingMovimiento] = useState<MovimientoDiario | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [historialModal, setHistorialModal] = useState<{ isOpen: boolean; movimientoId: number | null }>({
    isOpen: false,
    movimientoId: null
  })
  const [historial, setHistorial] = useState<any[]>([])
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
          fetchMovimientosDiarios()
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

  const fetchMovimientosDiarios = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/movimientos-diarios', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        console.log('Datos recibidos de la API:', data)
        setMovimientosDiarios(data.movimientosDiarios || [])
      } else {
        console.error('Error en la respuesta de la API:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error al cargar movimientos diarios:', error)
    }
  }

  const fetchHistorial = async (movimientoId: number) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/movimientos-diarios/${movimientoId}/historial`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setHistorial(data.historial)
      }
    } catch (error) {
      console.error('Error al obtener historial:', error)
    }
  }

  const handleVerHistorial = async (movimientoId: number) => {
    setHistorialModal({ isOpen: true, movimientoId })
    await fetchHistorial(movimientoId)
  }

  const handleCerrarHistorial = () => {
    setHistorialModal({ isOpen: false, movimientoId: null })
    setHistorial([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
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

    // Validaciones básicas
    if (!formData.fecha || !formData.ventasBrutas) {
      showConfirm({
        title: 'Campos Requeridos',
        message: 'Por favor completa la fecha y las ventas brutas',
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
        fecha: formData.fecha,
        ventasBrutas: parseFloat(formData.ventasBrutas) || 0,
        efectivo: parseFloat(formData.efectivo) || 0,
        credito: parseFloat(formData.credito) || 0,
        abonosCredito: parseFloat(formData.abonosCredito) || 0,
        recargas: parseFloat(formData.recargas) || 0,
        pagoTarjeta: parseFloat(formData.pagoTarjeta) || 0,
        transferencias: parseFloat(formData.transferencias) || 0,
        observaciones: formData.observaciones,
        sucursalId: user.sucursalId,
        usuarioId: user.id
      }

      console.log('Enviando datos:', requestData)

      const response = await fetch('/api/movimientos-diarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      })

      if (response.ok) {
        const data = await response.json()
        setMovimientosDiarios([data.movimientoDiario, ...movimientosDiarios])
        
        // Limpiar formulario
        setFormData({
          fecha: new Date().toISOString().split('T')[0],
          ventasBrutas: '',
          efectivo: '',
          credito: '',
          abonosCredito: '',
          recargas: '',
          pagoTarjeta: '',
          transferencias: '',
          observaciones: ''
        })
        
        showConfirm({
          title: 'Movimiento Guardado',
          message: `El movimiento diario se ha registrado exitosamente. Se encontraron ${data.gastosEncontrados} gastos del día por un total de $${data.totalGastosCalculado.toLocaleString()}`,
          confirmText: 'Entendido',
          cancelText: '',
          type: 'success'
        })
      } else {
        const error = await response.json()
        console.log('Error del servidor:', error)
        showConfirm({
          title: 'Error al Guardar',
          message: error.error || 'Error al guardar el movimiento diario',
          confirmText: 'Entendido',
          cancelText: '',
          type: 'error'
        })
      }
    } catch (error) {
      console.log('Error al guardar movimiento diario:', error)
      showConfirm({
        title: 'Error de Conexión',
        message: 'Error al guardar el movimiento diario. Verifica tu conexión.',
        confirmText: 'Entendido',
        cancelText: '',
        type: 'error'
      })
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
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

  const handleEdit = (movimiento: MovimientoDiario) => {
    console.log('🔍 DEBUG: Editando movimiento:', movimiento)
    console.log('🔍 DEBUG: Fecha original:', movimiento.fecha)
    console.log('🔍 DEBUG: Fecha convertida:', new Date(movimiento.fecha).toISOString().split('T')[0])
    
    setEditingMovimiento(movimiento)
    setIsEditing(true)
    setFormData({
      fecha: new Date(movimiento.fecha).toISOString().split('T')[0],
      ventasBrutas: movimiento.ventasBrutas.toString(),
      efectivo: movimiento.efectivo.toString(),
      credito: movimiento.credito.toString(),
      abonosCredito: movimiento.abonosCredito.toString(),
      recargas: movimiento.recargas.toString(),
      pagoTarjeta: movimiento.pagoTarjeta.toString(),
      transferencias: movimiento.transferencias.toString(),
      observaciones: movimiento.observaciones || ''
    })
  }

  const handleDelete = async (movimiento: MovimientoDiario) => {
    // Verificar si el usuario es administrador
    if (user?.rol.nombre !== 'Administrador') {
      showConfirm({
        title: 'Acceso Denegado',
        message: 'Solo los administradores pueden eliminar movimientos diarios.',
        confirmText: 'Entendido',
        cancelText: '',
        type: 'warning',
        onConfirm: hideConfirm
      })
      return
    }

    showConfirm({
      title: 'Eliminar Movimiento',
      message: `¿Estás seguro de que quieres eliminar el movimiento del ${new Date(movimiento.fecha).toLocaleDateString()}?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'warning',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token')
          if (!token) return

          const response = await fetch(`/api/movimientos-diarios/${movimiento.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })

          if (response.ok) {
            showConfirm({
              title: 'Movimiento Eliminado',
              message: 'El movimiento diario ha sido eliminado exitosamente.',
              confirmText: 'Aceptar',
              cancelText: '',
              type: 'success',
              onConfirm: () => {
                fetchMovimientosDiarios()
                hideConfirm()
              }
            })
          } else {
            showConfirm({
              title: 'Error',
              message: 'No se pudo eliminar el movimiento diario. Inténtalo de nuevo.',
              confirmText: 'Aceptar',
              cancelText: '',
              type: 'error',
              onConfirm: hideConfirm
            })
          }
        } catch (error) {
          console.error('Error al eliminar movimiento diario:', error)
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
    
    console.log('🔍 DEBUG: handleUpdate llamado')
    console.log('🔍 DEBUG: editingMovimiento:', editingMovimiento)
    console.log('🔍 DEBUG: formData.fecha:', formData.fecha)
    
    if (!editingMovimiento) return

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/movimientos-diarios/${editingMovimiento.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ventasBrutas: parseFloat(formData.ventasBrutas) || 0,
          efectivo: parseFloat(formData.efectivo) || 0,
          credito: parseFloat(formData.credito) || 0,
          abonosCredito: parseFloat(formData.abonosCredito) || 0,
          recargas: parseFloat(formData.recargas) || 0,
          pagoTarjeta: parseFloat(formData.pagoTarjeta) || 0,
          transferencias: parseFloat(formData.transferencias) || 0,
          observaciones: formData.observaciones,
          usuarioId: user?.id
        })
      })

      if (response.ok) {
        showConfirm({
          title: 'Movimiento Actualizado',
          message: 'El movimiento diario ha sido actualizado exitosamente.',
          confirmText: 'Aceptar',
          cancelText: '',
          type: 'success',
          onConfirm: () => {
            fetchMovimientosDiarios()
            setIsEditing(false)
            setEditingMovimiento(null)
            setFormData({
              fecha: new Date().toISOString().split('T')[0],
              ventasBrutas: '',
              efectivo: '',
              credito: '',
              abonosCredito: '',
              recargas: '',
              pagoTarjeta: '',
              transferencias: '',
              observaciones: ''
            })
            hideConfirm()
          }
        })
      } else {
        showConfirm({
          title: 'Error',
          message: 'No se pudo actualizar el movimiento diario. Inténtalo de nuevo.',
          confirmText: 'Aceptar',
          cancelText: '',
          type: 'error',
          onConfirm: hideConfirm
        })
      }
    } catch (error) {
      console.error('Error al actualizar movimiento diario:', error)
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
      fecha: new Date().toISOString().split('T')[0],
      ventasBrutas: '',
      efectivo: '',
      credito: '',
      abonosCredito: '',
      recargas: '',
      pagoTarjeta: '',
      transferencias: '',
      observaciones: ''
    })
  }

  // Calcular totales del mes actual
  const calcularTotalesDelMes = () => {
    const ahora = new Date()
    const inicioDelMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
    const finDelMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59)
    
    const movimientosDelMes = movimientosDiarios.filter(m => {
      const fechaMovimiento = new Date(m.fecha)
      return fechaMovimiento >= inicioDelMes && fechaMovimiento <= finDelMes
    })
    
    const totalVentasBrutas = movimientosDelMes.reduce((sum, m) => sum + m.ventasBrutas, 0)
    const totalEfectivo = movimientosDelMes.reduce((sum, m) => sum + m.efectivo, 0)
    const totalCredito = movimientosDelMes.reduce((sum, m) => sum + m.credito, 0)
    const totalAbonosCredito = movimientosDelMes.reduce((sum, m) => sum + m.abonosCredito, 0)
    const totalRecargas = movimientosDelMes.reduce((sum, m) => sum + m.recargas, 0)
    const totalPagoTarjeta = movimientosDelMes.reduce((sum, m) => sum + m.pagoTarjeta, 0)
    const totalTransferencias = movimientosDelMes.reduce((sum, m) => sum + m.transferencias, 0)
    const totalGastos = movimientosDelMes.reduce((sum, m) => sum + m.gastos, 0)
    const saldoTotal = totalVentasBrutas - totalGastos

    return { 
      totalVentasBrutas, 
      totalEfectivo, 
      totalCredito, 
      totalAbonosCredito, 
      totalRecargas, 
      totalPagoTarjeta, 
      totalTransferencias, 
      totalGastos, 
      saldoTotal, 
      movimientosDelMes 
    }
  }

  const { 
    totalVentasBrutas, 
    totalEfectivo, 
    totalCredito, 
    totalAbonosCredito, 
    totalRecargas, 
    totalPagoTarjeta, 
    totalTransferencias, 
    totalGastos, 
    saldoTotal, 
    movimientosDelMes 
  } = calcularTotalesDelMes()

  // Filtrar movimientos por término de búsqueda
  const movimientosFiltrados = movimientosDiarios.filter(movimiento => {
    if (!searchTerm) return true
    
    const termino = searchTerm.toLowerCase()
    const fechaStr = new Date(movimiento.fecha).toLocaleDateString()
    const observacionesStr = movimiento.observaciones?.toLowerCase() || ''
    
    return (
      fechaStr.includes(termino) ||
      observacionesStr.includes(termino) ||
      movimiento.ventasBrutas.toString().includes(termino) ||
      movimiento.gastos.toString().includes(termino)
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

  // Debug: Log del estado de movimientos
  useEffect(() => {
    console.log('Estado de movimientos diarios:', {
      total: movimientosDiarios.length,
      filtrados: movimientosFiltrados.length,
      paginados: movimientosPaginados.length,
      loading,
      searchTerm
    })
  }, [movimientosDiarios, movimientosFiltrados, movimientosPaginados, loading, searchTerm])

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
                  Movimientos Diarios
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
        {/* Resumen del mes */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Resumen del Mes - {new Date().toLocaleDateString('es-ES', { 
              year: 'numeric', 
              month: 'long'
            })}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-center">
                <p className="text-sm font-medium text-green-600">Ventas Brutas</p>
                <p className="text-xl font-bold text-green-900">${totalVentasBrutas.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-center">
                <p className="text-sm font-medium text-red-600">Gastos</p>
                <p className="text-xl font-bold text-red-900">${totalGastos.toLocaleString()}</p>
              </div>
            </div>
            <div className={`rounded-lg p-4 ${saldoTotal >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
              <div className="text-center">
                <p className={`text-sm font-medium ${saldoTotal >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  Saldo Total
                </p>
                <p className={`text-xl font-bold ${saldoTotal >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                  ${saldoTotal.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Días Registrados</p>
                <p className="text-xl font-bold text-gray-900">{movimientosDelMes.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulario para nuevo movimiento diario */}
        <div className="card mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {isEditing ? 'Editar Movimiento Diario' : 'Nuevo Movimiento Diario'}
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
          
          <form onSubmit={isEditing ? handleUpdate : handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha *
                </label>
                <input
                  type="date"
                  name="fecha"
                  value={formData.fecha}
                  onChange={handleChange}
                  className="input-field"
                  required
                  disabled={!user?.sucursalId || isEditing}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ventas Brutas *
                </label>
                <input
                  type="number"
                  name="ventasBrutas"
                  value={formData.ventasBrutas}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="0.00"
                  step="0.01"
                  required
                  disabled={!user?.sucursalId}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Efectivo
                </label>
                <input
                  type="number"
                  name="efectivo"
                  value={formData.efectivo}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="0.00"
                  step="0.01"
                  disabled={!user?.sucursalId}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Crédito
                </label>
                <input
                  type="number"
                  name="credito"
                  value={formData.credito}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="0.00"
                  step="0.01"
                  disabled={!user?.sucursalId}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Abonos de Crédito
                </label>
                <input
                  type="number"
                  name="abonosCredito"
                  value={formData.abonosCredito}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="0.00"
                  step="0.01"
                  disabled={!user?.sucursalId}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recargas
                </label>
                <input
                  type="number"
                  name="recargas"
                  value={formData.recargas}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="0.00"
                  step="0.01"
                  disabled={!user?.sucursalId}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pago con Tarjeta
                </label>
                <input
                  type="number"
                  name="pagoTarjeta"
                  value={formData.pagoTarjeta}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="0.00"
                  step="0.01"
                  disabled={!user?.sucursalId}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transferencias
                </label>
                <input
                  type="number"
                  name="transferencias"
                  value={formData.transferencias}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="0.00"
                  step="0.01"
                  disabled={!user?.sucursalId}
                />
              </div>


            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                name="observaciones"
                value={formData.observaciones}
                onChange={handleChange}
                className="input-field"
                placeholder="Observaciones adicionales..."
                rows={3}
                disabled={!user?.sucursalId}
              />
            </div>

            {/* Información sobre gastos del día */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Gastos del Día
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>Los gastos se cargarán automáticamente desde la tabla de movimientos (tipo GASTO) del día seleccionado.</p>
                    <p className="mt-1 font-medium">El saldo del día se calculará como: Ventas Brutas - Gastos del día</p>
                  </div>
                </div>
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
                className={`btn-primary ${!user?.sucursalId ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!user?.sucursalId}
              >
                {isEditing ? 'Actualizar Movimiento' : 'Registrar Movimiento'}
              </button>
            </div>
          </form>
        </div>

        {/* Lista de movimientos diarios */}
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Movimientos Diarios</h3>
              <p className="text-sm text-gray-500 mt-1">
                {searchTerm ? (
                  <>Mostrando {movimientosPaginados.length} de {movimientosFiltrados.length} resultados (de {movimientosDiarios.length} total)</>
                ) : (
                  <>Mostrando {movimientosPaginados.length} de {movimientosDiarios.length} movimientos</>
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
          
          {movimientosDiarios.length > 0 ? (
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
                            Ventas Brutas
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Efectivo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Crédito
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Abonos
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Recargas
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tarjeta
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Transferencias
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Gastos
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Registrado por
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Última Edición
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            ${movimiento.ventasBrutas.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${movimiento.efectivo.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${movimiento.credito.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${movimiento.abonosCredito.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${movimiento.recargas.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${movimiento.pagoTarjeta.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${movimiento.transferencias.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                            ${movimiento.gastos.toLocaleString()}
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-500">
                                {movimiento.updatedAt ? new Date(movimiento.updatedAt).toLocaleDateString() : 'N/A'}
                              </span>
                              <span className="text-xs text-gray-400">
                                {movimiento.updatedAt ? new Date(movimiento.updatedAt).toLocaleTimeString() : ''}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleVerHistorial(movimiento.id)}
                                className="text-green-600 hover:text-green-900"
                                title="Ver Historial"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
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
                          
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
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
              <p className="text-lg font-medium text-gray-900 mb-2">No hay movimientos diarios registrados</p>
              <p className="text-gray-500">Comienza registrando tu primer movimiento diario</p>
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

      {/* Modal de Historial */}
      {historialModal.isOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Historial de Cambios
                </h3>
                <button
                  onClick={handleCerrarHistorial}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {historial.length > 0 ? (
                  <div className="space-y-4">
                    {historial.map((cambio, index) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">
                              {cambio.usuario?.nombre || 'Usuario desconocido'}
                            </span>
                            <span className="text-sm text-gray-500">
                              ({cambio.usuario?.rol?.nombre || 'Sin rol'})
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(cambio.fechaCambio).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700">
                          <span className="font-medium">{cambio.campoModificado}:</span>
                          <span className="text-red-600 ml-1">{cambio.valorAnterior}</span>
                          <span className="mx-2">→</span>
                          <span className="text-green-600">{cambio.valorNuevo}</span>
                        </div>
                        {cambio.observaciones && (
                          <div className="text-sm text-gray-600 mt-1 italic">
                            "{cambio.observaciones}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-2">No hay cambios registrados</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleCerrarHistorial}
                  className="btn-secondary"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}