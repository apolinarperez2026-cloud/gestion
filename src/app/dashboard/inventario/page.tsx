'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Sesion {
  id: number
  nombre: string
  estado: string
  fechaInicio: string
  fechaFin?: string
  sucursal: { id: number; nombre: string }
  usuario: { id: number; nombre: string }
  _count: { items: number; incidencias: number }
}

interface Item {
  id: number
  sku: string
  descripcion: string
  cantidadSistema: number
  cantidadFisica?: number
  diferencia?: number
  estado: string
}

interface Incidencia {
  id: number
  itemId?: number
  descripcion: string
  foto?: string
  conclusion?: string
  estado: string
  usuario: { nombre: string }
}

interface SesionDetail {
  id: number
  nombre: string
  estado: string
  sucursal: { id: number; nombre: string }
  items: Item[]
  incidencias: Incidencia[]
}

export default function InventarioPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [sucursales, setSucursales] = useState<{ id: number; nombre: string }[]>([])
  const [sesiones, setSesiones] = useState<Sesion[]>([])
  const [activeSesion, setActiveSesion] = useState<SesionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'detail'>('list')
  const [showNewForm, setShowNewForm] = useState(false)
  const [showIncidenciaForm, setShowIncidenciaForm] = useState(false)
  const [newForm, setNewForm] = useState({ nombre: '', sucursalId: '' })
  const [incForm, setIncForm] = useState({ descripcion: '', itemId: '', foto: '', conclusion: '' })
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'success' | 'error'>('success')
  const [csvInput, setCsvInput] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [localItems, setLocalItems] = useState<Record<number, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  const token = () => localStorage.getItem('token') || ''

  const notify = (m: string, t: 'success' | 'error' = 'success') => {
    setMsg(m); setMsgType(t); setTimeout(() => setMsg(''), 3000)
  }

  const fetchSesiones = async (t: string) => {
    const res = await fetch('/api/inventario', { headers: { Authorization: `Bearer ${t}` } })
    if (res.ok) setSesiones((await res.json()).sesiones || [])
  }

  const fetchSesionDetail = async (t: string, id: number) => {
    const res = await fetch(`/api/inventario/${id}`, { headers: { Authorization: `Bearer ${t}` } })
    if (res.ok) setActiveSesion((await res.json()).sesion)
  }

  useEffect(() => {
    const init = async () => {
      const t = token()
      if (!t) { router.push('/auth/login'); return }
      const meRes = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${t}` } })
      if (!meRes.ok) { router.push('/auth/login'); return }
      const meData = await meRes.json()
      setUser(meData.user)
      if (meData.user.rol?.nombre === 'Administrador') {
        const sRes = await fetch('/api/sucursales', { headers: { Authorization: `Bearer ${t}` } })
        if (sRes.ok) setSucursales((await sRes.json()).sucursales || [])
      }
      await fetchSesiones(t)
      setLoading(false)
    }
    init()
  }, [router])

  const parseCSV = (text: string): { sku: string; descripcion: string; cantidadSistema: number }[] => {
    return text.trim().split('\n').slice(1).map(line => {
      const cols = line.split(',')
      return {
        sku: (cols[0] || '').trim().replace(/"/g, ''),
        descripcion: (cols[1] || '').trim().replace(/"/g, ''),
        cantidadSistema: parseFloat((cols[2] || '0').trim()) || 0
      }
    }).filter(i => i.sku)
  }

  const handleCreate = async () => {
    if (!newForm.nombre || !newForm.sucursalId) { notify('Nombre y sucursal requeridos', 'error'); return }
    const t = token()
    const items = csvInput ? parseCSV(csvInput) : []
    const res = await fetch('/api/inventario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ ...newForm, items })
    })
    if (res.ok) {
      setShowNewForm(false)
      setNewForm({ nombre: '', sucursalId: '' })
      setCsvInput('')
      await fetchSesiones(t)
      notify('Sesión de inventario creada')
    } else {
      notify('Error al crear', 'error')
    }
  }

  const openDetail = async (id: number) => {
    const t = token()
    await fetchSesionDetail(t, id)
    setView('detail')
    setLocalItems({})
  }

  const handleSaveConteo = async () => {
    if (!activeSesion) return
    const t = token()
    const items = Object.entries(localItems).map(([id, val]) => ({ id: parseInt(id), cantidadFisica: parseFloat(val) || 0 }))
    const res = await fetch(`/api/inventario/${activeSesion.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ items })
    })
    if (res.ok) {
      await fetchSesionDetail(t, activeSesion.id)
      setLocalItems({})
      notify('Conteo guardado')
    } else {
      notify('Error', 'error')
    }
  }

  const handleAddIncidencia = async () => {
    if (!activeSesion || !incForm.descripcion) { notify('Descripción requerida', 'error'); return }
    const t = token()
    const res = await fetch(`/api/inventario/${activeSesion.id}/incidencias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({
        descripcion: incForm.descripcion,
        itemId: incForm.itemId ? parseInt(incForm.itemId) : undefined,
        foto: incForm.foto || undefined,
        conclusion: incForm.conclusion || undefined
      })
    })
    if (res.ok) {
      setShowIncidenciaForm(false)
      setIncForm({ descripcion: '', itemId: '', foto: '', conclusion: '' })
      await fetchSesionDetail(t, activeSesion.id)
      notify('Incidencia registrada')
    } else {
      notify('Error', 'error')
    }
  }

  const handleCerrarSesion = async () => {
    if (!activeSesion) return
    const negativos = activeSesion.items.filter(i => (i.diferencia ?? 0) < 0)
    const msg = negativos.length > 0
      ? `¿Cerrar esta sesión?\n\n⚠️ Hay ${negativos.length} ítem(s) con faltante:\n${negativos.map(i => `• ${i.sku}: ${i.diferencia}`).join('\n')}\n\nSe crearán incidencias automáticas para los faltantes.`
      : '¿Cerrar esta sesión de inventario?'
    if (!confirm(msg)) return
    const t = token()
    await fetch(`/api/inventario/${activeSesion.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ estado: 'Cerrado' })
    })
    await fetchSesiones(t)
    await fetchSesionDetail(t, activeSesion.id)
    notify('Sesión cerrada')
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setCsvInput(ev.target?.result as string || '')
    reader.readAsText(file)
  }

  const isAdmin = user?.rol?.nombre === 'Administrador'

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
              {view === 'detail' ? (
                <button onClick={() => setView('list')} className="text-gray-600 hover:text-gray-900">
                  ← Volver a sesiones
                </button>
              ) : (
                <button onClick={() => router.push('/dashboard')} className="text-gray-600 hover:text-gray-900">
                  ← Volver
                </button>
              )}
              <h1 className="text-2xl font-bold text-gray-900">
                {view === 'detail' && activeSesion ? activeSesion.nombre : 'Inventario Digital'}
              </h1>
            </div>
            {view === 'list' && (
              <button onClick={() => setShowNewForm(true)} className="btn-primary">
                + Nueva Sesión
              </button>
            )}
            {view === 'detail' && activeSesion && (
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/dashboard/inventario/${activeSesion.id}/imprimir`)}
                  className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded text-sm font-medium"
                >
                  Imprimir / PDF
                </button>
                {activeSesion.estado === 'En Proceso' && (
                  <>
                    <button onClick={() => setShowIncidenciaForm(true)} className="btn-secondary text-sm">
                      + Incidencia
                    </button>
                    <button onClick={handleSaveConteo} className="btn-primary text-sm">
                      Guardar Conteo
                    </button>
                    {isAdmin && (
                      <button onClick={handleCerrarSesion} className="bg-gray-600 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-700">
                        Cerrar Sesión
                      </button>
                    )}
                  </>
                )}
              </div>
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

        {view === 'list' && (
          <div className="space-y-4">
            {sesiones.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200">
                No hay sesiones de inventario. Crea la primera.
              </div>
            ) : sesiones.map(s => (
              <div key={s.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex justify-between items-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDetail(s.id)}>
                <div>
                  <h3 className="font-semibold text-gray-900">{s.nombre}</h3>
                  <p className="text-sm text-gray-500">{s.sucursal.nombre} · Iniciado por {s.usuario.nombre}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(s.fechaInicio).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${s.estado === 'En Proceso' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                    {s.estado}
                  </span>
                  <div className="text-sm text-gray-600 mt-2 space-x-3">
                    <span>{s._count.items} items</span>
                    <span>{s._count.incidencias} incidencias</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'detail' && activeSesion && (
          <div className="space-y-6">
            {/* Info sesión */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm text-gray-500">Tienda:</span>
                  <span className="ml-2 font-medium">{activeSesion.sucursal.nombre}</span>
                  <span className="ml-4 text-sm text-gray-500">Estado:</span>
                  <span className={`ml-2 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${activeSesion.estado === 'En Proceso' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                    {activeSesion.estado}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {activeSesion.items.filter(i => i.estado === 'Incidencia').length} incidencias en items
                </div>
              </div>
            </div>

            {/* Tabla de items */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-medium text-gray-900">Items de Inventario ({activeSesion.items.length})</h3>
              </div>
              {activeSesion.items.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No hay items. Importa desde CSV al crear la sesión.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sist.</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Físico</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Diferencia</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {activeSesion.items.map(item => (
                        <tr key={item.id} className={item.estado === 'Incidencia' ? 'bg-red-50' : ''}>
                          <td className="px-4 py-2 text-sm font-mono text-gray-900">{item.sku}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.descripcion}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900">{item.cantidadSistema}</td>
                          <td className="px-4 py-2 text-sm text-right">
                            {activeSesion.estado === 'En Proceso' ? (
                              <input
                                type="number"
                                step="1"
                                className="w-20 text-right border border-gray-300 rounded px-2 py-0.5 text-sm"
                                value={localItems[item.id] ?? (item.cantidadFisica ?? '')}
                                onChange={e => setLocalItems(prev => ({ ...prev, [item.id]: e.target.value }))}
                                placeholder={String(item.cantidadSistema)}
                              />
                            ) : (
                              <span>{item.cantidadFisica ?? '-'}</span>
                            )}
                          </td>
                          <td className={`px-4 py-2 text-sm text-right font-medium ${(item.diferencia ?? 0) !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {item.diferencia !== undefined ? (item.diferencia > 0 ? `+${item.diferencia}` : item.diferencia) : '-'}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={`inline-flex px-1.5 py-0.5 text-xs rounded-full ${item.estado === 'OK' ? 'bg-green-100 text-green-800' : item.estado === 'Incidencia' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
                              {item.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Incidencias */}
            {activeSesion.incidencias.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-medium text-gray-900">Incidencias ({activeSesion.incidencias.length})</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {activeSesion.incidencias.map(inc => (
                    <div key={inc.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-gray-900">{inc.descripcion}</p>
                        <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${inc.estado === 'Resuelta' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {inc.estado}
                        </span>
                      </div>
                      {inc.conclusion && <p className="text-sm text-gray-600 mt-1">Conclusión: {inc.conclusion}</p>}
                      <p className="text-xs text-gray-400 mt-1">Por: {inc.usuario.nombre}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal nueva sesión */}
      {showNewForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-screen overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Nueva Sesión de Inventario</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la sesión *</label>
                <input type="text" value={newForm.nombre} onChange={e => setNewForm(p => ({ ...p, nombre: e.target.value }))} className="input-field" placeholder="Ej: Inventario Jun 2026 - FK01" />
              </div>
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal *</label>
                  <select value={newForm.sucursalId} onChange={e => setNewForm(p => ({ ...p, sucursalId: e.target.value }))} className="input-field">
                    <option value="">Seleccionar...</option>
                    {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Importar items desde CSV (opcional)</label>
                <p className="text-xs text-gray-500 mb-2">Formato: SKU,Descripcion,CantidadSistema (con encabezado)</p>
                <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                {csvInput && <p className="text-xs text-green-600 mt-1">✓ {parseCSV(csvInput).length} items cargados</p>}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => { setShowNewForm(false); setCsvInput('') }} className="btn-secondary">Cancelar</button>
              <button onClick={handleCreate} className="btn-primary">Crear Sesión</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal incidencia */}
      {showIncidenciaForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">Registrar Incidencia</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                <textarea value={incForm.descripcion} onChange={e => setIncForm(p => ({ ...p, descripcion: e.target.value }))} className="input-field" rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conclusión (opcional)</label>
                <textarea value={incForm.conclusion} onChange={e => setIncForm(p => ({ ...p, conclusion: e.target.value }))} className="input-field" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL de foto (opcional)</label>
                <input type="text" value={incForm.foto} onChange={e => setIncForm(p => ({ ...p, foto: e.target.value }))} className="input-field" placeholder="https://..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowIncidenciaForm(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleAddIncidencia} className="btn-primary">Registrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
