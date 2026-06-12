'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

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
  descripcion: string
  conclusion?: string
  estado: string
  usuario: { nombre: string }
}

interface Sesion {
  id: number
  nombre: string
  estado: string
  fechaInicio: string
  fechaFin?: string
  sucursal: { id: number; nombre: string }
  usuario: { id: number; nombre: string }
  items: Item[]
  incidencias: Incidencia[]
}

export default function ImprimirInventarioPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem('token')
      if (!token) { router.push('/auth/login'); return }
      const res = await fetch(`/api/inventario/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) { setError('No se pudo cargar la sesión'); setLoading(false); return }
      const data = await res.json()
      setSesion(data.sesion)
      setLoading(false)
    }
    load()
  }, [id, router])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>
  )

  if (error || !sesion) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-red-500">{error || 'Sesión no encontrada'}</p>
    </div>
  )

  const itemsOk = sesion.items.filter(i => (i.diferencia ?? 0) === 0)
  const itemsFaltantes = sesion.items.filter(i => (i.diferencia ?? 0) < 0)
  const itemsSobrantes = sesion.items.filter(i => (i.diferencia ?? 0) > 0)
  const fechaImpresion = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <>
      {/* Controles de pantalla (no imprimen) */}
      <div className="print:hidden bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900 text-sm">
              ← Volver
            </button>
            <span className="text-sm font-medium text-gray-700">Vista de impresión — {sesion.nombre}</span>
          </div>
          <button
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-semibold flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      {/* Contenido imprimible */}
      <div className="max-w-4xl mx-auto px-6 py-8 print:px-0 print:py-0">

        {/* Encabezado del documento */}
        <div className="mb-6 border-b-2 border-gray-800 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Hoja de Inventario</h1>
              <h2 className="text-lg font-semibold text-gray-700 mt-1">{sesion.nombre}</h2>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p className="font-semibold">{sesion.sucursal.nombre}</p>
              <p>Inicio: {new Date(sesion.fechaInicio).toLocaleDateString('es-MX')}</p>
              {sesion.fechaFin && <p>Cierre: {new Date(sesion.fechaFin).toLocaleDateString('es-MX')}</p>}
              <p>Estado: <span className="font-semibold">{sesion.estado}</span></p>
              <p className="mt-1 text-xs text-gray-400">Impreso: {fechaImpresion}</p>
            </div>
          </div>
        </div>

        {/* Resumen ejecutivo */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total SKUs', value: sesion.items.length, color: 'text-gray-800' },
            { label: 'Sin diferencia', value: itemsOk.length, color: 'text-green-700' },
            { label: 'Faltantes', value: itemsFaltantes.length, color: 'text-red-700' },
            { label: 'Sobrantes', value: itemsSobrantes.length, color: 'text-amber-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="border border-gray-300 rounded p-3 text-center">
              <p className="text-xs text-gray-500 uppercase mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Tabla principal de ítems */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-700 uppercase mb-2">Detalle de Ítems</h3>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold">SKU</th>
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Descripción</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-semibold">Sistema</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-semibold">Físico</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-semibold">Diferencia</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {sesion.items.map((item, idx) => {
                const diff = item.diferencia ?? 0
                const rowBg = diff < 0 ? 'bg-red-50' : diff > 0 ? 'bg-amber-50' : ''
                const diffColor = diff < 0 ? 'text-red-700 font-semibold' : diff > 0 ? 'text-amber-700 font-semibold' : 'text-green-700'
                return (
                  <tr key={item.id} className={`${rowBg} ${idx % 2 === 0 && !rowBg ? 'bg-white' : ''}`}>
                    <td className="border border-gray-300 px-3 py-1.5 font-mono text-xs">{item.sku}</td>
                    <td className="border border-gray-300 px-3 py-1.5">{item.descripcion}</td>
                    <td className="border border-gray-300 px-3 py-1.5 text-center">{item.cantidadSistema}</td>
                    <td className="border border-gray-300 px-3 py-1.5 text-center">
                      {item.cantidadFisica !== undefined ? item.cantidadFisica : <span className="text-gray-400 italic">—</span>}
                    </td>
                    <td className={`border border-gray-300 px-3 py-1.5 text-center ${diffColor}`}>
                      {item.cantidadFisica !== undefined ? (diff > 0 ? `+${diff}` : diff) : '—'}
                    </td>
                    <td className="border border-gray-300 px-3 py-1.5 text-center">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        item.estado === 'ok' ? 'bg-green-100 text-green-800' :
                        item.estado === 'diferencia' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>{item.estado}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Sección de faltantes (si hay) */}
        {itemsFaltantes.length > 0 && (
          <div className="mb-6 print:break-before-avoid">
            <h3 className="text-sm font-bold text-red-700 uppercase mb-2">
              Ítems con Faltante ({itemsFaltantes.length})
            </h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-red-50">
                  <th className="border border-red-200 px-3 py-2 text-left">SKU</th>
                  <th className="border border-red-200 px-3 py-2 text-left">Descripción</th>
                  <th className="border border-red-200 px-3 py-2 text-center">Sistema</th>
                  <th className="border border-red-200 px-3 py-2 text-center">Físico</th>
                  <th className="border border-red-200 px-3 py-2 text-center">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {itemsFaltantes.map(item => (
                  <tr key={item.id} className="bg-red-50">
                    <td className="border border-red-200 px-3 py-1.5 font-mono text-xs">{item.sku}</td>
                    <td className="border border-red-200 px-3 py-1.5">{item.descripcion}</td>
                    <td className="border border-red-200 px-3 py-1.5 text-center">{item.cantidadSistema}</td>
                    <td className="border border-red-200 px-3 py-1.5 text-center">{item.cantidadFisica}</td>
                    <td className="border border-red-200 px-3 py-1.5 text-center text-red-700 font-bold">{item.diferencia}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Incidencias */}
        {sesion.incidencias.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-2">Incidencias ({sesion.incidencias.length})</h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left">Descripción</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Conclusión</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">Estado</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Registrado por</th>
                </tr>
              </thead>
              <tbody>
                {sesion.incidencias.map((inc, i) => (
                  <tr key={inc.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-3 py-1.5">{inc.descripcion}</td>
                    <td className="border border-gray-300 px-3 py-1.5">{inc.conclusion || <span className="text-gray-400 italic">Sin conclusión</span>}</td>
                    <td className="border border-gray-300 px-3 py-1.5 text-center">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        inc.estado === 'Resuelta' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}>{inc.estado}</span>
                    </td>
                    <td className="border border-gray-300 px-3 py-1.5">{inc.usuario.nombre}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Firmas */}
        <div className="mt-12 grid grid-cols-3 gap-8 print:mt-16">
          {['Elaborado por', 'Revisado por', 'Autorizado por'].map(label => (
            <div key={label} className="text-center">
              <div className="border-t border-gray-400 pt-2">
                <p className="text-xs text-gray-600">{label}</p>
                <p className="text-xs text-gray-400 mt-1">Nombre y firma</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { margin: 15mm 12mm; }
          body { font-size: 11pt; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </>
  )
}
