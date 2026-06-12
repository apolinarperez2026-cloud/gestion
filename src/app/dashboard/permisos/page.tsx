'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Permiso {
  id: number
  codigo: string
  descripcion: string
  categoria: string
}

interface Rol {
  id: number
  nombre: string
  nivel: number
  permisos: { permiso: Permiso }[]
}

const NIVEL_LABEL: Record<number, { label: string; color: string }> = {
  1: { label: 'Empleado / Vendedor', color: 'bg-gray-100 text-gray-700' },
  2: { label: 'Gerente / Líder', color: 'bg-blue-100 text-blue-700' },
  3: { label: 'Director', color: 'bg-purple-100 text-purple-700' },
  4: { label: 'CEO', color: 'bg-orange-100 text-orange-700' },
  5: { label: 'Administrador', color: 'bg-red-100 text-red-700' },
}

export default function PermisosPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [permisos, setPermisos] = useState<Permiso[]>([])
  const [roles, setRoles] = useState<Rol[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [saving, setSaving] = useState<number | null>(null)
  const [editRol, setEditRol] = useState<Rol | null>(null)
  const [editPermisoIds, setEditPermisoIds] = useState<Set<number>>(new Set())
  const [editNivel, setEditNivel] = useState<number>(1)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'success' | 'error'>('success')

  const token = () => localStorage.getItem('token') || ''

  const notify = (m: string, t: 'success' | 'error' = 'success') => {
    setMsg(m); setMsgType(t); setTimeout(() => setMsg(''), 3500)
  }

  const fetchData = async () => {
    const t = token()
    const res = await fetch('/api/admin/permisos', { headers: { Authorization: `Bearer ${t}` } })
    if (res.ok) {
      const d = await res.json()
      setPermisos(d.permisos || [])
      setRoles(d.roles || [])
    }
  }

  useEffect(() => {
    const init = async () => {
      const t = token()
      if (!t) { router.push('/auth/login'); return }
      const meRes = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${t}` } })
      if (!meRes.ok) { router.push('/auth/login'); return }
      const meData = await meRes.json()
      setUser(meData.user)
      if (meData.user.rol?.nombre !== 'Administrador') {
        router.push('/dashboard'); return
      }
      await fetchData()
      setLoading(false)
    }
    init()
  }, [router])

  const handleSeed = async () => {
    setSeeding(true)
    const t = token()
    const res = await fetch('/api/admin/permisos/seed', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` }
    })
    if (res.ok) {
      await fetchData()
      notify('Permisos inicializados correctamente')
    } else {
      notify('Error al inicializar', 'error')
    }
    setSeeding(false)
  }

  const openEdit = (rol: Rol) => {
    setEditRol(rol)
    setEditPermisoIds(new Set(rol.permisos.map(rp => rp.permiso.id)))
    setEditNivel(rol.nivel)
  }

  const togglePermiso = (id: number) => {
    setEditPermisoIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSave = async () => {
    if (!editRol) return
    setSaving(editRol.id)
    const t = token()
    const res = await fetch('/api/admin/permisos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ rolId: editRol.id, permisoIds: Array.from(editPermisoIds), nivel: editNivel })
    })
    if (res.ok) {
      await fetchData()
      setEditRol(null)
      notify('Permisos actualizados')
    } else {
      notify('Error al guardar', 'error')
    }
    setSaving(null)
  }

  // Agrupar permisos por categoría
  const categorias = Array.from(new Set(permisos.map(p => p.categoria))).sort()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button onClick={() => router.push('/dashboard')} className="text-gray-600 hover:text-gray-900">
                ← Volver
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Roles y Permisos</h1>
                <p className="text-sm text-gray-500">Configura qué puede hacer cada rol en el sistema</p>
              </div>
            </div>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="btn-secondary text-sm"
              title="Inicializa los permisos por defecto para todos los roles"
            >
              {seeding ? 'Inicializando...' : '⚡ Inicializar Permisos'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {msg && (
          <div className={`mb-4 p-3 rounded-md text-sm font-medium ${msgType === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {msg}
          </div>
        )}

        {permisos.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500 mb-4">No hay permisos configurados aún.</p>
            <button onClick={handleSeed} disabled={seeding} className="btn-primary">
              {seeding ? 'Inicializando...' : 'Inicializar permisos por defecto'}
            </button>
          </div>
        ) : (
          <>
            {/* Tabla matriz de roles vs permisos */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Roles del Sistema</h2>
                <p className="text-sm text-gray-500 mt-0.5">Haz clic en "Editar" para configurar los permisos de cada rol</p>
              </div>
              <div className="divide-y divide-gray-200">
                {roles.map(rol => {
                  const nivel = NIVEL_LABEL[rol.nivel] || { label: 'Nivel ' + rol.nivel, color: 'bg-gray-100 text-gray-700' }
                  return (
                    <div key={rol.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">{rol.nombre}</span>
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${nivel.color}`}>
                            {nivel.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {rol.permisos.length === 0 ? (
                            <span className="text-xs text-gray-400">Sin permisos asignados</span>
                          ) : (
                            rol.permisos.slice(0, 8).map(rp => (
                              <span key={rp.permiso.id} className="inline-flex px-1.5 py-0.5 text-xs bg-blue-50 text-blue-700 rounded">
                                {rp.permiso.codigo.replace(/_/g, ' ')}
                              </span>
                            ))
                          )}
                          {rol.permisos.length > 8 && (
                            <span className="text-xs text-gray-500">+{rol.permisos.length - 8} más</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => openEdit(rol)}
                        className="shrink-0 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded font-medium"
                      >
                        Editar permisos ({rol.permisos.length})
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Catálogo de permisos disponibles */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Catálogo de Permisos</h2>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categorias.map(cat => (
                  <div key={cat}>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">{cat}</h3>
                    <div className="space-y-1">
                      {permisos.filter(p => p.categoria === cat).map(p => (
                        <div key={p.id} className="flex items-start gap-2">
                          <span className="text-xs font-mono text-blue-600 shrink-0 mt-0.5">{p.codigo}</span>
                          <span className="text-xs text-gray-500">{p.descripcion}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modal edición de permisos */}
      {editRol && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-start justify-center z-50 pt-8 pb-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 my-auto">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Editar: {editRol.nombre}</h2>
                <p className="text-sm text-gray-500">{editPermisoIds.size} permisos seleccionados</p>
              </div>
              <button onClick={() => setEditRol(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Nivel del rol */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nivel del rol</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(NIVEL_LABEL).map(([n, info]) => (
                    <button
                      key={n}
                      onClick={() => setEditNivel(parseInt(n))}
                      className={`px-3 py-1.5 rounded text-sm font-medium border transition-colors ${editNivel === parseInt(n) ? 'border-blue-500 ' + info.color : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                    >
                      {parseInt(n)} — {info.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Acciones rápidas */}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditPermisoIds(new Set(permisos.map(p => p.id)))}
                  className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded"
                >
                  Seleccionar todos
                </button>
                <button
                  onClick={() => setEditPermisoIds(new Set())}
                  className="text-xs text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 px-2 py-1 rounded"
                >
                  Deseleccionar todos
                </button>
              </div>

              {/* Checkboxes por categoría */}
              {categorias.map(cat => (
                <div key={cat}>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-2">
                    {cat}
                    <button
                      onClick={() => {
                        const catPermisos = permisos.filter(p => p.categoria === cat).map(p => p.id)
                        const allSelected = catPermisos.every(id => editPermisoIds.has(id))
                        setEditPermisoIds(prev => {
                          const next = new Set(prev)
                          catPermisos.forEach(id => allSelected ? next.delete(id) : next.add(id))
                          return next
                        })
                      }}
                      className="text-xs text-blue-500 normal-case font-normal"
                    >
                      (toggle categoría)
                    </button>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {permisos.filter(p => p.categoria === cat).map(p => (
                      <label key={p.id} className={`flex items-start gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 ${editPermisoIds.has(p.id) ? 'bg-blue-50' : ''}`}>
                        <input
                          type="checkbox"
                          checked={editPermisoIds.has(p.id)}
                          onChange={() => togglePermiso(p.id)}
                          className="mt-0.5 rounded border-gray-300 text-blue-600 cursor-pointer"
                        />
                        <div>
                          <div className="text-xs font-mono text-blue-700">{p.codigo}</div>
                          <div className="text-xs text-gray-500">{p.descripcion}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-5 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setEditRol(null)} className="btn-secondary">Cancelar</button>
              <button onClick={handleSave} disabled={saving !== null} className="btn-primary">
                {saving ? 'Guardando...' : 'Guardar Permisos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
