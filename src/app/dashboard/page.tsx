'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthUser } from '@/types/database'

export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
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
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    fetchUser()
  }, [router])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/auth/login')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  const handleResetSucursal = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch('/api/auth/reset-sucursal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        
        // Actualizar el token en localStorage
        if (data.token) {
          localStorage.setItem('token', data.token)
        }
        
        // Recargar los datos del usuario
        await fetchUser()
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'Error al resetear sucursal'}`)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al resetear sucursal')
    }
  }

  const handleSwitchSucursal = async (sucursalId: number) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch('/api/auth/switch-sucursal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sucursalId })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Actualizar el token en localStorage
        if (data.token) {
          localStorage.setItem('token', data.token)
        }
        
        // Recargar los datos del usuario
        await fetchUser()
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'Error al cambiar sucursal'}`)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al cambiar sucursal')
    }
  }

  const handleShowSucursalSelector = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      // Crear un token temporal sin sucursal específica para mostrar el selector
      const response = await fetch('/api/auth/switch-sucursal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sucursalId: null })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Actualizar el token en localStorage
        if (data.token) {
          localStorage.setItem('token', data.token)
        }
        
        // Recargar los datos del usuario
        await fetchUser()
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'Error al mostrar selector de sucursales'}`)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al mostrar selector de sucursales')
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

  // Si el usuario tiene múltiples sucursales asignadas pero no ha seleccionado una específica,
  // mostrar el selector de sucursales
  const tieneMultiplesSucursales = user.sucursalesAsignadas && user.sucursalesAsignadas.length > 1
  const noTieneSucursalSeleccionada = !user.sucursalId || user.sucursalId === null

  if (tieneMultiplesSucursales && noTieneSucursalSeleccionada) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Libro Diario
                </h1>
                <p className="text-sm text-gray-600">
                  Selecciona una sucursal para continuar
                </p>
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

        {/* Selector de Sucursales */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Bienvenido, {user.nombre}
            </h2>
            <p className="text-lg text-gray-600">
              Tienes acceso a {user.sucursalesAsignadas?.length} sucursales. Selecciona una para continuar:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {user.sucursalesAsignadas?.map((sucursal) => (
              <div key={sucursal.id} className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">{sucursal.nombre}</h3>
                    <p className="text-sm text-gray-500">{sucursal.direccion}</p>
                  </div>
                </div>
                <div className="mt-6">
                  <button 
                    onClick={() => handleSwitchSucursal(sucursal.id)}
                    className="btn-primary w-full"
                  >
                    Trabajar en {sucursal.nombre}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    )
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
              <p className="text-sm text-gray-600">
                {user.sucursal ? 'Sistema de Gestión' : 'Administración General'}
              </p>
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
              {user.rol.nombre === 'Administrador' && user.sucursal && (
                <button
                  onClick={handleResetSucursal}
                  className="btn-secondary text-sm"
                >
                  Volver a Sucursales
                </button>
              )}
              {user.sucursalesAsignadas && user.sucursalesAsignadas.length > 1 && user.sucursal && (
                <button
                  onClick={handleShowSucursalSelector}
                  className="btn-secondary text-sm"
                >
                  Cambiar Sucursal
                </button>
              )}
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
        {user.rol.nombre === 'Administrador' && user.sucursal === null ? (
          // Dashboard para Administradores (sin sucursal específica)
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card de Usuarios */}
            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Usuarios</h3>
                  <p className="text-sm text-gray-500">Gestionar usuarios del sistema</p>
                </div>
              </div>
              <div className="mt-4">
                <button 
                  onClick={() => router.push('/dashboard/usuarios')}
                  className="btn-primary w-full"
                >
                  Ver Usuarios
                </button>
              </div>
            </div>

            {/* Card de Sucursales */}
            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Sucursales</h3>
                  <p className="text-sm text-gray-500">Gestionar sucursales y ver movimientos</p>
                </div>
              </div>
              <div className="mt-4">
                <button 
                  onClick={() => router.push('/dashboard/sucursales')}
                  className="btn-primary w-full"
                >
                  Ver Sucursales
                </button>
              </div>
            </div>
          </div>
        ) : user.rol.nombre === 'Empleado' ? (
          // Dashboard para Empleados (solo 3 opciones)
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card de Entradas */}
            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Entradas</h3>
                  <p className="text-sm text-gray-500">Registrar entradas y salidas de mercadería</p>
                </div>
              </div>
              <div className="mt-4">
                <button 
                  onClick={() => router.push('/dashboard/mercaderias')}
                  className="btn-primary w-full"
                >
                  Ver Entradas
                </button>
              </div>
            </div>

            {/* Card de Garantía */}
            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Garantía</h3>
                  <p className="text-sm text-gray-500">Registrar garantías y seguimiento</p>
                </div>
              </div>
              <div className="mt-4">
                <button 
                  onClick={() => router.push('/dashboard/garantia')}
                  className="btn-primary w-full"
                >
                  Ver Garantías
                </button>
              </div>
            </div>

            {/* Card de Gastos */}
            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Gastos</h3>
                  <p className="text-sm text-gray-500">Registrar gastos individuales</p>
                </div>
              </div>
              <div className="mt-4">
                <button 
                  onClick={() => router.push('/dashboard/movimientos-individuales')}
                  className="btn-primary w-full"
                >
                  Ver Gastos
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Dashboard para Gerentes (todas las opciones)
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Fila 1: Resumen | Control | Gastos | Pedidos Especiales */}
            
            {/* Card de Resumen */}
            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Resumen</h3>
                  <p className="text-sm text-gray-500">Ver resumen financiero y movimientos</p>
                </div>
              </div>
              <div className="mt-4">
                <button 
                  onClick={() => router.push('/dashboard/resumen')}
                  className="btn-primary w-full"
                >
                  Ver Resumen
                </button>
              </div>
            </div>

            {/* Card de Control */}
            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Control</h3>
                  <p className="text-sm text-gray-500">Ingresar movimientos diarios</p>
                </div>
              </div>
              <div className="mt-4">
                <button 
                  onClick={() => router.push('/dashboard/movimientos')}
                  className="btn-primary w-full"
                >
                  Ver Control
                </button>
              </div>
            </div>

            {/* Card de Gastos */}
            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Gastos</h3>
                  <p className="text-sm text-gray-500">Registrar gastos con imágenes</p>
                </div>
              </div>
              <div className="mt-4">
                <button 
                  onClick={() => router.push('/dashboard/movimientos-individuales')}
                  className="btn-primary w-full"
                >
                  Ver Gastos
                </button>
              </div>
            </div>

            {/* Card de Pedidos Especiales */}
            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Pedidos Especiales</h3>
                  <p className="text-sm text-gray-500">Gestionar pedidos especiales</p>
                </div>
              </div>
              <div className="mt-4">
                <button 
                  onClick={() => router.push('/dashboard/pedidos-especiales')}
                  className="btn-primary w-full"
                >
                  Ver Pedidos
                </button>
              </div>
            </div>

            {/* Fila 2: Depósitos | Cobros TPV | Entradas | Garantías */}
            
            {/* Card de Depósito de Caja */}
            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Depósito de Caja</h3>
                  <p className="text-sm text-gray-500">Registrar depósitos con comprobante</p>
                </div>
              </div>
              <div className="mt-4">
                <button 
                  onClick={() => router.push('/dashboard/fondo-caja')}
                  className="btn-primary w-full"
                >
                  Ver Depósitos
                </button>
              </div>
            </div>

            {/* Card de Cobro TPV */}
            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Cobro TPV</h3>
                  <p className="text-sm text-gray-500">Registrar cobros con terminal punto de venta</p>
                </div>
              </div>
              <div className="mt-4">
                <button 
                  onClick={() => router.push('/dashboard/tpv')}
                  className="btn-primary w-full"
                >
                  Ver Cobros TPV
                </button>
              </div>
            </div>

            {/* Card de Entradas */}
            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Entradas</h3>
                  <p className="text-sm text-gray-500">Registrar entradas y salidas de mercadería</p>
                </div>
              </div>
              <div className="mt-4">
                <button 
                  onClick={() => router.push('/dashboard/mercaderias')}
                  className="btn-primary w-full"
                >
                  Ver Entradas
                </button>
              </div>
            </div>

            {/* Card de Garantía */}
            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Garantía</h3>
                  <p className="text-sm text-gray-500">Registrar garantías y seguimiento</p>
                </div>
              </div>
              <div className="mt-4">
                <button 
                  onClick={() => router.push('/dashboard/garantia')}
                  className="btn-primary w-full"
                >
                  Ver Garantías
                </button>
              </div>
            </div>

            {/* Card de Configuración - Solo para Administradores */}
            {user.rol.nombre === 'Administrador' && (
              <div className="card">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Configuración</h3>
                    <p className="text-sm text-gray-500">Administrar tipos de gastos y formas de pago</p>
                  </div>
                </div>
                <div className="mt-4">
                  <button 
                    onClick={() => router.push('/dashboard/configuracion')}
                    className="btn-primary w-full"
                  >
                    Ver Configuración
                  </button>
                </div>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  )
}
