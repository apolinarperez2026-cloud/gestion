'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Sucursal { id: number; nombre: string }
interface Bloque {
  id: number
  nombre: string
  descripcion?: string
  sucursales: { sucursal: Sucursal }[]
}

export default function BloquesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [bloques, setBloques] = useState<Bloque[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editBloque, setEditBloque] = useState<Bloque | null>(null)
  const [form, setForm] = useState({ nombre: '', descripcion: '', sucursalIds: [] as number[] })
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'success' | 'error'>('success')

  const token = () => localStorage.getItem('token') || ''

  useEffect(() => {
    const init = async () => {
      const t = token()
      if (!t) { router.push('/auth/login'); return }

      const [meRes, blRes, sRes] = await Promise.all([
        fetch('/api/auth/me', { headers: { Authorization: `Bearer ${t}` } }),
        fetch('/api/bloques', { headers: { Authorization: `Bearer ${t}` } }),
        fetch('/api/sucursales', { headers: { Authorization: `Bearer ${t}` } })
      ])

      if (!meRes.ok) { router.push('/auth/login'); return }
      const meData = await meRes.json()
      setUser(meData.user)

      if (blRes.ok) setBloques((await blRes.json()).bloques || [])
      if (sRes.ok) setSucursales((await sRes.json()).sucursales || [])
      setLoading(false)
    }
    init()
  }, [router])

  const notify = (m: string, t: 'success' | 'error' = 'success') => {
    setMsg(m); setMsgType(t)
    setTimeout(() => setMsg(''), 3000)
  }

  const openCreate = () => {
    setEditBloque(null)
    setForm({ nombre: '', descripcion: '', sucursalIds: [] })
    setShowForm(true)
  }

  const openEdit = (b: Bloque) => {
    setEditBloque(b)
    setForm({ nombre: b.nombre, descripcion: b.descripcion || '', sucursalIds: b.sucursales.map(s => s.sucursal.id) })
    setShowForm(true)
  }

  const toggleSucursal = (id: number) => {
    setForm(prev => ({
      ...prev,
      sucursalIds: prev.sucursalIds.includes(id)
        ? prev.sucursalIds.filter(s => s !== id)
        : [...prev.sucursalIds, id]
    }))
  }

  const handleSubmit = async () => {
    if (!form.nombre.trim()) { notify('Nombre requerido', 'error'); return }
    const t = token()
    const url = editBloque ? `/api/bloques/${editBloque.id}` : '/api/bloques'
    const method = editBloque ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify(form)
    })

    if (res.ok) {
      const data = await res.json()
      if (editBloque) {
        setBloques(prev => prev.map(b => b.id === editBloque.id ? data.bloque : b))
      } else {
        setBloques(prev => [...prev, data.bloque])
      }
      setShowForm(false)
      notify(editBloque ? 'Bloque actualizado' : 'Bloque creado')
    } else {
      const err = await res.json()
      notify(err.error || 'Error', 'error')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este bloque?')) return
    const t = token()
    const res = await fetch(`/api/bloques/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } })
    if (res.ok) {
      setBloques(prev => prev.filter(b => b.id !== id))
      notify('Bloque eliminado')
    } else {
      notify('Error al eliminar', 'error')
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  )

  const isAdmin = user?.rol?.nombre === 'Administrador'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button onClick={() => router.push('/dashboard')} className="text-gray-600 hover:text-gray-900">
                ← Volver
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Bloques de Tiendas</h1>
            </div>
            {isAdmin && (
              <button onClick={openCreate} className="btn-primary">
                + Nuevo Bloque
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {msg && (
          <div className={`mb-4 p-3 rounded-md text-sm font-medium ${msgType === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {msg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bloques.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-gray-500">
              No hay bloques configurados. {isAdmin && 'Crea el primero con el botón de arriba.'}
            </div>
          ) : bloques.map(bloque => (
            <div key={bloque.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{bloque.nombre}</h3>
                  {bloque.descripcion && <p className="text-sm text-gray-500 mt-1">{bloque.descripcion}</p>}
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(bloque)} className="text-blue-600 hover:text-blue-800 text-xs bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded">
                      Editar
                    </button>
                    <button onClick={() => handleDelete(bloque.id)} className="text-red-600 hover:text-red-800 text-xs bg-red-50 hover:bg-red-100 px-2 py-1 rounded">
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-500 mb-2">TIENDAS INCLUIDAS</p>
                {bloque.sucursales.length === 0 ? (
                  <p className="text-sm text-gray-400">Sin tiendas asignadas</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {bloque.sucursales.map(bs => (
                      <span key={bs.sucursal.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {bs.sucursal.nombre}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editBloque ? `Editar Bloque: ${editBloque.nombre}` : 'Nuevo Bloque'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                  className="input-field"
                  placeholder="Ej: Ferreterías Huixtla"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input
                  type="text"
                  value={form.descripcion}
                  onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                  className="input-field"
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tiendas incluidas</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded p-2">
                  {sucursales.map(s => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={form.sucursalIds.includes(s.id)}
                        onChange={() => toggleSucursal(s.id)}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">{s.nombre}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">{form.sucursalIds.length} tiendas seleccionadas</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleSubmit} className="btn-primary">
                {editBloque ? 'Guardar Cambios' : 'Crear Bloque'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
