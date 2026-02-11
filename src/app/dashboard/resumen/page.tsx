'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MovimientoDiario, AuthUser } from '@/types/database'
import SummaryCards from '@/components/SummaryCards'
import * as XLSX from 'xlsx'

export default function ResumenPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [movimientosDiarios, setMovimientosDiarios] = useState<MovimientoDiario[]>([])
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
          fetchMovimientosDiarios()
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
      fetchMovimientosDiarios()
    }
  }, [mesSeleccionado, user])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const fetchMovimientosDiarios = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch('/api/movimientos-diarios', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setMovimientosDiarios(data.movimientosDiarios || [])
      }
    } catch (error) {
      console.error('Error al cargar movimientos diarios:', error)
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

  const exportarAExcel = () => {
    // Función auxiliar para normalizar fechas (solo año, mes, día, sin hora)
    const normalizarFecha = (fecha: Date): string => {
      const año = fecha.getFullYear()
      const mes = String(fecha.getMonth() + 1).padStart(2, '0')
      const dia = String(fecha.getDate()).padStart(2, '0')
      return `${año}-${mes}-${dia}`
    }
    
    // Generar todos los días del mes seleccionado
    const [año, mes] = mesSeleccionado.split('-')
    const añoNum = parseInt(año)
    const mesNum = parseInt(mes)
    const diasEnMes = new Date(añoNum, mesNum, 0).getDate()
    
    // Crear un mapa de movimientos por fecha para búsqueda rápida
    const movimientosPorFecha = new Map<string, any>()
    movimientosPorDia.forEach((dia: any) => {
      const fechaDate = new Date(dia.fecha)
      const fechaKey = normalizarFecha(fechaDate)
      movimientosPorFecha.set(fechaKey, dia)
    })
    
    // Generar array con todos los días del mes
    const todosLosDias: any[] = []
    let saldoAcumuladoAnterior = 0
    
    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fecha = new Date(añoNum, mesNum - 1, dia)
      const fechaKey = normalizarFecha(fecha)
      const movimiento = movimientosPorFecha.get(fechaKey)
      
      let datosDia: any
      
      if (movimiento) {
        // Usar datos reales del movimiento
        datosDia = {
          fecha: new Date(fecha),
          totalVentas: movimiento.totalVentas || 0,
          totalCredito: movimiento.totalCredito || 0,
          totalAbonosCredito: movimiento.totalAbonosCredito || 0,
          totalRecargas: movimiento.totalRecargas || 0,
          totalPagoTarjeta: movimiento.totalPagoTarjeta || 0,
          totalTransferencias: movimiento.totalTransferencias || 0,
          totalGastos: movimiento.totalGastos || 0,
          totalDepositos: movimiento.totalDepositos || 0
        }
      } else {
        // Crear entrada con valores en cero
        datosDia = {
          fecha: new Date(fecha),
          totalVentas: 0,
          totalCredito: 0,
          totalAbonosCredito: 0,
          totalRecargas: 0,
          totalPagoTarjeta: 0,
          totalTransferencias: 0,
          totalGastos: 0,
          totalDepositos: 0
        }
      }
      
      // Calcular Saldo del Día según fórmula del Excel: Ventas Brutas - Crédito - Recargas - Pago con Tarjeta - Transferencias - Gastos
      const saldoDelDia = datosDia.totalVentas - datosDia.totalCredito - datosDia.totalRecargas - datosDia.totalPagoTarjeta - datosDia.totalTransferencias - datosDia.totalGastos
      
      // Calcular Saldo Acumulado: Saldo Acumulado anterior + Saldo del Día - Depósitos
      const saldoAcumulado = saldoAcumuladoAnterior + saldoDelDia - datosDia.totalDepositos
      saldoAcumuladoAnterior = saldoAcumulado
      
      todosLosDias.push({
        ...datosDia,
        saldoDelDiaCalculado: saldoDelDia,
        saldoAcumulado: saldoAcumulado
      })
    }
    
    // Preparar datos para exportar - orden y formato exacto como el Excel manual
    const datosExcel = todosLosDias.map((dia: any) => ({
      'Fecha': dia.fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      'Ventas Brutas': parseFloat(dia.totalVentas.toFixed(2)),
      'Crédito': parseFloat(dia.totalCredito.toFixed(2)),
      'Abonos': parseFloat(dia.totalAbonosCredito.toFixed(2)),
      'Recargas': parseFloat(dia.totalRecargas.toFixed(2)),
      'Pago con Tarjeta': parseFloat(dia.totalPagoTarjeta.toFixed(2)),
      'Transferencias': parseFloat(dia.totalTransferencias.toFixed(2)),
      'Gastos': parseFloat(dia.totalGastos.toFixed(2)),
      'Saldo del Día': parseFloat(dia.saldoDelDiaCalculado.toFixed(2)),
      'Depósitos': parseFloat(dia.totalDepositos.toFixed(2)),
      'Saldo Acumulado': parseFloat(dia.saldoAcumulado.toFixed(2))
    }))

    // Crear hoja de trabajo
    const ws = XLSX.utils.json_to_sheet(datosExcel)

    // Crear libro de trabajo
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen Mensual')

    // Generar nombre de archivo con mes y año
    const nombreArchivo = `Resumen_${obtenerNombreMes(mesSeleccionado)}_${año}.xlsx`

    // Descargar archivo
    XLSX.writeFile(wb, nombreArchivo)
  }

  // Filtrar movimientos diarios por mes seleccionado y ordenar por fecha ascendente
  const movimientosDelMes = movimientosDiarios
    .filter(movimiento => {
      const fechaMovimiento = new Date(movimiento.fecha)
      const [año, mes] = mesSeleccionado.split('-')
      return fechaMovimiento.getFullYear() === parseInt(año) && 
             fechaMovimiento.getMonth() === parseInt(mes) - 1
    })
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())

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

    movimientosDelMes.forEach(movimiento => {
      totalVentas += movimiento.ventasBrutas
      totalGastos += movimiento.gastos
      totalEfectivo += movimiento.efectivo
      totalCredito += movimiento.credito
      totalAbonosCredito += movimiento.abonosCredito
      totalRecargas += movimiento.recargas
      totalPagoTarjeta += movimiento.pagoTarjeta
      totalTransferencias += movimiento.transferencias
    })

    const totalSaldo = totalVentas - totalGastos
    
    // Calcular depósitos
    let totalDepositos = 0
    movimientosDelMes.forEach(movimiento => {
      totalDepositos += movimiento.depositos || 0
    })
    
    // Calcular Saldo del Día y Saldo Acumulado
    const saldoDelDia = totalVentas - totalCredito - totalRecargas - totalPagoTarjeta - totalTransferencias - totalGastos
    const saldoAcumulado = saldoDelDia - totalDepositos

    return {
      totalVentas,
      totalGastos,
      totalEfectivo,
      totalCredito,
      totalAbonosCredito,
      totalRecargas,
      totalPagoTarjeta,
      totalTransferencias,
      totalDepositos,
      saldoDelDia,
      saldoAcumulado,
      totalSaldo,
      cantidadMovimientos: movimientosDelMes.length
    }
  }

  const resumen = calcularResumen()

  // Los movimientos diarios ya están agrupados por día, solo necesitamos mapearlos
  const movimientosPorDia = movimientosDelMes.map((movimiento, index) => {
    // Calcular saldo del día según fórmula del Excel: Ventas Brutas - Crédito - Recargas - Pago con Tarjeta - Transferencias - Gastos
    const saldoDelDia = movimiento.ventasBrutas - movimiento.credito - movimiento.recargas - movimiento.pagoTarjeta - movimiento.transferencias - movimiento.gastos
    
    // Calcular saldo acumulado (arrastrando del día anterior)
    let saldoAcumulado = 0
    
    // Si no es el primer día, calcular el saldo acumulado anterior
    if (index > 0) {
      let saldoAcumuladoAnterior = 0
      for (let i = 0; i < index; i++) {
        const mov = movimientosDelMes[i]
        const saldoDia = mov.ventasBrutas - mov.credito - mov.recargas - mov.pagoTarjeta - mov.transferencias - mov.gastos
        saldoAcumuladoAnterior = saldoAcumuladoAnterior + saldoDia - (mov.depositos || 0)
      }
      saldoAcumulado = saldoAcumuladoAnterior + saldoDelDia - (movimiento.depositos || 0)
    } else {
      // Primer día: Saldo Acumulado = Saldo del Día - Depósitos
      saldoAcumulado = saldoDelDia - (movimiento.depositos || 0)
    }
    
    return {
      fecha: new Date(movimiento.fecha),
      movimientos: [movimiento],
      totalVentas: movimiento.ventasBrutas,
      totalGastos: movimiento.gastos,
      totalEfectivo: movimiento.efectivo,
      totalCredito: movimiento.credito,
      totalAbonosCredito: movimiento.abonosCredito,
      totalRecargas: movimiento.recargas,
      totalPagoTarjeta: movimiento.pagoTarjeta,
      totalTransferencias: movimiento.transferencias,
      totalDepositos: movimiento.depositos || 0,
      saldoDia: movimiento.saldoDia,
      saldoDelDiaCalculado: saldoDelDia,
      saldoAcumulado: saldoAcumulado
    }
  })

  // Ordenar por fecha
  const diasOrdenados = movimientosPorDia.sort((a: any, b: any) => 
    new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  )

  // Filtrar días por término de búsqueda
  const diasFiltrados = diasOrdenados.filter((dia: any) => {
    if (!searchTerm) return true
    
    const fechaStr = dia.fecha.toLocaleDateString('es-ES')
    const observacionesStr = dia.movimientos[0]?.observaciones || ''
    
    return fechaStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
           observacionesStr.toLowerCase().includes(searchTerm.toLowerCase())
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
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-6">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-2 transition-colors"
              >
                <span className="text-xl">←</span> Dashboard
              </button>
              <div>
                <h1 className="text-3xl font-extrabold text-blue-900 tracking-tight drop-shadow-sm">
                  Resumen Empresarial
                </h1>
                <p className="text-base text-gray-500 font-medium mt-1">
                  {user.sucursal?.nombre || 'Sin sucursal'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-base font-bold text-blue-900">{user.nombre}</p>
                <p className="text-xs text-gray-400">{user.rol.nombre}</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition-colors text-sm font-semibold"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className=" mx-auto px-4 2xl:px-28 sm:px-6 lg:px-8 py-8">
        {/* Selector de Mes con Calendario */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-blue-900 mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Seleccionar Mes y Año
            </h2>
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

              {user?.rol?.nombre === 'Administrador' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exportar
                  </label>
                  <button
                    onClick={exportarAExcel}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    title="Exportar a Excel"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Excel</span>
                  </button>
                </div>
              )}
            </div>
            
            {/* Totales del Mes Seleccionado */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500">Total Ventas</p>
                  <p className="text-lg font-bold text-green-600">
                    ${resumen.totalVentas.toLocaleString('en-US')}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500">Total Gastos</p>
                  <p className="text-lg font-bold text-red-600">
                    ${resumen.totalGastos.toLocaleString('en-US')}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500">Saldo</p>
                  <p className={`text-lg font-bold ${resumen.totalSaldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${resumen.totalSaldo.toLocaleString('en-US')}
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
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-6">
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
                  ${resumen.totalCredito.toLocaleString('en-US')}
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
                  ${resumen.totalRecargas.toLocaleString('en-US')}
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
                  ${resumen.totalPagoTarjeta.toLocaleString('en-US')}
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
                  ${resumen.totalTransferencias.toLocaleString('en-US')}
                </p>
              </div>
            </div>

            {/* Saldo del Día */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
              <div className="text-center">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-gray-500 mb-1">Saldo Día</p>
                <p className="text-sm font-bold text-blue-600">
                  ${resumen.saldoDelDia.toLocaleString('en-US')}
                </p>
              </div>
            </div>

            {/* Depósitos */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
              <div className="text-center">
                <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-3 h-3 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-gray-500 mb-1">Depósitos</p>
                <p className="text-sm font-bold text-teal-600">
                  ${resumen.totalDepositos.toLocaleString('en-US')}
                </p>
              </div>
            </div>

            {/* Saldo Acumulado */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
              <div className="text-center">
                <div className={`w-6 h-6 ${resumen.saldoAcumulado >= 0 ? 'bg-green-100' : 'bg-red-100'} rounded-full flex items-center justify-center mx-auto mb-2`}>
                  <svg className={`w-3 h-3 ${resumen.saldoAcumulado >= 0 ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-gray-500 mb-1">Saldo Acum.</p>
                <p className={`text-sm font-bold ${resumen.saldoAcumulado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${resumen.saldoAcumulado.toLocaleString('en-US')}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Lista de Movimientos del Mes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-8 py-6 border-b border-gray-200">
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
              {/* Vista de tarjetas para móvil */}
              <div className="block lg:hidden space-y-6 p-4">
                {diasPaginados.map((dia: any, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {dia.fecha.toLocaleDateString('es-ES', { 
                            day: '2-digit', 
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {dia.movimientos.length} movimiento{dia.movimientos.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-600">
                          ${dia.totalVentas.toLocaleString('en-US')}
                        </p>
                        <p className="text-xs text-gray-500">Ventas</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="text-xs font-medium text-red-600 uppercase tracking-wide">Gastos</p>
                        <p className="text-sm font-bold text-red-900">${dia.totalGastos.toLocaleString('en-US')}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Saldo</p>
                        <p className={`text-sm font-bold ${(dia.totalVentas - dia.totalGastos) >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                          ${(dia.totalVentas - dia.totalGastos).toLocaleString('en-US')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Efectivo:</span>
                        <span className="font-medium">${dia.totalEfectivo.toLocaleString('en-US')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Crédito:</span>
                        <span className="font-medium">${dia.totalCredito.toLocaleString('en-US')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Abonos:</span>
                        <span className="font-medium">${dia.totalAbonosCredito.toLocaleString('en-US')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Recargas:</span>
                        <span className="font-medium">${dia.totalRecargas.toLocaleString('en-US')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tarjeta:</span>
                        <span className="font-medium">${dia.totalPagoTarjeta.toLocaleString('en-US')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Transf.:</span>
                        <span className="font-medium">${dia.totalTransferencias.toLocaleString('en-US')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Vista de tabla para desktop */}
              <div className="hidden lg:block overflow-x-auto rounded-xl shadow-lg bg-white">
                <table className="w-full divide-y divide-gray-200 table-fixed">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-20 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="w-24 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ventas Brutas
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
                        Pago Tarjeta
                      </th>
                      <th className="w-20 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transf.
                      </th>
                      <th className="w-24 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gastos
                      </th>
                      <th className="w-24 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Saldo Día
                      </th>
                      <th className="w-24 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Depósitos
                      </th>
                      <th className="w-24 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Saldo Acum.
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
                          ${dia.totalVentas.toLocaleString('en-US')}
                        </td>
                        <td className="px-2 py-3 text-xs text-gray-900">
                          ${dia.totalCredito.toLocaleString('en-US')}
                        </td>
                        <td className="px-2 py-3 text-xs text-gray-900">
                          ${dia.totalAbonosCredito.toLocaleString('en-US')}
                        </td>
                        <td className="px-2 py-3 text-xs text-gray-900">
                          ${dia.totalRecargas.toLocaleString('en-US')}
                        </td>
                        <td className="px-2 py-3 text-xs text-gray-900">
                          ${dia.totalPagoTarjeta.toLocaleString('en-US')}
                        </td>
                        <td className="px-2 py-3 text-xs text-gray-900">
                          ${dia.totalTransferencias.toLocaleString('en-US')}
                        </td>
                        <td className="px-2 py-3 text-xs text-red-600 font-medium">
                          ${dia.totalGastos.toLocaleString('en-US')}
                        </td>
                        <td className="px-2 py-3 text-xs text-blue-600 font-medium">
                          ${dia.saldoDelDiaCalculado.toLocaleString('en-US')}
                        </td>
                        <td className="px-2 py-3 text-xs text-teal-600 font-medium">
                          ${(dia.totalDepositos || 0).toLocaleString('en-US')}
                        </td>
                        <td className={`px-2 py-3 text-xs font-medium ${dia.saldoAcumulado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${dia.saldoAcumulado.toLocaleString('en-US')}
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