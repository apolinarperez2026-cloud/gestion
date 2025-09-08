'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Movimiento, AuthUser } from '@/types/database'
import ConfirmModal from '@/components/ConfirmModal'
import { useConfirmModal } from '@/hooks/useConfirmModal'
import SummaryCards from '@/components/SummaryCards'

export default function MovimientosPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [tipoPagoFiltro, setTipoPagoFiltro] = useState('')
  const { modalState, showConfirm, hideConfirm, handleConfirm } = useConfirmModal()
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    ventasBrutas: '',
    tipoPago: '',
    importeTipoPago: '',
    depositoManual: ''
  })
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
          fetchMovimientos()
        } else {
          router.push('/auth/login')
        }
      } catch (error) {
        router.push('/auth/login')
      }
    }

    fetchUser()
  }, [router])

  // Resetear página cuando cambien los movimientos o filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [movimientos.length, fechaInicio, fechaFin, tipoPagoFiltro])

  const fetchMovimientos = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch('/api/movimientos', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setMovimientos(data.movimientos)
      }
    } catch (error) {
      console.error('Error al cargar movimientos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No hay token disponible, redirigiendo al login')
        router.push('/auth/login')
        return
      }
      
      const url = editingId ? `/api/movimientos/${editingId}` : '/api/movimientos'
      const method = editingId ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          fecha: new Date(formData.fecha),
          ventasBrutas: parseFloat(formData.ventasBrutas),
          // Mapear el tipo de pago a los campos correspondientes
          credito: formData.tipoPago === 'credito' ? parseFloat(formData.importeTipoPago || '0') : 0,
          abonosCredito: formData.tipoPago === 'abonosCredito' ? parseFloat(formData.importeTipoPago || '0') : 0,
          recargas: formData.tipoPago === 'recargas' ? parseFloat(formData.importeTipoPago || '0') : 0,
          pagoTarjeta: formData.tipoPago === 'pagoTarjeta' ? parseFloat(formData.importeTipoPago || '0') : 0,
          transferencias: formData.tipoPago === 'transferencias' ? parseFloat(formData.importeTipoPago || '0') : 0,
          gastos: formData.tipoPago === 'gastos' ? parseFloat(formData.importeTipoPago || '0') : 0,
          depositoManual: formData.depositoManual ? parseFloat(formData.depositoManual) : 0,
          // Calcular monto total: Venta Bruta - Gastos - Depósito Manual
          monto: parseFloat(formData.ventasBrutas) - (formData.tipoPago === 'gastos' ? parseFloat(formData.importeTipoPago || '0') : 0) - parseFloat(formData.depositoManual || '0')
        }),
      })

      if (response.ok) {
        setShowForm(false)
        setEditingId(null)
        setFormData({
          fecha: new Date().toISOString().split('T')[0],
          ventasBrutas: '',
          tipoPago: '',
          importeTipoPago: '',
          depositoManual: ''
        })
        fetchMovimientos()
      }
    } catch (error) {
      console.error('Error al guardar movimiento:', error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleEdit = (movimiento: Movimiento) => {
    // Determinar el tipo de pago basado en qué campo tiene valor
    let tipoPago = ''
    let importeTipoPago = ''
    
    if (movimiento.credito && movimiento.credito > 0) {
      tipoPago = 'credito'
      importeTipoPago = movimiento.credito.toString()
    } else if (movimiento.abonosCredito && movimiento.abonosCredito > 0) {
      tipoPago = 'abonosCredito'
      importeTipoPago = movimiento.abonosCredito.toString()
    } else if (movimiento.recargas && movimiento.recargas > 0) {
      tipoPago = 'recargas'
      importeTipoPago = movimiento.recargas.toString()
    } else if (movimiento.pagoTarjeta && movimiento.pagoTarjeta > 0) {
      tipoPago = 'pagoTarjeta'
      importeTipoPago = movimiento.pagoTarjeta.toString()
    } else if (movimiento.transferencias && movimiento.transferencias > 0) {
      tipoPago = 'transferencias'
      importeTipoPago = movimiento.transferencias.toString()
    } else if (movimiento.gastos && movimiento.gastos > 0) {
      tipoPago = 'gastos'
      importeTipoPago = movimiento.gastos.toString()
    }

    setFormData({
      fecha: new Date(movimiento.fecha).toISOString().split('T')[0],
      ventasBrutas: movimiento.ventasBrutas?.toString() || '',
      tipoPago: tipoPago,
      importeTipoPago: importeTipoPago,
      depositoManual: movimiento.depositoManual?.toString() || ''
    })
    setEditingId(movimiento.id)
    setShowForm(true)
  }

  const handleDelete = (id: number) => {
    showConfirm({
      title: 'Eliminar Movimiento',
      message: '¿Estás seguro de que quieres eliminar este movimiento? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token')
          if (!token) {
            console.error('No hay token disponible, redirigiendo al login')
            router.push('/auth/login')
            return
          }
          
          const response = await fetch(`/api/movimientos/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })

          if (response.ok) {
            fetchMovimientos()
          } else {
            console.error('Error al eliminar movimiento')
          }
        } catch (error) {
          console.error('Error al eliminar movimiento:', error)
        }
      }
    })
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/auth/login')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  // Funciones de filtrado
  const getTipoPagoTexto = (movimiento: Movimiento) => {
    if (movimiento.credito && movimiento.credito > 0) return 'Crédito'
    if (movimiento.abonosCredito && movimiento.abonosCredito > 0) return 'Abonos de crédito'
    if (movimiento.recargas && movimiento.recargas > 0) return 'Recargas'
    if (movimiento.pagoTarjeta && movimiento.pagoTarjeta > 0) return 'Pago con tarjeta'
    if (movimiento.gastos && movimiento.gastos > 0) return 'Gastos'
    if (movimiento.transferencias && movimiento.transferencias > 0) return 'Transferencias'
    return 'Ventas Brutas'
  }

  const movimientosFiltrados = movimientos.filter(movimiento => {
    // Filtro por rango de fechas
    const fechaMovimiento = new Date(movimiento.fecha)
    const inicio = fechaInicio ? new Date(fechaInicio) : null
    const fin = fechaFin ? new Date(fechaFin) : null
    
    if (inicio && fechaMovimiento < inicio) return false
    if (fin && fechaMovimiento > fin) return false
    
    // Filtro por tipo de pago
    if (tipoPagoFiltro) {
      const tipoPagoMovimiento = getTipoPagoTexto(movimiento)
      if (tipoPagoMovimiento !== tipoPagoFiltro) return false
    }
    
    return true
  })

  const limpiarFiltros = () => {
    setFechaInicio('')
    setFechaFin('')
    setTipoPagoFiltro('')
    setCurrentPage(1)
  }

  // Funciones de paginación
  const totalPages = Math.ceil(movimientosFiltrados.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentMovimientos = movimientosFiltrados.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(page)
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
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
                  Movimientos
                </h1>
                <p className="text-sm text-gray-600">
                  {user.sucursal.nombre}
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
        {/* Tarjetas de Resumen */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Resumen Financiero</h2>
          <SummaryCards />
        </div>

        {/* Botón para agregar movimiento */}
        <div className="mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? 'Cancelar' : '+ Nuevo Movimiento'}
          </button>
        </div>

        {/* Filtros de búsqueda */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros de Búsqueda</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tipo de pago */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Pago
              </label>
              <select
                value={tipoPagoFiltro}
                onChange={(e) => setTipoPagoFiltro(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Todos los tipos</option>
                <option value="Ventas Brutas">Ventas Brutas</option>
                <option value="Crédito">Crédito</option>
                <option value="Abonos de crédito">Abonos de crédito</option>
                <option value="Recargas">Recargas</option>
                <option value="Pago con tarjeta">Pago con tarjeta</option>
                <option value="Gastos">Gastos</option>
                <option value="Transferencias">Transferencias</option>
              </select>
            </div>

            {/* Fecha inicio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Fecha fin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Fin
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Botón limpiar */}
            <div className="flex items-end">
              <button
                onClick={limpiarFiltros}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>

          {/* Información de resultados */}
          {movimientosFiltrados.length !== movimientos.length && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                Mostrando {movimientosFiltrados.length} de {movimientos.length} movimientos
                {fechaInicio && fechaFin && ` (${fechaInicio} - ${fechaFin})`}
                {tipoPagoFiltro && ` - Tipo: ${tipoPagoFiltro}`}
              </p>
            </div>
          )}
        </div>

        {/* Formulario para nuevo movimiento */}
        {showForm && (
          <div className="card mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingId ? 'Editar Movimiento' : 'Nuevo Movimiento'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Venta Bruta *
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
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Pago (Opcional)
                  </label>
                  <select
                    name="tipoPago"
                    value={formData.tipoPago}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="">Seleccionar tipo...</option>
                    <option value="credito">Crédito</option>
                    <option value="abonosCredito">Abonos de Crédito</option>
                    <option value="recargas">Recargas (Eleventa)</option>
                    <option value="pagoTarjeta">Pago con Tarjeta</option>
                    <option value="transferencias">Transferencias</option>
                    <option value="gastos">Gastos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Importe Tipo de Pago (Opcional)
                  </label>
                  <input
                    type="number"
                    name="importeTipoPago"
                    value={formData.importeTipoPago}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="0.00"
                    step="0.01"
                    disabled={!formData.tipoPago}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Depósito Manual (Opcional)
                  </label>
                  <input
                    type="number"
                    name="depositoManual"
                    value={formData.depositoManual}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingId(null)
                    setFormData({
                      fecha: new Date().toISOString().split('T')[0],
                      ventasBrutas: '',
                      tipoPago: '',
                      importeTipoPago: '',
                      depositoManual: ''
                    })
                  }}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  {editingId ? 'Actualizar Movimiento' : 'Crear Movimiento'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de movimientos */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Historial de Movimientos</h3>
          {movimientos.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay movimientos registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Venta Bruta
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo de Pago
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Importe
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Depósito Manual
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Saldo del Día
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Saldo Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentMovimientos.map((movimiento) => {
                    // Determinar el tipo de pago y su importe
                    let tipoPago = '-'
                    let importeTipoPago = 0
                    
                    if (movimiento.credito && movimiento.credito > 0) {
                      tipoPago = 'Crédito'
                      importeTipoPago = movimiento.credito
                    } else if (movimiento.abonosCredito && movimiento.abonosCredito > 0) {
                      tipoPago = 'Abonos Crédito'
                      importeTipoPago = movimiento.abonosCredito
                    } else if (movimiento.recargas && movimiento.recargas > 0) {
                      tipoPago = 'Recargas'
                      importeTipoPago = movimiento.recargas
                    } else if (movimiento.pagoTarjeta && movimiento.pagoTarjeta > 0) {
                      tipoPago = 'Pago Tarjeta'
                      importeTipoPago = movimiento.pagoTarjeta
                    } else if (movimiento.transferencias && movimiento.transferencias > 0) {
                      tipoPago = 'Transferencias'
                      importeTipoPago = movimiento.transferencias
                    } else if (movimiento.gastos && movimiento.gastos > 0) {
                      tipoPago = 'Gastos'
                      importeTipoPago = movimiento.gastos
                    }

                    // Calcular Saldo del Día: Venta Bruta - Tipo de Pago
                    const saldoDelDia = (movimiento.ventasBrutas || 0) - importeTipoPago
                    
                    // Calcular Saldo Total: Venta Bruta - Gastos - Depósito Manual
                    const saldoTotal = (movimiento.ventasBrutas || 0) - (movimiento.gastos || 0) - (movimiento.depositoManual || 0)

                    return (
                      <tr key={movimiento.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(movimiento.fecha).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                          {movimiento.ventasBrutas ? `$${movimiento.ventasBrutas.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {tipoPago}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                          {importeTipoPago > 0 ? `$${importeTipoPago.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600">
                          {movimiento.depositoManual ? `$${movimiento.depositoManual.toLocaleString()}` : '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          saldoDelDia >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ${saldoDelDia.toLocaleString()}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                          saldoTotal >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ${saldoTotal.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(movimiento)}
                              className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded text-xs"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(movimiento.id)}
                              className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-xs"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          {movimientosFiltrados.length > itemsPerPage && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-b-lg">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={goToNextPage}
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
                    <span className="font-medium">{startIndex + 1}</span>
                    {' '}a{' '}
                    <span className="font-medium">{Math.min(endIndex, movimientosFiltrados.length)}</span>
                    {' '}de{' '}
                    <span className="font-medium">{movimientosFiltrados.length}</span>
                    {' '}resultados
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Anterior</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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
                            onClick={() => goToPage(page)}
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
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Siguiente</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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
