'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { MovimientoDiario, AuthUser } from '@/types/database'
import * as XLSX from 'xlsx'
import { formatNumberMX, roundCurrency } from '@/lib/formatters'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmt = (v: number) => formatNumberMX(v, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v)

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const COLORS = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#06b6d4']

function mesLabel(yyyy_mm: string) {
  const [y, m] = yyyy_mm.split('-')
  return `${MESES[parseInt(m) - 1]} ${y}`
}

function firstDayOfMonth(yyyy_mm: string) {
  return `${yyyy_mm}-01`
}

function lastDayOfMonth(yyyy_mm: string) {
  const [y, m] = yyyy_mm.split('-')
  const last = new Date(parseInt(y), parseInt(m), 0).getDate()
  return `${yyyy_mm}-${String(last).padStart(2, '0')}`
}

// Genera array de YYYY-MM entre dos meses inclusive
function rangoMeses(desde: string, hasta: string): string[] {
  const result: string[] = []
  let [y, m] = desde.split('-').map(Number)
  const [fy, fm] = hasta.split('-').map(Number)
  while (y < fy || (y === fy && m <= fm)) {
    result.push(`${y}-${String(m).padStart(2, '0')}`)
    m++
    if (m > 12) { m = 1; y++ }
  }
  return result
}

// ─── tipos ────────────────────────────────────────────────────────────────────
interface MesAgregado {
  mes: string         // YYYY-MM
  label: string       // 'Ene 2026'
  ventas: number
  gastos: number
  depositos: number
  tarjeta: number
  transferencias: number
  efectivoCalculado: number
  credito: number
  abonos: number
}

