'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

interface Solicitud {
  id: number
  fechaInicio: string
  dias: number
  estado: string
  observaciones?: string
  comprobanteUrl?: string
  fechaAprobacion?: string
  usuario: { id: number; nombre: string }
  aprobador?: { id: number; nombre: string }
}

export default function ImprimirVacacionesPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem('token')
      if (!token) { router.push('/auth/login'); return }
      const res = await fetch(`/api/vacaciones/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) { setError('No se pudo cargar la solicitud'); setLoading(false); return }
      const data = await res.json()
      setSolicitud(data.solicitud)
      setLoading(false)
    }
    load()
  }, [id, router])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>
  )

  if (error || !solicitud) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-red-500">{error || 'Solicitud no encontrada'}</p>
    </div>
  )

  const fechaInicio = new Date(solicitud.fechaInicio)
  const fechaFin = new Date(fechaInicio)
  fechaFin.setDate(fechaFin.getDate() + solicitud.dias - 1)

  const fmtDate = (d: Date) => d.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
  const fechaImpresion = fmtDate(new Date())

  const estadoLabel: Record<string, string> = {
    'Borrador': 'Borrador',
    'Pendiente Aprobacion': 'Pendiente de Aprobación',
    'Aprobado': 'APROBADO',
    'Rechazado': 'RECHAZADO',
  }

  return (
    <>
      {/* Controles (no imprimen) */}
      <div className="print:hidden bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900 text-sm">
              ← Volver
            </button>
            <span className="text-sm font-medium text-gray-700">Solicitud de Vacaciones — {solicitud.usuario.nombre}</span>
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
      <div className="max-w-3xl mx-auto px-8 py-10 print:px-0 print:py-0">

        {/* Encabezado */}
        <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
          <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
            Solicitud de Vacaciones
          </h1>
          <p className="text-sm text-gray-500 mt-2">Formulario oficial de solicitud — conservar para expediente</p>
        </div>

        {/* Datos del empleado */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-gray-500 uppercase mb-3 border-b pb-1">Datos del Solicitante</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <span className="text-gray-500">Nombre completo:</span>
              <span className="ml-2 font-semibold text-gray-900">{solicitud.usuario.nombre}</span>
            </div>
            <div>
              <span className="text-gray-500">No. de solicitud:</span>
              <span className="ml-2 font-semibold text-gray-900">#{solicitud.id}</span>
            </div>
            <div>
              <span className="text-gray-500">Fecha de emisión:</span>
              <span className="ml-2 text-gray-900">{fechaImpresion}</span>
            </div>
            <div>
              <span className="text-gray-500">Estado:</span>
              <span className={`ml-2 font-bold ${solicitud.estado === 'Aprobado' ? 'text-green-700' : solicitud.estado === 'Rechazado' ? 'text-red-700' : 'text-gray-700'}`}>
                {estadoLabel[solicitud.estado] || solicitud.estado}
              </span>
            </div>
          </div>
        </div>

        {/* Período de vacaciones */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-gray-500 uppercase mb-3 border-b pb-1">Período Solicitado</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="border border-gray-300 rounded p-4 text-center">
              <p className="text-xs text-gray-500 uppercase mb-1">Fecha de Inicio</p>
              <p className="text-base font-bold text-gray-900">{fmtDate(fechaInicio)}</p>
            </div>
            <div className="border border-gray-300 rounded p-4 text-center">
              <p className="text-xs text-gray-500 uppercase mb-1">Fecha de Regreso</p>
              <p className="text-base font-bold text-gray-900">{fmtDate(fechaFin)}</p>
            </div>
            <div className="border border-gray-800 bg-gray-50 rounded p-4 text-center">
              <p className="text-xs text-gray-500 uppercase mb-1">Días Solicitados</p>
              <p className="text-3xl font-bold text-gray-900">{solicitud.dias}</p>
            </div>
          </div>
        </div>

        {/* Observaciones */}
        {solicitud.observaciones && (
          <div className="mb-8">
            <h2 className="text-xs font-bold text-gray-500 uppercase mb-3 border-b pb-1">Observaciones / Motivo</h2>
            <div className="border border-gray-200 rounded p-4 bg-gray-50 text-sm text-gray-800 min-h-[60px]">
              {solicitud.observaciones}
            </div>
          </div>
        )}

        {/* Aprobación (si aplica) */}
        {solicitud.estado === 'Aprobado' && solicitud.aprobador && (
          <div className="mb-8">
            <h2 className="text-xs font-bold text-gray-500 uppercase mb-3 border-b pb-1">Datos de Aprobación</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <span className="text-gray-500">Aprobado por:</span>
                <span className="ml-2 font-semibold text-gray-900">{solicitud.aprobador.nombre}</span>
              </div>
              {solicitud.fechaAprobacion && (
                <div>
                  <span className="text-gray-500">Fecha de aprobación:</span>
                  <span className="ml-2 text-gray-900">{fmtDate(new Date(solicitud.fechaAprobacion))}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instrucciones de llenado */}
        <div className="mb-10 p-4 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 print:border-gray-300 print:bg-gray-50 print:text-gray-700">
          <p className="font-bold mb-1">Instrucciones:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Este documento debe ser firmado por el solicitante y el supervisor antes de su envío.</li>
            <li>Una vez firmado, escanear o fotografiar y adjuntar como comprobante en el sistema.</li>
            <li>Conservar el original en el expediente del empleado.</li>
          </ul>
        </div>

        {/* Firmas */}
        <div className="mt-12 grid grid-cols-2 gap-12 print:mt-16">
          {[
            { label: 'Firma del Solicitante', sub: solicitud.usuario.nombre },
            { label: 'Firma del Supervisor / Autorizador', sub: solicitud.aprobador?.nombre || '________________________' },
          ].map(({ label, sub }) => (
            <div key={label} className="text-center">
              <div className="border-t-2 border-gray-400 pt-3 mt-12">
                <p className="text-sm font-semibold text-gray-700">{label}</p>
                <p className="text-xs text-gray-500 mt-1">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { margin: 18mm 14mm; }
          body { font-size: 11pt; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </>
  )
}
