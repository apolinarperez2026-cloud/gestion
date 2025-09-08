'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Movimiento, AuthUser } from '@/types/database'
import SummaryCards from '@/components/SummaryCards'

export default function ResumenPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [mesSeleccionado, setMesSeleccionado] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
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

  useEffect(() => {
    if (user) {
      fetchMovimientos()
    }
  }, [mesSeleccionado, user])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

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
        setMovimientos(data.movimientos || [])
      }
    } catch (error) {
      console.error('Error al cargar movimientos:', error)
    } finally {
      setLoading(false)
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

  // Filtrar movimientos por mes seleccionado
  const movimientosDelMes = movimientos.filter(movimiento => {
    const fechaMovimiento = new Date(movimiento.fecha)
    const [año, mes] = mesSeleccionado.split('-')
    return fechaMovimiento.getFullYear() === parseInt(año) && 
           fechaMovimiento.getMonth() === parseInt(mes) - 1
  })

  // Calcular resumen del mes
  const calcularResumen = () => {
    let totalVentas = 0
    let totalGastos = 0
    let totalEfectivo = 0
    let totalCredito = 0
    let totalAbonosCredito = 0
    let totalRecargas = 0
    let totalPagoTarjeta = 0
    let totalTransferencias = 0
    let totalCheque = 0
    let totalDepositoBancario = 0

    movimientosDelMes.forEach(movimiento => {
      if (movimiento.tipo === 'VENTA') {
        totalVentas += movimiento.monto
        
        // Agrupar por forma de pago
        const formaPago = movimiento.formaDePago?.nombre
        switch (formaPago) {
          case 'Efectivo':
            totalEfectivo += movimiento.monto
            break
          case 'Crédito':
            totalCredito += movimiento.monto
            break
          case 'Abonos de Crédito':
            totalAbonosCredito += movimiento.monto
            break
          case 'Recargas':
            totalRecargas += movimiento.monto
            break
          case 'Pago con Tarjeta':
            totalPagoTarjeta += movimiento.monto
            break
          case 'Transferencias':
            totalTransferencias += movimiento.monto
            break
          case 'Cheque':
            totalCheque += movimiento.monto
            break
          case 'Depósito Bancario':
            totalDepositoBancario += movimiento.monto
            break
        }
      } else if (movimiento.tipo === 'GASTO') {
        totalGastos += movimiento.monto
      }
    })

    const totalSaldo = totalVentas - totalGastos

    return {
      totalVentas,
      totalGastos,
      totalEfectivo,
      totalCredito,
      totalAbonosCredito,
      totalRecargas,
      totalPagoTarjeta,
      totalTransferencias,
      totalCheque,
      totalDepositoBancario,
      totalSaldo,
      cantidadMovimientos: movimientosDelMes.length
    }
  }

  const resumen = calcularResumen()

  // Agrupar movimientos por día
  const movimientosPorDia = movimientosDelMes.reduce((acc, movimiento) => {
    const fecha = new Date(movimiento.fecha).toLocaleDateString()
    
    if (!acc[fecha]) {
      acc[fecha] = {
        fecha: new Date(movimiento.fecha),
        movimientos: [],
        totalVentas: 0,
        totalGastos: 0,
        totalEfectivo: 0,
        totalCredito: 0,
        totalAbonosCredito: 0,
        totalRecargas: 0,
        totalPagoTarjeta: 0,
        totalTransferencias: 0,
        totalCheque: 0,
        totalDepositoBancario: 0,
        saldoDia: 0
      }
    }
    
    acc[fecha].movimientos.push(movimiento)
    
    if (movimiento.tipo === 'VENTA') {
      acc[fecha].totalVentas += movimiento.monto
      
      // Agrupar por forma de pago
      const formaPago = movimiento.formaDePago?.nombre
      switch (formaPago) {
        case 'Efectivo':
          acc[fecha].totalEfectivo += movimiento.monto
          break
        case 'Crédito':
          acc[fecha].totalCredito += movimiento.monto
          break
        case 'Abonos de Crédito':
          acc[fecha].totalAbonosCredito += movimiento.monto
          break
        case 'Recargas':
          acc[fecha].totalRecargas += movimiento.monto
          break
        case 'Pago con Tarjeta':
          acc[fecha].totalPagoTarjeta += movimiento.monto
          break
        case 'Transferencias':
          acc[fecha].totalTransferencias += movimiento.monto
          break
        case 'Cheque':
          acc[fecha].totalCheque += movimiento.monto
          break
        case 'Depósito Bancario':
          acc[fecha].totalDepositoBancario += movimiento.monto
          break
      }
    } else if (movimiento.tipo === 'GASTO') {
      acc[fecha].totalGastos += movimiento.monto
    }
    
    acc[fecha].saldoDia = acc[fecha].totalVentas - acc[fecha].totalGastos
    
    return acc
  }, {} as Record<string, any>)

  // Convertir a array y ordenar por fecha
  const diasOrdenados = Object.values(movimientosPorDia).sort((a: any, b: any) => 
    new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  )

  // Filtrar días por término de búsqueda
  const diasFiltrados = diasOrdenados.filter((dia: any) => {
    if (!searchTerm) return true
    
    const fechaStr = dia.fecha.toLocaleDateString('es-ES')
    const movimientosStr = dia.movimientos.map((m: any) => 
      `${m.descripcion} ${m.tipo} ${m.formaDePago?.nombre || ''} ${m.tipoGasto?.nombre || ''}`
    ).join(' ')
    
    return fechaStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
           movimientosStr.toLowerCase().includes(searchTerm.toLowerCase())
  })

  // Paginación
  const totalPages = Math.ceil(diasFiltrados.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const diasPaginados = diasFiltrados.slice(startIndex, endIndex)

  // Obtener nombre del mes
  const obtenerNombreMes = (mesString: string) => {
    const [año, mes] = mesString.split('-')
    const fecha = new Date(parseInt(año), parseInt(mes) - 1)
    return fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
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
                  Resumen Financiero
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
        {/* Selector de Mes con Calendario */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Seleccionar Mes y Año</h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Año
                </label>
                <select
                  value={mesSeleccionado.split('-')[0]}
                  onChange={(e) => {
                    const nuevoAño = e.target.value
                    const mesActual = mesSeleccionado.split('-')[1]
                    setMesSeleccionado(`${nuevoAño}-${mesActual}`)
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {Array.from({ length: 10 }, (_, i) => {
                    const año = new Date().getFullYear() - 5 + i
                    return (
                      <option key={año} value={año}>
                        {año}
                      </option>
                    )
                  })}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mes
                </label>
                <select
                  value={mesSeleccionado.split('-')[1]}
                  onChange={(e) => {
                    const nuevoMes = e.target.value
                    const añoActual = mesSeleccionado.split('-')[0]
                    setMesSeleccionado(`${añoActual}-${nuevoMes}`)
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="01">Enero</option>
                  <option value="02">Febrero</option>
                  <option value="03">Marzo</option>
                  <option value="04">Abril</option>
                  <option value="05">Mayo</option>
                  <option value="06">Junio</option>
                  <option value="07">Julio</option>
                  <option value="08">Agosto</option>
                  <option value="09">Septiembre</option>
                  <option value="10">Octubre</option>
                  <option value="11">Noviembre</option>
                  <option value="12">Diciembre</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionado
                </label>
                <div className="bg-primary-50 border border-primary-200 rounded-lg px-4 py-2">
                  <p className="text-sm font-medium text-primary-800">
                    📅 {obtenerNombreMes(mesSeleccionado)}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Totales del Mes Seleccionado */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500">Total Ventas</p>
                  <p className="text-lg font-bold text-green-600">
                    ${resumen.totalVentas.toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500">Total Gastos</p>
                  <p className="text-lg font-bold text-red-600">
                    ${resumen.totalGastos.toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500">Saldo</p>
                  <p className={`text-lg font-bold ${resumen.totalSaldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${resumen.totalSaldo.toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500">Movimientos</p>
                  <p className="text-lg font-bold text-blue-600">
                    {resumen.cantidadMovimientos}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Desglose Detallado */}
        <div className="mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {/* Efectivo */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
              <div className="text-center">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-gray-500 mb-1">Efectivo</p>
                <p className="text-sm font-bold text-gray-900">
                  ${resumen.totalEfectivo.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Crédito */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
              <div className="text-center">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-gray-500 mb-1">Crédito</p>
                <p className="text-sm font-bold text-gray-900">
                  ${resumen.totalCredito.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Abonos de Crédito */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
              <div className="text-center">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-gray-500 mb-1">Abonos</p>
                <p className="text-sm font-bold text-gray-900">
                  ${resumen.totalAbonosCredito.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Recargas */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
              <div className="text-center">
                <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-3 h-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-gray-500 mb-1">Recargas</p>
                <p className="text-sm font-bold text-gray-900">
                  ${resumen.totalRecargas.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Pago con Tarjeta */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
              <div className="text-center">
                <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-gray-500 mb-1">Tarjeta</p>
                <p className="text-sm font-bold text-gray-900">
                  ${resumen.totalPagoTarjeta.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Transferencias */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
              <div className="text-center">
                <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-3 h-3 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-gray-500 mb-1">Transf.</p>
                <p className="text-sm font-bold text-gray-900">
                  ${resumen.totalTransferencias.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Cheque */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
              <div className="text-center">
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-gray-500 mb-1">Cheque</p>
                <p className="text-sm font-bold text-gray-900">
                  ${resumen.totalCheque.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Depósito Bancario */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
              <div className="text-center">
                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-gray-500 mb-1">Depósito</p>
                <p className="text-sm font-bold text-gray-900">
                  ${resumen.totalDepositoBancario.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Movimientos del Mes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Movimientos de {obtenerNombreMes(mesSeleccionado)}
                </h3>
              </div>
              
              {/* Buscador */}
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por fecha o descripción..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            {/* Contador de resultados */}
            {searchTerm && (
              <div className="mt-3 text-sm text-gray-600">
                {diasFiltrados.length === 0 ? (
                  <span>No se encontraron resultados para "{searchTerm}"</span>
                ) : (
                  <span>
                    Mostrando {diasFiltrados.length} de {diasOrdenados.length} días
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="ml-2 text-blue-600 hover:text-blue-800 underline"
                      >
                        Limpiar búsqueda
                      </button>
                    )}
                  </span>
                )}
              </div>
            )}
          </div>
          
          {movimientosDelMes.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-lg font-medium text-gray-900 mb-2">No hay movimientos en este mes</p>
              <p className="text-gray-500">Selecciona otro mes para ver los movimientos</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200 table-fixed">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-20 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="w-24 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ventas
                      </th>
                      <th className="w-20 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Efectivo
                      </th>
                      <th className="w-20 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Crédito
                      </th>
                      <th className="w-20 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Abonos
                      </th>
                      <th className="w-20 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recargas
                      </th>
                      <th className="w-20 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tarjeta
                      </th>
                      <th className="w-20 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transf.
                      </th>
                      <th className="w-20 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cheque
                      </th>
                      <th className="w-20 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Depósito
                      </th>
                      <th className="w-24 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gastos
                      </th>
                      <th className="w-24 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Saldo
                      </th>
                      <th className="w-16 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        #
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {diasPaginados.map((dia: any, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-2 py-3 text-xs font-medium text-gray-900">
                          {dia.fecha.toLocaleDateString('es-ES', { 
                            day: '2-digit', 
                            month: '2-digit' 
                          })}
                        </td>
                        <td className="px-2 py-3 text-xs text-green-600 font-medium">
                          ${dia.totalVentas.toLocaleString()}
                        </td>
                        <td className="px-2 py-3 text-xs text-gray-900">
                          ${dia.totalEfectivo.toLocaleString()}
                        </td>
                        <td className="px-2 py-3 text-xs text-gray-900">
                          ${dia.totalCredito.toLocaleString()}
                        </td>
                        <td className="px-2 py-3 text-xs text-gray-900">
                          ${dia.totalAbonosCredito.toLocaleString()}
                        </td>
                        <td className="px-2 py-3 text-xs text-gray-900">
                          ${dia.totalRecargas.toLocaleString()}
                        </td>
                        <td className="px-2 py-3 text-xs text-gray-900">
                          ${dia.totalPagoTarjeta.toLocaleString()}
                        </td>
                        <td className="px-2 py-3 text-xs text-gray-900">
                          ${dia.totalTransferencias.toLocaleString()}
                        </td>
                        <td className="px-2 py-3 text-xs text-gray-900">
                          ${dia.totalCheque.toLocaleString()}
                        </td>
                        <td className="px-2 py-3 text-xs text-gray-900">
                          ${dia.totalDepositoBancario.toLocaleString()}
                        </td>
                        <td className="px-2 py-3 text-xs text-red-600 font-medium">
                          ${dia.totalGastos.toLocaleString()}
                        </td>
                        <td className={`px-2 py-3 text-xs font-bold ${
                          dia.saldoDia >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ${dia.saldoDia.toLocaleString()}
                        </td>
                        <td className="px-2 py-3 text-xs text-gray-900">
                          <span className="inline-flex px-1 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                            {dia.movimientos.length}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Paginación */}
              {diasFiltrados.length > itemsPerPage && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Información de resultados */}
                    <div className="text-sm text-gray-700 text-center sm:text-left">
                      Mostrando {startIndex + 1} a {Math.min(endIndex, diasFiltrados.length)} de {diasFiltrados.length} días
                    </div>
                    
                    {/* Controles de paginación */}
                    <div className="flex justify-center">
                      <nav className="flex items-center space-x-1">
                        {/* Botón Anterior */}
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Anterior
                        </button>
                        
                        {/* Números de página */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (currentPage <= 3) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = currentPage - 2 + i
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-2 text-sm font-medium border-t border-b ${
                                currentPage === pageNum
                                  ? 'bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          )
                        })}
                        
                        {/* Botón Siguiente */}
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Siguiente
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}