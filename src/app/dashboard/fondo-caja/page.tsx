'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FondoCaja, AuthUser } from '@/types/database'

export default function FondoCajaPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [fondosCaja, setFondosCaja] = useState<FondoCaja[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    saldoInicial: '',
    saldoFinal: ''
  })
  const router = useRouter()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const userData = await response.json()
          setUser(userData.user)
          fetchFondosCaja()
        } else {
          router.push('/auth/login')
        }
      } catch (error) {
        router.push('/auth/login')
      }
    }

    fetchUser()
  }, [router])

  const fetchFondosCaja = async () => {
    try {
      const response = await fetch('/api/fondo-caja')
      if (response.ok) {
        const data = await response.json()
        setFondosCaja(data.fondosCaja)
      }
    } catch (error) {
      console.error('Error al cargar fondos de caja:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/fondo-caja', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          saldoInicial: parseFloat(formData.saldoInicial),
          saldoFinal: formData.saldoFinal ? parseFloat(formData.saldoFinal) : null,
          fecha: new Date(formData.fecha)
        }),
      })

      if (response.ok) {
        setShowForm(false)
        setFormData({
          fecha: new Date().toISOString().split('T')[0],
          saldoInicial: '',
          saldoFinal: ''
        })
        fetchFondosCaja()
      }
    } catch (error) {
      console.error('Error al crear fondo de caja:', error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
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

  const fondoActual = fondosCaja.find(f => 
    new Date(f.fecha).toDateString() === new Date().toDateString()
  )

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
                  Fondo de Caja
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
        {/* Estado actual */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Saldo Inicial Hoy</h3>
                <p className="text-2xl font-bold text-blue-600">
                  ${fondoActual?.saldoInicial.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>

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
                <h3 className="text-lg font-medium text-gray-900">Saldo Final Hoy</h3>
                <p className="text-2xl font-bold text-green-600">
                  ${fondoActual?.saldoFinal?.toLocaleString() || 'Pendiente'}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Diferencia</h3>
                <p className={`text-2xl font-bold ${
                  fondoActual?.saldoFinal 
                    ? (fondoActual.saldoFinal - fondoActual.saldoInicial >= 0 ? 'text-green-600' : 'text-red-600')
                    : 'text-gray-600'
                }`}>
                  {fondoActual?.saldoFinal 
                    ? `$${(fondoActual.saldoFinal - fondoActual.saldoInicial).toLocaleString()}`
                    : 'Pendiente'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Botón para agregar/actualizar fondo */}
        <div className="mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? 'Cancelar' : (fondoActual ? 'Actualizar Fondo' : 'Registrar Fondo')}
          </button>
        </div>

        {/* Formulario para fondo de caja */}
        {showForm && (
          <div className="card mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {fondoActual ? 'Actualizar Fondo de Caja' : 'Registrar Fondo de Caja'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha
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
                    Saldo Inicial
                  </label>
                  <input
                    type="number"
                    name="saldoInicial"
                    value={formData.saldoInicial}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Saldo Final (opcional)
                  </label>
                  <input
                    type="number"
                    name="saldoFinal"
                    value={formData.saldoFinal}
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
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  {fondoActual ? 'Actualizar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Historial de fondos de caja */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Historial de Fondos de Caja</h3>
          {fondosCaja.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay registros de fondo de caja</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Saldo Inicial
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Saldo Final
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Diferencia
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fondosCaja.map((fondo) => (
                    <tr key={fondo.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(fondo.fecha).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        ${fondo.saldoInicial.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {fondo.saldoFinal ? `$${fondo.saldoFinal.toLocaleString()}` : 'Pendiente'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        fondo.saldoFinal 
                          ? (fondo.saldoFinal - fondo.saldoInicial >= 0 ? 'text-green-600' : 'text-red-600')
                          : 'text-gray-600'
                      }`}>
                        {fondo.saldoFinal 
                          ? `$${(fondo.saldoFinal - fondo.saldoInicial).toLocaleString()}`
                          : 'Pendiente'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
