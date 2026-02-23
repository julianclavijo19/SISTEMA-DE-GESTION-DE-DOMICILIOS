'use client'

import { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Package, CheckCircle, CurrencyDollar, TrendUp, Users, Calendar as CalendarIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { format, startOfMonth, startOfWeek, startOfDay, eachDayOfInterval, isValid } from 'date-fns'
import { es } from 'date-fns/locale'
import type { DateRange } from 'react-day-picker'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type Periodo = 'mes' | 'dia' | 'semana'

interface DomicilioRow {
  id: string
  creado_en: string
  valor_pedido: number
  comision_empresa: number
  estado: string
  nombre_cliente: string
  restaurante_id: string
  domiciliario_id: string | null
  restaurantes: { usuarios: { nombre: string } } | null
  domiciliarios: { usuarios: { nombre: string } } | null
}

export default function ReportesPage() {
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [loading, setLoading] = useState(true)

  // Data
  const [domicilios, setDomicilios] = useState<DomicilioRow[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [entregadosCount, setEntregadosCount] = useState(0)
  const [canceladosCount, setCanceladosCount] = useState(0)
  const [bruto, setBruto] = useState(0)
  const [comisiones, setComisiones] = useState(0)
  const [chartData, setChartData] = useState<{ dia: string; fecha: string; ingresos: number; comisiones: number; domicilios: number }[]>([])
  const [topRestaurantes, setTopRestaurantes] = useState<{ nombre: string; count: number; bruto: number; comision: number }[]>([])
  const [topDomiciliarios, setTopDomiciliarios] = useState<{ nombre: string; count: number; bruto: number }[]>([])

  const supabase = createSupabaseBrowser()

  const getDateRange = useCallback((): { desde: Date; hasta: Date } => {
    if (dateRange?.from && dateRange?.to && isValid(dateRange.from) && isValid(dateRange.to)) {
      const hasta = new Date(dateRange.to)
      hasta.setHours(23, 59, 59, 999)
      return { desde: dateRange.from, hasta }
    }
    const ahora = new Date()
    switch (periodo) {
      case 'dia':
        return { desde: startOfDay(ahora), hasta: ahora }
      case 'semana':
        return { desde: startOfWeek(ahora, { locale: es }), hasta: ahora }
      case 'mes':
      default:
        return { desde: startOfMonth(ahora), hasta: ahora }
    }
  }, [periodo, dateRange])

  const labelPeriodo = dateRange?.from && dateRange?.to && isValid(dateRange.from) && isValid(dateRange.to)
    ? `${format(dateRange.from, 'dd/MM')} – ${format(dateRange.to, 'dd/MM')}`
    : periodo === 'dia' ? 'Hoy'
    : periodo === 'semana' ? 'Esta semana'
    : 'Este mes'

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { desde, hasta } = getDateRange()
    const desdeISO = desde.toISOString()
    const hastaISO = hasta.toISOString()

    // Fetch all domicilios in range
    const { data: allDom, count: countAll } = await supabase
      .from('domicilios')
      .select('id, creado_en, valor_pedido, comision_empresa, estado, nombre_cliente, restaurante_id, domiciliario_id, restaurantes(usuarios(nombre)), domiciliarios(usuarios(nombre))', { count: 'exact' })
      .gte('creado_en', desdeISO)
      .lte('creado_en', hastaISO)
      .order('creado_en', { ascending: false })

    const rows = (allDom ?? []) as unknown as DomicilioRow[]
    setDomicilios(rows)
    setTotalCount(countAll ?? 0)

    const entregados = rows.filter(d => d.estado === 'ENTREGADO')
    const cancelados = rows.filter(d => d.estado === 'CANCELADO')
    setEntregadosCount(entregados.length)
    setCanceladosCount(cancelados.length)

    const totalBruto = entregados.reduce((s, d) => s + Number(d.valor_pedido ?? 0), 0)
    const totalComisiones = entregados.reduce((s, d) => s + Number(d.comision_empresa ?? 0), 0)
    setBruto(totalBruto)
    setComisiones(totalComisiones)

    // Chart data — group by day
    const days = eachDayOfInterval({ start: desde, end: hasta })
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const grouped = days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd')
      const dayLabel = diasSemana[day.getDay()]
      const dayEntregados = entregados.filter(d => d.creado_en.startsWith(dayStr))
      return {
        dia: dayLabel,
        fecha: dayStr,
        ingresos: dayEntregados.reduce((s, d) => s + Number(d.valor_pedido ?? 0), 0),
        comisiones: dayEntregados.reduce((s, d) => s + Number(d.comision_empresa ?? 0), 0),
        domicilios: rows.filter(d => d.creado_en.startsWith(dayStr) && d.estado === 'ENTREGADO').length,
      }
    })
    setChartData(grouped)

    // Top restaurantes
    const restAgg: Record<string, { nombre: string; count: number; bruto: number; comision: number }> = {}
    for (const d of entregados) {
      const rid = d.restaurante_id
      const nombre = (d.restaurantes as any)?.usuarios?.nombre ?? 'Sin nombre'
      if (!restAgg[rid]) restAgg[rid] = { nombre, count: 0, bruto: 0, comision: 0 }
      restAgg[rid].count++
      restAgg[rid].bruto += Number(d.valor_pedido ?? 0)
      restAgg[rid].comision += Number(d.comision_empresa ?? 0)
    }
    setTopRestaurantes(Object.values(restAgg).sort((a, b) => b.count - a.count).slice(0, 5))

    // Top domiciliarios
    const domiAgg: Record<string, { nombre: string; count: number; bruto: number }> = {}
    for (const d of entregados) {
      if (!d.domiciliario_id) continue
      const did = d.domiciliario_id
      const nombre = (d.domiciliarios as any)?.usuarios?.nombre ?? 'Sin nombre'
      if (!domiAgg[did]) domiAgg[did] = { nombre, count: 0, bruto: 0 }
      domiAgg[did].count++
      domiAgg[did].bruto += Number(d.valor_pedido ?? 0)
    }
    setTopDomiciliarios(Object.values(domiAgg).sort((a, b) => b.count - a.count).slice(0, 5))

    setLoading(false)
  }, [getDateRange, supabase])

  useEffect(() => {
    fetchData()
  }, [periodo, dateRange]) // eslint-disable-line react-hooks/exhaustive-deps

  function formatCOP(n: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)
  }

  const tasaExito = totalCount > 0 ? ((entregadosCount / totalCount) * 100).toFixed(1) : '0'

  const exportarPDF = async () => {
    const { jsPDF } = await import('jspdf')
    const { default: html2canvas } = await import('html2canvas')
    const el = document.getElementById('reporte-contenido')
    if (!el) return
    const canvas = await html2canvas(el)
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: 'a4' })
    const imgWidth = pdf.internal.pageSize.getWidth()
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight)
    pdf.save(`reporte-${periodo}-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const exportarExcel = async () => {
    const XLSX = await import('xlsx')
    const datos = domicilios.map(d => ({
      'Fecha': new Date(d.creado_en).toLocaleDateString('es-CO'),
      'Restaurante': (d.restaurantes as any)?.usuarios?.nombre ?? '—',
      'Cliente': d.nombre_cliente,
      'Valor': Number(d.valor_pedido),
      'Comisión': Number(d.comision_empresa),
      'Estado': d.estado,
    }))
    const ws = XLSX.utils.json_to_sheet(datos)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte')
    XLSX.writeFile(wb, `reporte-${periodo}-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 style={{ fontSize: '1.375rem', fontWeight: 600, color: 'var(--ds-text)', letterSpacing: '-0.02em', margin: 0 }}>
            Reportes Financieros
          </h1>
        </div>

        {/* Period tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--ds-border-light)' }}>
          {(['mes', 'dia', 'semana'] as Periodo[]).map((p) => (
            <button
              key={p}
              onClick={() => { setPeriodo(p); setDateRange(undefined) }}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md capitalize transition-colors",
                periodo === p && !dateRange
                  ? "bg-white text-[var(--ds-text)] shadow-sm font-medium"
                  : "text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
              )}
              style={{ border: 'none', cursor: 'pointer' }}
            >
              {p === 'dia' ? 'Día' : p === 'mes' ? 'Mes' : 'Semana'}
            </button>
          ))}
        </div>

        {/* Date range picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarIcon className="w-4 h-4" />
              {dateRange?.from && dateRange?.to
                ? `${format(dateRange.from, 'dd/MM/yy')} – ${format(dateRange.to, 'dd/MM/yy')}`
                : 'Rango de fechas'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              locale={es}
            />
          </PopoverContent>
        </Popover>

        {/* Export buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportarPDF}>
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportarExcel}>
            Excel
          </Button>
        </div>
      </div>

      <div id="reporte-contenido">
        {/* KPI cards */}
        <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="kpi-card">
            <div className="kpi-icon kpi-icon-green"><Package /></div>
            <div className="kpi-body">
              <span className="kpi-label">Total domicilios</span>
              <span className="kpi-value">{loading ? '—' : totalCount}</span>
              <span className="kpi-sub">{labelPeriodo}</span>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon kpi-icon-green"><CheckCircle /></div>
            <div className="kpi-body">
              <span className="kpi-label">Entregados / Cancelados</span>
              <span className="kpi-value">{loading ? '—' : `${entregadosCount} / ${canceladosCount}`}</span>
              <span className="kpi-sub">Tasa de éxito: {tasaExito}% · {labelPeriodo}</span>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon kpi-icon-green"><CurrencyDollar /></div>
            <div className="kpi-body">
              <span className="kpi-label">Ingresos brutos</span>
              <span className="kpi-value">{loading ? '—' : formatCOP(bruto)}</span>
              <span className="kpi-sub">{labelPeriodo}</span>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon kpi-icon-orange"><TrendUp /></div>
            <div className="kpi-body">
              <span className="kpi-label">Comisiones</span>
              <span className="kpi-value">{loading ? '—' : formatCOP(comisiones)}</span>
              <span className="kpi-sub">{labelPeriodo}</span>
            </div>
          </div>
        </div>

        {/* Charts — 2 side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
          {/* Ingresos por día — AreaChart */}
          <div className="panel-card">
            <div className="panel-card-title">Ingresos por día</div>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#111113" stopOpacity={0.06} />
                      <stop offset="95%" stopColor="#111113" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border-light)" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fill: 'var(--ds-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--ds-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toLocaleString('es-CO')}`} />
                  <Tooltip
                    contentStyle={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: 8, fontSize: '0.75rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    formatter={(value: number) => [formatCOP(value), 'Ingresos']}
                  />
                  <Area type="monotone" dataKey="ingresos" stroke="#111113" strokeWidth={1.5} fill="url(#gradIngresos)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comisiones por día — BarChart */}
          <div className="panel-card">
            <div className="panel-card-title">Comisiones por día</div>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={20} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border-light)" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fill: 'var(--ds-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--ds-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toLocaleString('es-CO')}`} />
                  <Tooltip
                    contentStyle={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: 8, fontSize: '0.75rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    formatter={(value: number) => [formatCOP(value), 'Comisiones']}
                  />
                  <Bar dataKey="comisiones" fill="#111113" fillOpacity={0.85} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Top Restaurantes + Top Domiciliarios */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5" /> Top Restaurantes ({labelPeriodo.toLowerCase()})</h2>
            {topRestaurantes.length === 0 ? (
              <Card className="p-8 text-center"><p className="text-muted-foreground">Sin datos</p></Card>
            ) : (
              <div className="space-y-2">
                {topRestaurantes.map((r, i) => (
                  <Card key={r.nombre} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground">{i + 1}</span>
                        <div>
                          <p className="font-medium text-sm">{r.nombre}</p>
                          <p className="text-xs text-muted-foreground">{r.count} domicilios</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">{formatCOP(r.bruto)}</p>
                        <p className="text-xs text-muted-foreground">Comisión: {formatCOP(r.comision)}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5" /> Top Domiciliarios ({labelPeriodo.toLowerCase()})</h2>
            {topDomiciliarios.length === 0 ? (
              <Card className="p-8 text-center"><p className="text-muted-foreground">Sin datos</p></Card>
            ) : (
              <div className="space-y-2">
                {topDomiciliarios.map((d, i) => (
                  <Card key={d.nombre} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground">{i + 1}</span>
                        <div>
                          <p className="font-medium text-sm">{d.nombre}</p>
                          <p className="text-xs text-muted-foreground">{d.count} entregas</p>
                        </div>
                      </div>
                      <p className="font-medium text-sm">{formatCOP(d.bruto)}</p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
