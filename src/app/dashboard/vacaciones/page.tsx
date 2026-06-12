'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Solicitud {
  id: number
  usuarioId: number
  fechaInicio: string
  dias: number
  estado: string
  observaciones?: string
  comprobanteUrl?: string
  fechaAprobacion?: string
  usuario: { id: number; nombre: string }
  aprobador?: { id: number; nombre: string }
}

interface ConfigVacacion {
  usuarioId: number
  anio: number
  diasAsignados: number
  usuario: { id: number; nombre: string }
}

export default function VacacionesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [configs, setConfigs] = useState<ConfigVacacion[]>([])
  const [usuarios, setUsuarios] = useState<{ id: number; nombre: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [diasUsados, setDiasUsados] = useState(0)
  const [diasAsignados, setDiasAsignados] = useState(0)
  const [tab, setTab] = useState<'solicitudes' | 'config'>('solicitudes')
  const [showForm, setShowForm] = useState(false)
  const [showConfigForm, setShowConfigForm] = useState(false)
  const [form, setForm] = useState({ fechaInicio: '', dias: '', observaciones: '' })
  const [configForm, setConfigForm] = useState({ usuarioId: '', anio: String(new Date().getFullYear()), diasAsignados: '' })
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'success' | 'error'>('success')
  const [uploadComp, setUploadComp] = useState<{ id: number; url: string } | null>(null)

  const token = () => localStorage.getItem('token') || ''

  const notify = (m: string, t: 'success' | 'error' = 'success') => {
    setMsg(m); setMsgType(t)
    setTimeout(() => setMsg(''), 3500)
  }

  const fetchData = async (t: string, uid?: number) => {
    const anioStr = String(anio)
    const url = uid
      ? `/api/vacaciones?anio=${anioStr}&usuarioId=${uid}`
      : `/api/vacaciones?anio=${anioStr}`

    const [vacRes, cfgRes] = await Promise.all([
      fetch(url, { headers: { Authorization: `Bearer ${t}` } }),
      fetch(`/api/vacaciones/config?anio=${anioStr}`, { headers: { Authorization: `Bearer ${t}` } })
    ])

    if (vacRes.ok) {
      const d = await vacRes.json()
      setSolicitudes(d.solicitudes || [])
      setDiasUsados(d.diasUsados || 0)
      setDiasAsignados(d.diasAsignados || 0)
    }
    if (cfgRes.ok) setConfigs((await cfgRes.json()).configs || [])
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
        const uRes = await fetch('/api/usuarios', { headers: { Authorization: `Bearer ${t}` } })
        if (uRes.ok) setUsuarios((await uRes.json()).usuarios || [])
      }

      await fetchData(t)
      setLoading(false)
    }
    init()
  }, [router])

  useEffect(() => {
    if (user) fetchData(token())
  }, [anio])

  const handleCreate = async () => {
    if (!form.fechaInicio || !form.dias) { notify('Fecha y días requeridos', 'error'); return }
    const t = token()
    const res = await fetch('/api/vacaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify(form)
    })
    if (res.ok) {
      setShowForm(false)
      setForm({ fechaInicio: '', dias: '', observaciones: '' })
      await fetchData(t)
      notify('Solicitud creada en borrador')
    } else {
      notify((await res.json()).error || 'Error', 'error')
    }
  }

  const handleAction = async (id: number, estado: string) => {
    const t = token()
    const res = await fetch(`/api/vacaciones/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ estado })
    })
    if (res.ok) {
      await fetchData(t)
      notify(`Solicitud ${estado.toLowerCase()}`)
    } else {
      notify('Error al actualizar', 'error')
    }
  }

  const handleUploadComp = async (id: number) => {
    if (!uploadComp?.url) { notify('Sube el comprobante primero', 'error'); return }
    const t = token()
    const res = await fetch(`/api/vacaciones/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ comprobanteUrl: uploadComp.url, estado: 'Pendiente Aprobacion' })
    })
    if (res.ok) {
      setUploadComp(null)
      await fetchData(t)
      notify('Comprobante enviado, esperando aprobación')
    } else {
      notify('Error', 'error')
    }
  }

  const handleSaveConfig = async () => {
    if (!configForm.usuarioId || !configForm.diasAsignados) { notify('Todos los campos requeridos', 'error'); return }
    const t = token()
    const res = await fetch('/api/vacaciones/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify(configForm)
    })
    if (res.ok) {
      setShowConfigForm(false)
      await fetchData(t)
      notify('Configuración guardada')
    } else {
      notify('Error', 'error')
    }
  }

  const estadoColor: Record<string, string> = {
    'Borrador': 'bg-gray-100 text-gray-800',
    'Pendiente Aprobacion': 'bg-yellow-100 text-yellow-800',
    'Aprobado': 'bg-green-100 text-green-800',
    'Rechazado': 'bg-red-100 text-red-800'
  }

  const isAdmin = user?.rol?.nombre === 'Administrador'
  const saldo = diasAsignados - diasUsados

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
              <h1 className="text-2xl font-bold text-gray-900">Control de Vacaciones</h1>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={anio}
                onChange={e => setAnio(parseInt(e.target.value))}
                className="input-field w-24"
                min="2020" max="2035"
              />
              {!isAdmin && (
                <button onClick={() => setShowForm(true)} className="btn-primary">
                  + Solicitar Vacaciones
                </button>
              )}
              {isAdmin && (
                <button onClick={() => { setShowConfigForm(true) }} className="btn-secondary">
                  Configurar Días
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {msg && (
          <div className={`mb-4 p-3 rounded-md text-sm font-medium ${msgType === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {msg}
          </div>
        )}

        {/* KPIs para empleado */}
        {!isAdmin && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500">Días Asignados {anio}</p>
              <p className="text-2xl font-bold text-blue-600">{diasAsignados}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500">Días Usados</p>
              <p className="text-2xl font-bold text-orange-600">{diasUsados}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500">Saldo Disponible</p>
              <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>{saldo}</p>
            </div>
          </div>
        )}

        {/* Tabs admin */}
        {isAdmin && (
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => setTab('solicitudes')}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'solicitudes' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Solicitudes
            </button>
            <button
              onClick={() => setTab('config')}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'config' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Configuración de Días
            </button>
          </div>
        )}

        {/* Tabla de solicitudes */}
        {(!isAdmin || tab === 'solicitudes') && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Solicitudes de Vacaciones {anio}</h3>
            </div>
            {solicitudes.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No hay solicitudes para este año</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {isAdmin && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Inicio</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Días</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Observaciones</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {solicitudes.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        {isAdmin && (
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.usuario.nombre}</td>
                        )}
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(s.fechaInicio).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{s.dias}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${estadoColor[s.estado] || 'bg-gray-100 text-gray-800'}`}>
                            {s.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{s.observaciones || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {/* Empleado: enviar comprobante */}
                            {!isAdmin && s.estado === 'Borrador' && (
                              <button
                                onClick={() => setUploadComp({ id: s.id, url: '' })}
                                className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-1 rounded"
                              >
                                Enviar Firmado
                              </button>
                            )}
                            {s.comprobanteUrl && (
                              <a href={s.comprobanteUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-gray-50 text-gray-700 hover:bg-gray-100 px-2 py-1 rounded">
                                Ver Doc
                              </a>
                            )}
                            {/* Admin: aprobar/rechazar */}
                            {isAdmin && s.estado === 'Pendiente Aprobacion' && (
                              <>
                                <button onClick={() => handleAction(s.id, 'Aprobado')} className="text-xs bg-green-50 text-green-700 hover:bg-green-100 px-2 py-1 rounded">
                                  Aprobar
                                </button>
                                <button onClick={() => handleAction(s.id, 'Rechazado')} className="text-xs bg-red-50 text-red-700 hover:bg-red-100 px-2 py-1 rounded">
                                  Rechazar
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Config dias admin */}
        {isAdmin && tab === 'config' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-medium text-gray-900">Días Asignados por Empleado — {anio}</h3>
              <button onClick={() => setShowConfigForm(true)} className="btn-primary text-sm">
                + Asignar Días
              </button>
            </div>
            {configs.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No hay configuraciones para este año</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Año</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Días Asignados</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {configs.map((c, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.usuario.nombre}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{c.anio}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{c.diasAsignados}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal nueva solicitud */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">Nueva Solicitud de Vacaciones</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio *</label>
                <input type="date" value={form.fechaInicio} onChange={e => setForm(p => ({ ...p, fechaInicio: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de días *</label>
                <input type="number" min="1" value={form.dias} onChange={e => setForm(p => ({ ...p, dias: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea value={form.observaciones} onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))} className="input-field" rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleCreate} className="btn-primary">Crear Borrador</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal config días */}
      {showConfigForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">Asignar Días de Vacaciones</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empleado *</label>
                <select value={configForm.usuarioId} onChange={e => setConfigForm(p => ({ ...p, usuarioId: e.target.value }))} className="input-field">
                  <option value="">Seleccionar...</option>
                  {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Año *</label>
                <input type="number" value={configForm.anio} onChange={e => setConfigForm(p => ({ ...p, anio: e.target.value }))} className="input-field" min="2024" max="2030" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Días asignados *</label>
                <input type="number" min="0" value={configForm.diasAsignados} onChange={e => setConfigForm(p => ({ ...p, diasAsignados: e.target.value }))} className="input-field" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowConfigForm(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleSaveConfig} className="btn-primary">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal subir comprobante firmado */}
      {uploadComp && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">Cargar Documento Firmado</h2>
            <p className="text-sm text-gray-600 mb-4">Pega la URL del documento firmado o cárgalo desde UploadThing:</p>
            <input
              type="text"
              placeholder="URL del documento firmado"
              value={uploadComp.url}
              onChange={e => setUploadComp(p => p ? { ...p, url: e.target.value } : null)}
              className="input-field mb-4"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setUploadComp(null)} className="btn-secondary">Cancelar</button>
              <button onClick={() => handleUploadComp(uploadComp.id)} className="btn-primary">
                Enviar para Aprobación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
