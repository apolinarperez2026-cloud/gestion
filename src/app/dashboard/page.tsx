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
                Libro Diario
              </h1>
              <p className="text-sm text-gray-600">
                {user.sucursal ? user.sucursal.nombre : 'Administración General'}
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
        ) : (
          // Dashboard para Gerentes y Empleados
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

            {/* Card de Fondo de Caja */}
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
                  <h3 className="text-lg font-medium text-gray-900">Fondo de Caja</h3>
                  <p className="text-sm text-gray-500">Control de efectivo diario</p>
                </div>
              </div>
              <div className="mt-4">
                <button 
                  onClick={() => router.push('/dashboard/fondo-caja')}
                  className="btn-primary w-full"
                >
                  Ver Fondo de Caja
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

            {/* Card de Movimientos */}
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
                  <h3 className="text-lg font-medium text-gray-900">Movimientos</h3>
                  <p className="text-sm text-gray-500">Ingresar movimientos diarios</p>
                </div>
              </div>
              <div className="mt-4">
                <button 
                  onClick={() => router.push('/dashboard/movimientos')}
                  className="btn-primary w-full"
                >
                  Ver Movimientos
                </button>
              </div>
            </div>

            {/* Card de Gastos */}
            <div className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M15 4.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Gastos</h3>
                  <p className="text-sm text-gray-500">Gestionar gastos de la sucursal</p>
                </div>
              </div>
              <div className="mt-4">
                <button 
                  onClick={() => router.push('/dashboard/gastos')}
                  className="btn-primary w-full"
                >
                  Ver Gastos
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
