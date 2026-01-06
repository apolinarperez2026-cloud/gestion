'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthUser, FormaDePago, TipoGasto, Movimiento, MovimientoTipo } from '@/types/database'
import ConfirmModal from '@/components/ConfirmModal'
import { useConfirmModal } from '@/hooks/useConfirmModal'
import { displayDateOnly } from '@/lib/dateUtils'
import UploadThingComponent from '@/components/UploadThing'

interface MovimientoForm {
  fecha: string
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
  const [uploadResetKey, setUploadResetKey] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })
  const [stats, setStats] = useState({
    totalIngresos: 0,
    totalGastos: 0,
    balance: 0,
    countMovimientos: 0
  })
  const { modalState, showConfirm, hideConfirm, handleConfirm } = useConfirmModal()
  const [formData, setFormData] = useState<MovimientoForm>({
    fecha: new Date().toISOString().split('T')[0], // Fecha actual en formato YYYY-MM-DD
    descripcion: '',
    monto: '',
    tipo: MovimientoTipo.GASTO,
    imagen: '',
    formaDePagoId: '',
    tipoGastoId: ''
  })
  const [editingMovimiento, setEditingMovimiento] = useState<Movimiento | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedMovimiento, setSelectedMovimiento] = useState<Movimiento | null>(null)
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
  }, [router, selectedMonth])

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

  // Función para calcular estadísticas
  const calculateStats = (movimientos: Movimiento[]) => {
    const ventas = movimientos.filter(m => m.tipo === 'VENTA')
    const gastos = movimientos.filter(m => m.tipo === 'GASTO')
    const fondoCaja = movimientos.filter(m => m.tipo === 'FONDO_CAJA')
    
    const totalVentas = ventas.reduce((sum, m) => sum + m.monto, 0)
    const totalGastos = gastos.reduce((sum, m) => sum + m.monto, 0)
    const totalFondoCaja = fondoCaja.reduce((sum, m) => sum + m.monto, 0)
    
    setStats({
      totalIngresos: totalVentas + totalFondoCaja,
      totalGastos,
      balance: totalVentas + totalFondoCaja - totalGastos,
      countMovimientos: movimientos.length
    })
  }

  const fetchMovimientos = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/movimientos?month=${selectedMonth}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setMovimientos(data.movimientos || [])
        calculateStats(data.movimientos || [])
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

    // Validación de forma de pago eliminada ya que solo se manejan gastos

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
        fecha: formData.fecha,
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
          fecha: new Date().toISOString().split('T')[0],
          descripcion: '',
          monto: '',
          tipo: MovimientoTipo.GASTO,
          imagen: '',
          formaDePagoId: '',
          tipoGastoId: ''
        })
        
        // Resetear el componente de upload
        setUploadResetKey(prev => prev + 1)
        
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
        [name]: value,
        // Limpiar campos cuando cambia el tipo
        ...(name === 'tipo' && {
          formaDePagoId: '',
          tipoGastoId: ''
        })
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
      fecha: new Date(movimiento.fecha).toISOString().split('T')[0],
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

    // Validación de forma de pago eliminada ya que solo se manejan gastos

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
          fecha: formData.fecha,
          descripcion: formData.descripcion,
          monto: parseFloat(formData.monto),
          tipo: formData.tipo,
          imagen: formData.imagen || null,
          formaDePagoId: formData.tipo === MovimientoTipo.VENTA ? parseInt(formData.formaDePagoId) : null,
          tipoGastoId: formData.tipo === MovimientoTipo.GASTO ? parseInt(formData.tipoGastoId) : null,
          usuarioId: user?.id
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
              fecha: new Date().toISOString().split('T')[0],
              descripcion: '',
              monto: '',
              tipo: MovimientoTipo.GASTO,
              imagen: '',
              formaDePagoId: '',
              tipoGastoId: ''
            })
            // Resetear el componente de upload
            setUploadResetKey(prev => prev + 1)
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
      fecha: new Date().toISOString().split('T')[0],
      descripcion: '',
      monto: '',
      tipo: MovimientoTipo.GASTO,
      imagen: '',
      formaDePagoId: '',
      tipoGastoId: ''
    })
    // Resetear el componente de upload
    setUploadResetKey(prev => prev + 1)
  }

  const handleRowClick = (movimiento: Movimiento) => {
    setSelectedMovimiento(movimiento)
    setShowDetailsModal(true)
  }

  // Función para calcular gastos por categoría
  const getGastosPorCategoria = () => {
    const gastos = movimientos.filter(m => m.tipo === MovimientoTipo.GASTO)
    const gastosPorCategoria: { [key: string]: { nombre: string; total: number; cantidad: number } } = {}
    
    // Inicializar todas las categorías con valores en 0
    tiposGasto.forEach(tipo => {
      gastosPorCategoria[tipo.id.toString()] = {
        nombre: tipo.nombre,
        total: 0,
        cantidad: 0
      }
    })
    
    // Agregar los gastos reales
    gastos.forEach(gasto => {
      if (gasto.tipoGasto) {
        const categoriaId = gasto.tipoGasto.id.toString()
        gastosPorCategoria[categoriaId].total += gasto.monto
        gastosPorCategoria[categoriaId].cantidad += 1
      }
    })
    
    return Object.values(gastosPorCategoria).sort((a, b) => b.total - a.total)
  }

  // Función para obtener el total de gastos
  const getTotalGastos = () => {
    return movimientos
      .filter(m => m.tipo === MovimientoTipo.GASTO)
      .reduce((sum, m) => sum + m.monto, 0)
  }

  // Filtrar movimientos por término de búsqueda y solo mostrar gastos
  const movimientosFiltrados = movimientos.filter(movimiento => {
    // Solo mostrar gastos
    if (movimiento.tipo !== MovimientoTipo.GASTO) return false
    
    if (!searchTerm) return true
    
    const termino = searchTerm.toLowerCase()
    return (
      movimiento.descripcion.toLowerCase().includes(termino) ||
      movimiento.tipo.toLowerCase().includes(termino) ||
      (movimiento.formaDePago?.nombre.toLowerCase().includes(termino)) ||
      (movimiento.tipoGasto?.nombre.toLowerCase().includes(termino)) ||
      movimiento.monto.toString().includes(termino) ||
      displayDateOnly(movimiento.fecha).includes(termino)
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
      <main className=" mx-auto px-0 sm:px-4 lg:px-40  py-8">
        {/* Resumen Compacto de Gastos por Categoría */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Resumen de Gastos por Categoría</h2>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-800">${getTotalGastos().toLocaleString('en-US')}</p>
              <p className="text-xs text-gray-500">
                {movimientos.filter(m => m.tipo === MovimientoTipo.GASTO).length} gastos totales
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {getGastosPorCategoria().map((categoria, index) => (
              <div key={index} className={`p-3 rounded-lg border ${categoria.total === 0 ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-200'}`}>
                <div className="text-center">
                  <h3 className={`text-xs font-medium truncate mb-1 ${categoria.total === 0 ? 'text-gray-500' : 'text-gray-900'}`}>
                    {categoria.nombre}
                  </h3>
                  <p className={`text-lg font-bold ${categoria.total === 0 ? 'text-gray-400' : 'text-red-600'}`}>
                    ${categoria.total.toLocaleString('en-US')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {categoria.cantidad} {categoria.cantidad === 1 ? 'gasto' : 'gastos'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

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
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
                <p className="text-sm font-medium text-gray-500">Total Ingresos</p>
                <p className="text-2xl font-semibold text-green-600">${stats.totalIngresos.toLocaleString('en-US')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Gastos</p>
                <p className="text-2xl font-semibold text-red-600">${stats.totalGastos.toLocaleString('en-US')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Balance</p>
                <p className={`text-2xl font-semibold ${stats.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${stats.balance.toLocaleString('en-US')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Movimientos</p>
                <p className="text-2xl font-semibold text-purple-600">{stats.countMovimientos}</p>
              </div>
            </div>
          </div>
        </div>

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
                  Fecha *
                </label>
                <input
                  type="date"
                  name="fecha"
                  value={formData.fecha}
                  onChange={handleChange}
                  className="input-field"
                  required
                  disabled={!user?.sucursalId}
                />
              </div>

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
                  type="text"
                  name="monto"
                  value={formData.monto}
                  onChange={handleChange}
                  onKeyPress={handleKeyPress}
                  className="input-field"
                  placeholder="0.00"
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
                  resetKey={uploadResetKey}
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
                  {/* Vista de tarjetas para móvil */}
                  <div className="block lg:hidden space-y-4 p-4">
                    {movimientosPaginados.map((movimiento) => (
                      <div 
                        key={movimiento.id} 
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleRowClick(movimiento)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                movimiento.tipo === MovimientoTipo.VENTA 
                                  ? 'bg-green-100 text-green-800' 
                                  : movimiento.tipo === MovimientoTipo.GASTO
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {movimiento.tipo === MovimientoTipo.FONDO_CAJA ? 'FONDO CAJA' : movimiento.tipo}
                              </span>
                              <span className="text-sm text-gray-500">
                                {displayDateOnly(movimiento.fecha)}
                              </span>
                            </div>
                            <h3 className="text-sm font-medium text-gray-900 mb-1">
                              {movimiento.descripcion}
                            </h3>
                            <p className="text-xs text-gray-500">
                              {movimiento.tipo === MovimientoTipo.VENTA 
                                ? movimiento.formaDePago?.nombre || 'N/A'
                                : movimiento.tipo === MovimientoTipo.GASTO
                                ? movimiento.tipoGasto?.nombre || 'N/A'
                                : 'N/A'
                              }
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <p className={`text-lg font-bold ${
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
                              }${movimiento.monto.toLocaleString('en-US')}
                            </p>
                            <div className="flex space-x-2 mt-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEdit(movimiento)
                                }}
                                className="text-blue-600 hover:text-blue-900 p-1"
                                title="Editar"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              {user?.rol.nombre === 'Administrador' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDelete(movimiento)
                                  }}
                                  className="text-red-600 hover:text-red-900 p-1"
                                  title="Eliminar"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                          <div className="flex items-center space-x-3">
                            {movimiento.imagen ? (
                              <img
                                src={movimiento.imagen}
                                alt="Imagen del movimiento"
                                className="w-10 h-10 object-cover rounded border border-gray-300"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-100 rounded border border-gray-300 flex items-center justify-center">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-medium text-gray-900">
                                {movimiento.usuario?.nombre || 'Sistema'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {movimiento.usuario?.rol?.nombre || 'Sin rol'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">
                              Toca para ver detalles
                            </p>
                          </div>
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
                        <tr 
                          key={movimiento.id} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleRowClick(movimiento)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {displayDateOnly(movimiento.fecha)}
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
                            }${movimiento.monto.toLocaleString('en-US')}
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
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEdit(movimiento)
                                }}
                                className="text-blue-600 hover:text-blue-900"
                                title="Editar"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              {user?.rol.nombre === 'Administrador' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDelete(movimiento)
                                  }}
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

      {/* Modal de detalles del gasto */}
      {showDetailsModal && selectedMovimiento && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Detalles del Gasto</h3>
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
                      {displayDateOnly(selectedMovimiento.fecha)}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Monto</label>
                    <p className="mt-1 text-sm font-bold text-red-600">
                      -${selectedMovimiento.monto.toLocaleString('en-US')}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo de Gasto</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedMovimiento.tipoGasto?.nombre || 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Registrado por</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedMovimiento.usuario?.nombre || 'Sistema'}
                    </p>
                  </div>
                </div>
                
                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Descripción</label>
                  <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                    {selectedMovimiento.descripcion}
                  </p>
                </div>
                
                {/* Imagen */}
                {selectedMovimiento.imagen && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Comprobante</label>
                    <div className="flex justify-center">
                      <img
                        src={selectedMovimiento.imagen}
                        alt="Comprobante del gasto"
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
                      {new Date(selectedMovimiento.createdAt).toLocaleString('en-US')}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Última Actualización</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedMovimiento.updatedAt).toLocaleString('en-US')}
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
