'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'

interface PorHoraItem {
  hora: string
  cantidad: number
}

interface Ingresos7dItem {
  dia: string
  ingresos: number
}

export function DashboardCharts({
  porHora,
  ingresos7d,
}: {
  porHora: PorHoraItem[]
  ingresos7d: Ingresos7dItem[]
}) {
  const formatCurrency = (value: number) => `$${value.toLocaleString('es-CO')}`

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
      {/* Gráfica 1 — Domicilios por hora (hoy) — AreaChart */}
      <div className="panel-card">
        <div className="panel-card-title">Domicilios por hora (hoy)</div>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={porHora} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border-light)" vertical={false} />
              <XAxis
                dataKey="hora"
                tick={{ fontSize: 11, fill: 'var(--ds-text-muted)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--ds-text-muted)' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--ds-surface)',
                  border: '1px solid var(--ds-border)',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
              />
              <defs>
                <linearGradient id="gradDomicilios" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#111113" stopOpacity={0.06} />
                  <stop offset="95%" stopColor="#111113" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="cantidad"
                stroke="#111113"
                strokeWidth={1.5}
                fill="url(#gradDomicilios)"
                name="Domicilios"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfica 2 — Ingresos últimos 7 días — BarChart */}
      <div className="panel-card">
        <div className="panel-card-title">Ingresos últimos 7 días</div>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ingresos7d} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border-light)" vertical={false} />
              <XAxis
                dataKey="dia"
                tick={{ fontSize: 11, fill: 'var(--ds-text-muted)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--ds-text-muted)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatCurrency}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Ingresos']}
                contentStyle={{
                  background: 'var(--ds-surface)',
                  border: '1px solid var(--ds-border)',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
              />
              <Bar
                dataKey="ingresos"
                fill="#111113"
                fillOpacity={0.85}
                radius={[4, 4, 0, 0]}
                name="Ingresos"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
