import { requireRole } from '@/lib/auth'
import { createSupabaseServer } from '@/lib/supabase-server'
import { DashboardCharts } from './dashboard-charts'

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

  // 7 días para gráficas
  const hace7Dias = new Date(hoy)
  hace7Dias.setDate(hace7Dias.getDate() - 6)
  const hace7DiasISO = hace7Dias.toISOString()

  const [rActivos, rEntregados, rCancelados, rEnCurso, rDomActivos] = await Promise.all([
    supabase.from('domicilios').select('*', { count: 'exact', head: true }).gte('creado_en', hoyISO).lt('creado_en', mananaISO).neq('estado', 'CANCELADO'),
    supabase.from('domicilios').select('*', { count: 'exact', head: true }).gte('creado_en', hoyISO).lt('creado_en', mananaISO).eq('estado', 'ENTREGADO'),
    supabase.from('domicilios').select('*', { count: 'exact', head: true }).gte('creado_en', hoyISO).lt('creado_en', mananaISO).eq('estado', 'CANCELADO'),
    supabase.from('domicilios').select('*', { count: 'exact', head: true }).gte('creado_en', hoyISO).lt('creado_en', mananaISO).in('estado', ['PENDIENTE', 'NOTIFICADO', 'ASIGNADO', 'EN_CAMINO']),
    supabase.from('domiciliarios').select('id, disponible, usuarios!inner(nombre, estado)').eq('usuarios.estado', 'ACTIVO'),
  ])

  // Entregados hoy con valores
  const { data: entregadosHoy } = await supabase
    .from('domicilios').select('valor_pedido, comision_empresa, restaurantes(usuarios(nombre))')
    .gte('creado_en', hoyISO).lt('creado_en', mananaISO).eq('estado', 'ENTREGADO')

  // Entregados ayer para comparar
  const { data: entregadosAyer } = await supabase
    .from('domicilios').select('valor_pedido')
    .gte('creado_en', ayerISO).lt('creado_en', hoyISO).eq('estado', 'ENTREGADO')

  // Domicilios últimos 7 días para gráficas
  const { data: domicilios7d } = await supabase
    .from('domicilios')
    .select('creado_en, valor_pedido, comision_empresa, estado')
    .gte('creado_en', hace7DiasISO)
    .lt('creado_en', mananaISO)

  // Preparar datos de gráficas (7 días)
  const chartData: { dia: string; domicilios: number; ingresos: number; comisiones: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const fecha = new Date(hoy)
    fecha.setDate(fecha.getDate() - i)
    const fechaStr = fecha.toISOString().split('T')[0]
    const diaLabel = fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })

    const delDia = (domicilios7d ?? []).filter(d => {
      const dFecha = new Date(d.creado_en).toISOString().split('T')[0]
      return dFecha === fechaStr
    })

    chartData.push({
      dia: diaLabel,
      domicilios: delDia.length,
      ingresos: delDia.filter(d => d.estado === 'ENTREGADO').reduce((s, d) => s + Number(d.valor_pedido ?? 0), 0),
      comisiones: delDia.filter(d => d.estado === 'ENTREGADO').reduce((s, d) => s + Number(d.comision_empresa ?? 0), 0),
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

  // Domicilios recientes
  const { data: domicilios } = await supabase
    .from('domicilios')
    .select('id, nombre_cliente, direccion_entrega, valor_pedido, estado, creado_en, restaurantes(usuarios(nombre)), domiciliarios(usuarios(nombre))')
    .order('creado_en', { ascending: false }).limit(10)

  // Domiciliarios con entregas del día
  const { data: domiciliariosConEntregas } = await supabase
    .from('domicilios')
    .select('domiciliario_id, domiciliarios(id, disponible, usuarios(nombre, estado))')
    .gte('creado_en', hoyISO).lt('creado_en', mananaISO)
    .eq('estado', 'ENTREGADO')
    .not('domiciliario_id', 'is', null)

  const entregasPorDom: Record<string, { nombre: string; entregas: number; disponible: boolean }> = {}
  for (const d of domiciliariosConEntregas ?? []) {
    const dom = d.domiciliarios as any
    if (!dom?.usuarios) continue
    const id = dom.id
    if (!entregasPorDom[id]) {
      entregasPorDom[id] = {
        nombre: dom.usuarios.nombre ?? 'Sin nombre',
        entregas: 0,
        disponible: dom.disponible ?? false,
      }
    }
    entregasPorDom[id].entregas++
  }

  const domiciliariosActivos = rDomActivos.data ?? []
  for (const da of domiciliariosActivos) {
    const dom = da as any
    if (!entregasPorDom[dom.id]) {
      entregasPorDom[dom.id] = {
        nombre: dom.usuarios?.nombre ?? 'Sin nombre',
        entregas: 0,
        disponible: dom.disponible ?? false,
      }
    }
  }

  const listaDomiciliarios = Object.values(entregasPorDom)
    .sort((a, b) => b.entregas - a.entregas)

  const disponibles = listaDomiciliarios.filter(d => d.disponible).length
  const enEntrega = listaDomiciliarios.filter(d => !d.disponible).length

  function getEstadoLabel(estado: string) {
    const labels: Record<string, string> = {
      PENDIENTE: 'Pendiente',
      NOTIFICADO: 'Notificado',
      ASIGNADO: 'Asignado',
      EN_CAMINO: 'En camino',
      ENTREGADO: 'Entregado',
      CANCELADO: 'Cancelado',
    }
    return labels[estado] ?? estado
  }

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

      {/* KPI row — responsive via .kpi-grid CSS class */}
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

      {/* Main content: table + right panels */}
      <div className="dash-content">
        {/* Left: Domicilios recientes table */}
        <div className="ds-table-card">
          <div className="ds-table-header">
            <span className="ds-table-title">Últimos domicilios</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--ds-text-muted)' }}>{totalHoy} hoy</span>
          </div>
          {(!domicilios || domicilios.length === 0) ? (
            <div className="empty-state">No hay domicilios registrados hoy.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Restaurante</th>
                    <th>Domiciliario</th>
                    <th>Valor</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {domicilios.map((d: any) => (
                    <tr key={d.id}>
                      <td>
                        <span style={{ fontWeight: 500, color: 'var(--ds-text)', fontSize: '0.8125rem' }}>
                          {d.nombre_cliente}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: 'var(--ds-text-secondary)', fontSize: '0.8125rem' }}>
                          {(d.restaurantes as any)?.usuarios?.nombre ?? '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: 'var(--ds-text-secondary)', fontSize: '0.8125rem' }}>
                          {(d.domiciliarios as any)?.usuarios?.nombre ?? '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--ds-text)', fontSize: '0.8125rem', fontFamily: 'var(--font-ibm-mono)' }}>
                          ${Number(d.valor_pedido).toLocaleString('es-CO')}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge status-${d.estado.toLowerCase()}`}>
                          <span className="status-dot" />
                          {getEstadoLabel(d.estado)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Domiciliarios — primero */}
          <div className="panel-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span className="panel-card-title" style={{ marginBottom: 0 }}>Domiciliarios</span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--ds-text-muted)' }}>{disponibles} disponibles</span>
            </div>

            {/* Mini cards Libres / Ocupados */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ background: '#ECFDF5', borderRadius: '8px', padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669', display: 'block' }}>{disponibles}</span>
                <span style={{ fontSize: '0.6875rem', color: '#059669' }}>Libres</span>
              </div>
              <div style={{ background: '#FFFBEB', borderRadius: '8px', padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#D97706', display: 'block' }}>{enEntrega}</span>
                <span style={{ fontSize: '0.6875rem', color: '#D97706' }}>Ocupados</span>
              </div>
            </div>

            {listaDomiciliarios.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--ds-text-muted)' }}>Sin domiciliarios activos</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--ds-border)' }}>
                    <th style={{ textAlign: 'left', padding: '0.375rem 0', fontWeight: 500, color: 'var(--ds-text-muted)', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nombre</th>
                    <th style={{ textAlign: 'center', padding: '0.375rem 0', fontWeight: 500, color: 'var(--ds-text-muted)', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado</th>
                    <th style={{ textAlign: 'right', padding: '0.375rem 0', fontWeight: 500, color: 'var(--ds-text-muted)', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entregas</th>
                  </tr>
                </thead>
                <tbody>
                  {listaDomiciliarios.slice(0, 8).map((dom) => (
                    <tr key={dom.nombre} style={{ borderBottom: '1px solid var(--ds-border-light)' }}>
                      <td style={{ padding: '0.5rem 0', color: 'var(--ds-text)' }}>{dom.nombre.split(' ').slice(0, 2).join(' ')}</td>
                      <td style={{ padding: '0.5rem 0', textAlign: 'center', fontSize: '0.75rem', color: dom.disponible ? 'var(--ds-success)' : 'var(--ds-text-muted)' }}>
                        {dom.disponible ? 'Libre' : 'Ocupado'}
                      </td>
                      <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-ibm-mono)' }}>{dom.entregas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Restaurantes — después */}
          <div className="panel-card">
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

      {/* Gráficas — debajo del contenido principal */}
      <div style={{ marginTop: '1.5rem' }}>
        <DashboardCharts data={chartData} />
      </div>
    </div>
  )
}
