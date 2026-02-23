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

interface ChartDataItem {
  dia: string
  domicilios: number
  ingresos: number
  comisiones: number
}

export function DashboardCharts({ data }: { data: ChartDataItem[] }) {
  const formatCurrency = (value: number) => `$${value.toLocaleString('es-CO')}`

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
      {/* Domicilios por día */}
      <div className="panel-card">
        <div className="panel-card-title">Domicilios por día</div>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border-light)" />
              <XAxis
                dataKey="dia"
                tick={{ fontSize: 11, fill: 'var(--ds-text-muted)' }}
                axisLine={{ stroke: 'var(--ds-border)' }}
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
              <Bar dataKey="domicilios" fill="#059669" radius={[4, 4, 0, 0]} name="Domicilios" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ingresos por día */}
      <div className="panel-card">
        <div className="panel-card-title">Ingresos por día</div>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ds-border-light)" />
              <XAxis
                dataKey="dia"
                tick={{ fontSize: 11, fill: 'var(--ds-text-muted)' }}
                axisLine={{ stroke: 'var(--ds-border)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--ds-text-muted)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatCurrency}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value)]}
                contentStyle={{
                  background: 'var(--ds-surface)',
                  border: '1px solid var(--ds-border)',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
              />
              <defs>
                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorComisiones" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D97706" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="ingresos" stroke="#059669" strokeWidth={2} fill="url(#colorIngresos)" name="Ingresos" />
              <Area type="monotone" dataKey="comisiones" stroke="#D97706" strokeWidth={2} fill="url(#colorComisiones)" name="Comisiones" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
