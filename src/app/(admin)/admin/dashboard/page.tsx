import { requireRole } from '@/lib/auth'
import { createSupabaseServer } from '@/lib/supabase-server'
import { DashboardCharts } from './dashboard-charts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EstadoBadge } from '@/components/ui/estado-badge'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  await requireRole(['ADMIN'])
  const supabase = await createSupabaseServer()

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const manana = new Date(hoy)
  manana.setDate(manana.getDate() + 1)
  const hoyISO = hoy.toISOString()
  const mananaISO = manana.toISOString()

  // Ayer para comparación
  const ayer = new Date(hoy)
  ayer.setDate(ayer.getDate() - 1)
  const ayerISO = ayer.toISOString()

  // 7 días para gráfica de ingresos
  const hace7Dias = new Date(hoy)
  hace7Dias.setDate(hace7Dias.getDate() - 6)
  const hace7DiasISO = hace7Dias.toISOString()

  const [rActivos, rEntregados, rCancelados, rEnCurso] = await Promise.all([
    supabase.from('domicilios').select('*', { count: 'exact', head: true }).gte('creado_en', hoyISO).lt('creado_en', mananaISO).neq('estado', 'CANCELADO'),
    supabase.from('domicilios').select('*', { count: 'exact', head: true }).gte('creado_en', hoyISO).lt('creado_en', mananaISO).eq('estado', 'ENTREGADO'),
    supabase.from('domicilios').select('*', { count: 'exact', head: true }).gte('creado_en', hoyISO).lt('creado_en', mananaISO).eq('estado', 'CANCELADO'),
    supabase.from('domicilios').select('*', { count: 'exact', head: true }).gte('creado_en', hoyISO).lt('creado_en', mananaISO).in('estado', ['PENDIENTE', 'NOTIFICADO', 'ASIGNADO', 'EN_CAMINO']),
  ])

  // Entregados hoy con valores
  const { data: entregadosHoy } = await supabase
    .from('domicilios').select('valor_pedido, comision_empresa, restaurantes(usuarios(nombre))')
    .gte('creado_en', hoyISO).lt('creado_en', mananaISO).eq('estado', 'ENTREGADO')

  // Entregados ayer para comparar
  const { data: entregadosAyer } = await supabase
    .from('domicilios').select('valor_pedido')
    .gte('creado_en', ayerISO).lt('creado_en', hoyISO).eq('estado', 'ENTREGADO')

  // Domicilios de hoy para gráfica por hora
  const { data: domiciliosHoy } = await supabase
    .from('domicilios')
    .select('creado_en')
    .gte('creado_en', hoyISO)
    .lt('creado_en', mananaISO)

  // Datos gráfica: domicilios por hora (hoy)
  const porHora = Array.from({ length: 24 }, (_, i) => ({
    hora: `${i}h`,
    cantidad: (domiciliosHoy ?? []).filter(d => new Date(d.creado_en).getHours() === i).length,
  }))

  // Domicilios últimos 7 días para gráfica de ingresos
  const { data: domicilios7d } = await supabase
    .from('domicilios')
    .select('creado_en, valor_pedido, estado')
    .eq('estado', 'ENTREGADO')
    .gte('creado_en', hace7DiasISO)
    .lt('creado_en', mananaISO)

  // Datos gráfica: ingresos últimos 7 días
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const ingresos7d: { dia: string; ingresos: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const fecha = new Date(hoy)
    fecha.setDate(fecha.getDate() - i)
    const fechaStr = fecha.toISOString().split('T')[0]
    const diaLabel = diasSemana[fecha.getDay()]

    const delDia = (domicilios7d ?? []).filter(d => {
      const dFecha = new Date(d.creado_en).toISOString().split('T')[0]
      return dFecha === fechaStr
    })

    ingresos7d.push({
      dia: diaLabel,
      ingresos: delDia.reduce((s, d) => s + Number(d.valor_pedido ?? 0), 0),
    })
  }

  const ingresosBrutos = (entregadosHoy ?? []).reduce((s, d) => s + Number(d.valor_pedido ?? 0), 0)
  const comisionesDia = (entregadosHoy ?? []).reduce((s, d) => s + Number(d.comision_empresa ?? 0), 0)
  const ingresosAyer = (entregadosAyer ?? []).reduce((s, d) => s + Number(d.valor_pedido ?? 0), 0)

  const variacion = ingresosAyer > 0 ? Math.round(((ingresosBrutos - ingresosAyer) / ingresosAyer) * 100) : 0
  const comisionPct = ingresosBrutos > 0 ? Math.round((comisionesDia / ingresosBrutos) * 100) : 0

  const totalHoy = (rActivos.count ?? 0) + (rCancelados.count ?? 0)
  const enCurso = rEnCurso.count ?? 0
  const entregados = rEntregados.count ?? 0
  const cancelados = rCancelados.count ?? 0
  const tasaCancelacion = totalHoy > 0 ? Math.round((cancelados / totalHoy) * 100) : 0

  // Comisiones por restaurante (top 5)
  const comisionesPorRestaurante: Record<string, { comision: number; pedidos: number }> = {}
  for (const d of entregadosHoy ?? []) {
    const nombre = (d.restaurantes as any)?.usuarios?.nombre ?? 'Sin nombre'
    if (!comisionesPorRestaurante[nombre]) {
      comisionesPorRestaurante[nombre] = { comision: 0, pedidos: 0 }
    }
    comisionesPorRestaurante[nombre].comision += Number(d.comision_empresa ?? 0)
    comisionesPorRestaurante[nombre].pedidos++
  }
  const topRestaurantes = Object.entries(comisionesPorRestaurante)
    .sort((a, b) => b[1].comision - a[1].comision)
    .slice(0, 5)

  // Últimos domicilios (10 más recientes) — with domiciliario + origin info
  const { data: ultimosDomicilios } = await supabase
    .from('domicilios')
    .select('id, nombre_cliente, direccion_entrega, valor_pedido, estado, creado_en, creado_por_id, restaurantes(usuarios(nombre)), domiciliarios(usuarios(nombre))')
    .order('creado_en', { ascending: false })
    .limit(10)

  const fechaHoy = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div>
      <header className="dash-header">
        <div>
          <h1>Dashboard</h1>
          <p>{fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1)}</p>
        </div>
      </header>

      {/* KPI row — 4 tarjetas principales */}
      <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="kpi-card" style={{ flexDirection: 'column', gap: '0.25rem' }}>
          <span className="kpi-label">Domicilios hoy</span>
          <span className="kpi-value">{totalHoy}</span>
          <span className="kpi-sub">{enCurso} en curso · {entregados} entregados</span>
        </div>
        <div className="kpi-card" style={{ flexDirection: 'column', gap: '0.25rem' }}>
          <span className="kpi-label">Ingresos brutos</span>
          <span className="kpi-value">${ingresosBrutos.toLocaleString('es-CO')}</span>
          <span className="kpi-sub">
            <span className={variacion >= 0 ? 'kpi-trend-up' : 'kpi-trend-down'}>
              {variacion >= 0 ? '+' : ''}{variacion}%
            </span>
            vs ayer
          </span>
        </div>
        <div className="kpi-card" style={{ flexDirection: 'column', gap: '0.25rem' }}>
          <span className="kpi-label">Comisiones</span>
          <span className="kpi-value">${comisionesDia.toLocaleString('es-CO')}</span>
          <span className="kpi-sub">{comisionPct}% sobre ingresos</span>
        </div>
        <div className="kpi-card" style={{ flexDirection: 'column', gap: '0.25rem' }}>
          <span className="kpi-label">Cancelados</span>
          <span className="kpi-value">{cancelados}</span>
          <span className="kpi-sub">{tasaCancelacion}% tasa de cancelación</span>
        </div>
      </div>

      {/* Main content: gráficas + right panels */}
      <div className="dash-content">
        {/* Left: 2 gráficas apiladas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <DashboardCharts porHora={porHora} ingresos7d={ingresos7d} />
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Restaurantes — expandido */}
          <div className="panel-card" style={{ flex: 1, minHeight: '280px' }}>
            <div className="panel-card-title">Restaurantes hoy</div>
            {topRestaurantes.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--ds-text-muted)' }}>Sin actividad</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--ds-border)' }}>
                    <th style={{ textAlign: 'left', padding: '0.375rem 0', fontWeight: 500, color: 'var(--ds-text-muted)', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nombre</th>
                    <th style={{ textAlign: 'right', padding: '0.375rem 0', fontWeight: 500, color: 'var(--ds-text-muted)', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pedidos</th>
                    <th style={{ textAlign: 'right', padding: '0.375rem 0', fontWeight: 500, color: 'var(--ds-text-muted)', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Comisión</th>
                  </tr>
                </thead>
                <tbody>
                  {topRestaurantes.map(([nombre, data]) => (
                    <tr key={nombre} style={{ borderBottom: '1px solid var(--ds-border-light)' }}>
                      <td style={{ padding: '0.5rem 0', color: 'var(--ds-text)' }}>{nombre}</td>
                      <td style={{ padding: '0.5rem 0', textAlign: 'right', color: 'var(--ds-text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}>{data.pedidos}</td>
                      <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: 600, color: 'var(--ds-text)', fontFamily: 'var(--font-ibm-mono)' }}>${data.comision.toLocaleString('es-CO')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Últimos domicilios — full width */}
      <div style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ds-text)', marginBottom: '0.75rem' }}>Últimos domicilios</h2>
        <div className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] uppercase tracking-wider">Cliente</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Restaurante</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Domiciliario</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Dirección</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Valor</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Estado</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Origen</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider">Hace</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(ultimosDomicilios ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8 text-sm">
                    Sin domicilios registrados aún
                  </TableCell>
                </TableRow>
              ) : (
                (ultimosDomicilios ?? []).map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.nombre_cliente}</TableCell>
                    <TableCell>{d.restaurantes?.usuarios?.nombre ?? '—'}</TableCell>
                    <TableCell>{d.domiciliarios?.usuarios?.nombre ?? <span className="text-muted-foreground text-xs">Sin asignar</span>}</TableCell>
                    <TableCell className="truncate max-w-[160px] text-muted-foreground">{d.direccion_entrega}</TableCell>
                    <TableCell className="font-medium" style={{ fontFamily: 'var(--font-ibm-mono)' }}>
                      ${Number(d.valor_pedido ?? 0).toLocaleString('es-CO')}
                    </TableCell>
                    <TableCell><EstadoBadge estado={d.estado} /></TableCell>
                    <TableCell>
                      {d.creado_por_id ? (
                        <span className="inline-flex items-center rounded-full bg-violet-100 text-violet-800 px-2 py-0.5 text-[10px] font-medium">Secretaría</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-medium">Restaurante</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(d.creado_en), { addSuffix: true, locale: es })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