// ─── componente principal ─────────────────────────────────────────────────────
export default function ResumenPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [movimientos, setMovimientos] = useState<MovimientoDiario[]>([])
  const [loading, setLoading] = useState(true)
  const [sucursales, setSucursales] = useState<{ id: number; nombre: string }[]>([])
  const [sucursalFiltro, setSucursalFiltro] = useState('')
  const [bloques, setBloques] = useState<{ id: number; nombre: string }[]>([])
  const [bloqueFiltro, setBloqueFiltro] = useState('')

  const nowMes = () => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
  }
  const [desde, setDesde] = useState(() => {
    const n = new Date()
    return `${n.getFullYear()}-01`
  })
  const [hasta, setHasta] = useState(nowMes)

  // tabs: 'ceo' | 'comercial' | 'tienda'
  const [activeTab, setActiveTab] = useState<'ceo' | 'comercial' | 'tienda'>('ceo')

  // P&L sliders
  const [simCogs, setSimCogs] = useState(60)
  const [simFixed, setSimFixed] = useState(45000)

  // tabla
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const itemsPerPage = 15

  // ── carga inicial ────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token')
      if (!token) { router.push('/auth/login'); return }

      const r = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      if (!r.ok) { router.push('/auth/login'); return }

      const { user: u } = await r.json()
      setUser(u)

      if (u?.rol?.nombre === 'Administrador') {
        const [sr, br] = await Promise.all([
          fetch('/api/sucursales', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/bloques', { headers: { Authorization: `Bearer ${token}` } }),
        ])
        if (sr.ok) setSucursales((await sr.json()).sucursales || [])
        if (br.ok) setBloques((await br.json()).bloques || [])
      }
    }
    init()
  }, [router])

  // ── fetch datos ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    fetchData()
  }, [user, desde, hasta, sucursalFiltro, bloqueFiltro])

  const fetchData = async () => {
    setLoading(true)
    const token = localStorage.getItem('token')
    const params = new URLSearchParams({
      fechaInicio: firstDayOfMonth(desde),
      fechaFin: lastDayOfMonth(hasta),
    })
    if (sucursalFiltro) params.set('sucursalId', sucursalFiltro)
    if (bloqueFiltro && !sucursalFiltro) params.set('bloqueId', bloqueFiltro)

    const r = await fetch(`/api/movimientos-diarios?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (r.ok) {
      const d = await r.json()
      setMovimientos(d.movimientosDiarios || [])
    }
    setLoading(false)
  }

  // ── agregados por mes ────────────────────────────────────────────────────────
  const mesesAgregados = useMemo<MesAgregado[]>(() => {
    const mapa: Record<string, MesAgregado> = {}
    movimientos.forEach(m => {
      const mes = (m.fecha as unknown as string).split('T')[0].substring(0, 7)
      if (!mapa[mes]) mapa[mes] = {
        mes, label: mesLabel(mes),
        ventas: 0, gastos: 0, depositos: 0, tarjeta: 0,
        transferencias: 0, efectivoCalculado: 0, credito: 0, abonos: 0
      }
      const a = mapa[mes]
      a.ventas += m.ventasBrutas
      a.gastos += m.gastos
      a.depositos += m.depositos || 0
      a.tarjeta += m.pagoTarjeta
      a.transferencias += m.transferencias
      a.credito += m.credito
      a.abonos += m.abonosCredito
    })
    return rangoMeses(desde, hasta)
      .map(m => mapa[m] ?? { mes: m, label: mesLabel(m), ventas: 0, gastos: 0, depositos: 0, tarjeta: 0, transferencias: 0, efectivoCalculado: 0, credito: 0, abonos: 0 })
      .map(a => ({ ...a, efectivoCalculado: roundCurrency(a.ventas - a.tarjeta - a.transferencias - a.gastos - a.credito) }))
  }, [movimientos, desde, hasta])

  // ── totales ──────────────────────────────────────────────────────────────────
  const totales = useMemo(() => {
    return mesesAgregados.reduce((acc, m) => ({
      ventas: acc.ventas + m.ventas,
      gastos: acc.gastos + m.gastos,
      depositos: acc.depositos + m.depositos,
      tarjeta: acc.tarjeta + m.tarjeta,
      transferencias: acc.transferencias + m.transferencias,
      credito: acc.credito + m.credito,
      abonos: acc.abonos + m.abonos,
      efectivoCalculado: acc.efectivoCalculado + m.efectivoCalculado,
    }), { ventas: 0, gastos: 0, depositos: 0, tarjeta: 0, transferencias: 0, credito: 0, abonos: 0, efectivoCalculado: 0 })
  }, [mesesAgregados])

  // ── P&L ─────────────────────────────────────────────────────────────────────
  const pnl = useMemo(() => {
    const ventasNetas = roundCurrency(totales.ventas * 0.98)
    const cogs = roundCurrency(ventasNetas * simCogs / 100)
    const utilidadBruta = roundCurrency(ventasNetas - cogs)
    const mesesCount = mesesAgregados.filter(m => m.ventas > 0).length || 1
    const opexFijo = simFixed * mesesCount
    const ebitda = roundCurrency(utilidadBruta - totales.gastos - opexFijo)
    const comisionTarjeta = roundCurrency(totales.tarjeta * 0.02)
    const isr = roundCurrency(Math.max(0, ebitda * 0.30))
    const utilidadNeta = roundCurrency(ebitda - comisionTarjeta - isr)
    return { ventasNetas, cogs, utilidadBruta, opexFijo, ebitda, comisionTarjeta, isr, utilidadNeta }
  }, [totales, simCogs, simFixed, mesesAgregados])

  // ── tabla día por día ────────────────────────────────────────────────────────
  const filasDias = useMemo(() => {
    return movimientos
      .map(m => ({
        fecha: (m.fecha as unknown as string).split('T')[0],
        sucursal: (m as any).sucursal?.nombre ?? '',
        ventas: m.ventasBrutas,
        gastos: m.gastos,
        tarjeta: m.pagoTarjeta,
        transferencias: m.transferencias,
        depositos: m.depositos || 0,
        credito: m.credito,
        abonos: m.abonosCredito,
        saldoDia: roundCurrency(m.ventasBrutas - m.credito + m.abonosCredito - m.pagoTarjeta - m.transferencias - m.gastos),
      }))
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [movimientos])

  const filasFiltradas = useMemo(() =>
    filasDias.filter(f => !searchTerm || f.fecha.includes(searchTerm) || f.sucursal.toLowerCase().includes(searchTerm.toLowerCase()))
  , [filasDias, searchTerm])

  const totalPages = Math.ceil(filasFiltradas.length / itemsPerPage)
  const filasPaginadas = filasFiltradas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // ── exportar Excel ───────────────────────────────────────────────────────────
  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filasDias.map(f => ({
      Fecha: f.fecha,
      Sucursal: f.sucursal,
      'Ventas Brutas': f.ventas,
      Gastos: f.gastos,
      Tarjeta: f.tarjeta,
      Transferencias: f.transferencias,
      Crédito: f.credito,
      Abonos: f.abonos,
      Depósitos: f.depositos,
      'Saldo Día': f.saldoDia,
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen')
    XLSX.writeFile(wb, `Resumen_${desde}_${hasta}.xlsx`)
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/auth/login')
  }

  // ─────────────────────────────────────────────────────────────────────────────
  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  )

  const esAdmin = user.rol?.nombre === 'Administrador'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow border-b sticky top-0 z-20">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard')} className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1">
              <span className="text-lg">←</span> Dashboard
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-blue-900">Resumen Empresarial</h1>
              <p className="text-sm text-gray-400">
                {user.sucursal?.nombre ||
                  (bloqueFiltro ? `Bloque: ${bloques.find(b => String(b.id) === bloqueFiltro)?.nombre ?? bloqueFiltro}` :
                  sucursalFiltro ? sucursales.find(s => String(s.id) === sucursalFiltro)?.nombre :
                  esAdmin ? 'Todas las sucursales' : 'Sin sucursal')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">{user.nombre}</span>
            <button onClick={handleLogout} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-semibold">
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── Filtros ── */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-5">
          <div className="flex flex-wrap items-end gap-4">
            {/* Desde */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Desde</label>
              <input type="month" value={desde} max={hasta}
                onChange={e => { setDesde(e.target.value); setCurrentPage(1) }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>

            {/* Hasta */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Hasta</label>
              <input type="month" value={hasta} min={desde}
                onChange={e => { setHasta(e.target.value); setCurrentPage(1) }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>

            {/* Sucursal (solo admin) */}
            {esAdmin && sucursales.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Sucursal</label>
                <select value={sucursalFiltro} onChange={e => { setSucursalFiltro(e.target.value); setBloqueFiltro(''); setCurrentPage(1) }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white">
                  <option value="">Todas</option>
                  {sucursales.map(s => <option key={s.id} value={String(s.id)}>{s.nombre}</option>)}
                </select>
              </div>
            )}

            {/* Bloque (solo admin) */}
            {esAdmin && bloques.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Bloque</label>
                <select value={bloqueFiltro} onChange={e => { setBloqueFiltro(e.target.value); setSucursalFiltro(''); setCurrentPage(1) }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white">
                  <option value="">Todos</option>
                  {bloques.map(b => <option key={b.id} value={String(b.id)}>{b.nombre}</option>)}
                </select>
              </div>
            )}

            {/* Exportar */}
            {esAdmin && (
              <button onClick={exportarExcel}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Excel
              </button>
            )}

            {loading && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                Cargando...
              </div>
            )}
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Ventas Brutas', value: totales.ventas, color: 'text-green-600' },
            { label: 'Gastos Caja', value: totales.gastos, color: 'text-red-600' },
            { label: 'Depósitos', value: totales.depositos, color: 'text-teal-600' },
            { label: 'Pago Tarjeta', value: totales.tarjeta, color: 'text-indigo-600' },
            { label: 'Créditos', value: totales.credito, color: 'text-amber-600' },
            { label: 'Abonos', value: totales.abonos, color: 'text-blue-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-base font-bold ${color}`}>${fmt(value)}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs de gráficas ── */}
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-gray-200">
            {([
              { id: 'ceo', label: '👑 CEO & Dirección' },
              { id: 'comercial', label: '🏪 Estrategia Comercial' },
              { id: 'tienda', label: '🏦 Control de Tienda' },
            ] as const).map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-5 py-3 text-sm font-semibold transition-colors ${activeTab === t.id
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── CEO Tab ── */}
          {activeTab === 'ceo' && (
            <div className="p-6 space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Tendencia mensual */}
                <div className="lg:col-span-2">
                  <h3 className="text-sm font-bold text-gray-700 uppercase mb-3">Tendencia Mensual: Ventas, Gastos y Depósitos</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={mesesAgregados} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: any) => fmtCurrency(Number(v))} />
                      <Legend />
                      <Bar dataKey="ventas" name="Ventas" fill="#3b82f6" radius={[3,3,0,0]} />
                      <Bar dataKey="gastos" name="Gastos" fill="#ef4444" radius={[3,3,0,0]} />
                      <Bar dataKey="depositos" name="Depósitos" fill="#10b981" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Pie participación por tienda (admin con todas) */}
                <div>
                  <h3 className="text-sm font-bold text-gray-700 uppercase mb-3">Distribución por Sucursal</h3>
                  {esAdmin && !sucursalFiltro ? (
                    <SucursalPieChart movimientos={movimientos} />
                  ) : (
                    <div className="h-[300px] flex flex-col items-center justify-center text-gray-400 text-sm">
                      <svg className="w-10 h-10 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                      </svg>
                      Selecciona "Todas" las sucursales para ver comparativa
                    </div>
                  )}
                </div>
              </div>

              {/* P&L simulado */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 uppercase mb-4">Estado de Resultados Estimado (P&L)</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Tabla P&L */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-sm space-y-2">
                    <PnlRow label="(+) Ventas Brutas" value={totales.ventas} color="text-gray-800" bold />
                    <PnlRow label="(-) Descuentos est. 2%" value={-totales.ventas * 0.02} color="text-gray-500" indent />
                    <PnlRow label="(=) Ventas Netas" value={pnl.ventasNetas} color="text-emerald-600" bold separator />
                    <PnlRow label={`(-) COGS ${simCogs}%`} value={-pnl.cogs} color="text-red-500" />
                    <PnlRow label="(=) Utilidad Bruta" value={pnl.utilidadBruta} color="text-blue-600" bold separator />
                    <PnlRow label="(-) Gastos directos de caja" value={-totales.gastos} color="text-red-400" />
                    <PnlRow label={`(-) Gastos fijos corp. $${fmt(simFixed)}/mes`} value={-pnl.opexFijo} color="text-red-400" indent />
                    <PnlRow label="(=) EBITDA" value={pnl.ebitda} color="text-amber-600" bold separator />
                    <PnlRow label="(-) Comisión TPV 2%" value={-pnl.comisionTarjeta} color="text-gray-500" indent />
                    <PnlRow label="(-) ISR estimado 30%" value={-pnl.isr} color="text-gray-500" indent />
                    <PnlRow label="(=) UTILIDAD NETA ESTIMADA" value={pnl.utilidadNeta}
                      color={pnl.utilidadNeta >= 0 ? 'text-emerald-600' : 'text-red-600'} bold separator />
                  </div>

                  {/* Sliders */}
                  <div className="space-y-5">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-xs font-bold text-amber-700 uppercase mb-3">⚙️ Parámetros ERP (Simulado)</p>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Costo de Ventas (COGS)</span>
                            <span className="font-bold text-gray-900">{simCogs}%</span>
                          </div>
                          <input type="range" min={30} max={80} value={simCogs}
                            onChange={e => setSimCogs(Number(e.target.value))}
                            className="w-full accent-blue-600" />
                        </div>
                        <div>
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Gastos Fijos Corp. / mes</span>
                            <span className="font-bold text-gray-900">{fmtCurrency(simFixed)}</span>
                          </div>
                          <input type="range" min={10000} max={200000} step={5000} value={simFixed}
                            onChange={e => setSimFixed(Number(e.target.value))}
                            className="w-full accent-blue-600" />
                        </div>
                      </div>
                    </div>

                    {/* Indicadores rápidos */}
                    <div className="grid grid-cols-2 gap-3">
                      <StatBox label="Margen Flujo Local"
                        value={totales.ventas > 0 ? `${((totales.ventas - totales.gastos) / totales.ventas * 100).toFixed(1)}%` : '—'}
                        color="text-blue-600" />
                      <StatBox label="Ratio Bancarización"
                        value={totales.ventas > 0 ? `${Math.min((totales.depositos / (totales.ventas - totales.tarjeta - totales.transferencias - totales.gastos) * 100), 100).toFixed(1)}%` : '—'}
                        color="text-emerald-600" />
                      <StatBox label="% Gastos / Ventas"
                        value={totales.ventas > 0 ? `${(totales.gastos / totales.ventas * 100).toFixed(1)}%` : '—'}
                        color="text-red-600" />
                      <StatBox label="Margen Neto Est."
                        value={totales.ventas > 0 ? `${(pnl.utilidadNeta / totales.ventas * 100).toFixed(1)}%` : '—'}
                        color={pnl.utilidadNeta >= 0 ? 'text-emerald-600' : 'text-red-600'} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Estrategia Comercial Tab ── */}
          {activeTab === 'comercial' && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Mix métodos de pago */}
                <div>
                  <h3 className="text-sm font-bold text-gray-700 uppercase mb-3">Mix de Canales de Cobro</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Efectivo', value: Math.max(0, totales.efectivoCalculado) },
                            { name: 'Tarjeta', value: totales.tarjeta },
                            { name: 'Transferencias', value: totales.transferencias },
                            { name: 'Crédito', value: totales.credito },
                          ].filter(d => d.value > 0)}
                          cx="50%" cy="50%" outerRadius={100}
                          dataKey="value" nameKey="name"
                          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                          labelLine={true}
                        >
                          {['#10b981','#3b82f6','#8b5cf6','#f59e0b'].map((c, i) => <Cell key={i} fill={c} />)}
                        </Pie>
                        <Tooltip formatter={(v: any) => fmtCurrency(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Eficiencia recuperación cartera */}
                <div>
                  <h3 className="text-sm font-bold text-gray-700 uppercase mb-3">Recuperación de Cartera Mensual</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={mesesAgregados} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: any) => fmtCurrency(Number(v))} />
                      <Legend />
                      <Line dataKey="credito" name="Créditos otorgados" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      <Line dataKey="abonos" name="Abonos recibidos" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tendencia ventas mensual */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 uppercase mb-3">Tendencia de Ventas por Mes</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={mesesAgregados} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => fmtCurrency(Number(v))} />
                    <Legend />
                    <Line dataKey="ventas" name="Ventas Brutas" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Control de Tienda Tab ── */}
          {activeTab === 'tienda' && (
            <div className="p-6 space-y-6">
              {/* Entradas vs Salidas */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 uppercase mb-3">Entradas vs Salidas por Mes</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mesesAgregados.map(m => ({
                    ...m,
                    entradas: m.ventas + m.abonos,
                    salidas: m.gastos + m.tarjeta + m.transferencias + m.credito,
                  }))} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => fmtCurrency(Number(v))} />
                    <Legend />
                    <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[3,3,0,0]} />
                    <Bar dataKey="salidas" name="Salidas" fill="#ef4444" radius={[3,3,0,0]} />
                    <Bar dataKey="depositos" name="Depósitos Banco" fill="#3b82f6" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Tabla conciliación mensual */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 uppercase mb-3">Conciliación Mensual</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm divide-y divide-gray-200">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>
                        {['Mes','Ventas','+ Abonos','- Créditos','- Tarjeta','- Transf.','- Gastos','= Efectivo Teórico','- Depósitos','= Saldo Remanente'].map(h => (
                          <th key={h} className="px-3 py-2 text-right first:text-left whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {mesesAgregados.map(m => {
                        const efectivo = roundCurrency((m.ventas + m.abonos) - m.credito - m.tarjeta - m.transferencias - m.gastos)
                        const remanente = roundCurrency(efectivo - m.depositos)
                        return (
                          <tr key={m.mes} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-semibold text-gray-800 whitespace-nowrap">{m.label}</td>
                            <td className="px-3 py-2 text-right text-green-600">${fmt(m.ventas)}</td>
                            <td className="px-3 py-2 text-right text-emerald-600">+${fmt(m.abonos)}</td>
                            <td className="px-3 py-2 text-right text-amber-600">-${fmt(m.credito)}</td>
                            <td className="px-3 py-2 text-right text-indigo-600">-${fmt(m.tarjeta)}</td>
                            <td className="px-3 py-2 text-right text-purple-600">-${fmt(m.transferencias)}</td>
                            <td className="px-3 py-2 text-right text-red-600">-${fmt(m.gastos)}</td>
                            <td className="px-3 py-2 text-right font-semibold">${fmt(efectivo)}</td>
                            <td className="px-3 py-2 text-right text-teal-600">-${fmt(m.depositos)}</td>
                            <td className={`px-3 py-2 text-right font-bold ${remanente >= 0 ? 'text-green-700' : 'text-red-600'}`}>${fmt(remanente)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Tabla día a día ── */}
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-bold text-gray-800">
              Detalle diario — {mesLabel(desde)}{desde !== hasta ? ` a ${mesLabel(hasta)}` : ''}
              <span className="ml-2 text-sm font-normal text-gray-400">({filasFiltradas.length} registros)</span>
            </h3>
            <input type="text" placeholder="Buscar por fecha o sucursal..." value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1) }}
              className="pl-3 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-full sm:w-64" />
          </div>

          {filasDias.length === 0 && !loading ? (
            <div className="py-16 text-center text-gray-400">
              <p className="text-lg font-medium">Sin movimientos en el período seleccionado</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs divide-y divide-gray-200">
                  <thead className="bg-gray-50 text-gray-500 uppercase">
                    <tr>
                      {['Fecha','Sucursal','Ventas','Gastos','Tarjeta','Transf.','Crédito','Abonos','Depósitos','Saldo Día'].map(h => (
                        <th key={h} className="px-3 py-2 text-right first:text-left whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filasPaginadas.map((f, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-800">{f.fecha}</td>
                        <td className="px-3 py-2 text-gray-500">{f.sucursal}</td>
                        <td className="px-3 py-2 text-right text-green-600">${fmt(f.ventas)}</td>
                        <td className="px-3 py-2 text-right text-red-500">${fmt(f.gastos)}</td>
                        <td className="px-3 py-2 text-right text-indigo-600">${fmt(f.tarjeta)}</td>
                        <td className="px-3 py-2 text-right text-purple-600">${fmt(f.transferencias)}</td>
                        <td className="px-3 py-2 text-right text-amber-600">${fmt(f.credito)}</td>
                        <td className="px-3 py-2 text-right text-emerald-600">${fmt(f.abonos)}</td>
                        <td className="px-3 py-2 text-right text-teal-600">${fmt(f.depositos)}</td>
                        <td className={`px-3 py-2 text-right font-semibold ${f.saldoDia >= 0 ? 'text-green-700' : 'text-red-600'}`}>${fmt(f.saldoDia)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
                  <span>Mostrando {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filasFiltradas.length)} de {filasFiltradas.length}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">Anterior</button>
                    <span className="px-3 py-1">{currentPage} / {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50">Siguiente</button>
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

// ─── sub-componentes ──────────────────────────────────────────────────────────

function SucursalPieChart({ movimientos }: { movimientos: MovimientoDiario[] }) {
  const data = useMemo(() => {
    const map: Record<string, { name: string; value: number }> = {}
    movimientos.forEach(m => {
      const nombre = (m as any).sucursal?.nombre ?? 'Sin sucursal'
      if (!map[nombre]) map[nombre] = { name: nombre, value: 0 }
      map[nombre].value += m.ventasBrutas
    })
    return Object.values(map).filter(d => d.value > 0)
  }, [movimientos])

  if (data.length === 0) return (
    <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">Sin datos</div>
  )

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" outerRadius={100} dataKey="value" nameKey="name"
          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v: any) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(v))} />
      </PieChart>
    </ResponsiveContainer>
  )
}

function PnlRow({ label, value, color, bold, separator, indent }: {
  label: string; value: number; color: string; bold?: boolean; separator?: boolean; indent?: boolean
}) {
  const cls = `flex justify-between ${bold ? 'font-semibold' : ''} ${separator ? 'border-t border-gray-300 pt-1.5 mt-0.5' : ''} ${indent ? 'pl-4 text-xs' : ''}`
  return (
    <div className={cls}>
      <span className="text-gray-600">{label}</span>
      <span className={`font-mono ${color}`}>
        {value < 0 ? `-${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Math.abs(value))}` : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value)}
      </span>
    </div>
  )
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  )
}
