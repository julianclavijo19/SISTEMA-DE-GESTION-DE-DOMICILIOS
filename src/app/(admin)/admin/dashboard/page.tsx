import { requireRole } from '@/lib/auth'
import { createSupabaseServer } from '@/lib/supabase-server'

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

  // Semana pasada para comparación
  const inicioSemana = new Date(hoy)
  inicioSemana.setDate(inicioSemana.getDate() - 7)
  const inicioSemanaISO = inicioSemana.toISOString()

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

  // Domicilios de la semana para promedio
  const { count: domiciliosSemana } = await supabase
    .from('domicilios').select('*', { count: 'exact', head: true })
    .gte('creado_en', inicioSemanaISO).lt('creado_en', mananaISO)
    .eq('estado', 'ENTREGADO')

  const ingresosBrutos = (entregadosHoy ?? []).reduce((s, d) => s + Number(d.valor_pedido ?? 0), 0)
  const comisionesDia = (entregadosHoy ?? []).reduce((s, d) => s + Number(d.comision_empresa ?? 0), 0)
  const ingresosAyer = (entregadosAyer ?? []).reduce((s, d) => s + Number(d.valor_pedido ?? 0), 0)

  const variacion = ingresosAyer > 0 ? Math.round(((ingresosBrutos - ingresosAyer) / ingresosAyer) * 100) : 0
  const comisionPct = ingresosBrutos > 0 ? Math.round((comisionesDia / ingresosBrutos) * 100) : 0
  const ticketPromedio = (entregadosHoy?.length ?? 0) > 0 ? Math.round(ingresosBrutos / entregadosHoy!.length) : 0
  const promedioSemanal = Math.round((domiciliosSemana ?? 0) / 7)

  const totalHoy = (rActivos.count ?? 0) + (rCancelados.count ?? 0)
  const enCurso = rEnCurso.count ?? 0
  const entregados = rEntregados.count ?? 0
  const cancelados = rCancelados.count ?? 0
  const tasaCancelacion = totalHoy > 0 ? Math.round((cancelados / totalHoy) * 100) : 0
  const tasaEntrega = totalHoy > 0 ? Math.round((entregados / totalHoy) * 100) : 0

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

      {/* KPI row — numbers only, no icons, no colors */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
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

      {/* Secondary metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--ds-text-muted)', display: 'block' }}>Ticket promedio</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--ds-text)', fontFamily: 'var(--font-ibm-mono)' }}>${ticketPromedio.toLocaleString('es-CO')}</span>
        </div>
        <div style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--ds-text-muted)', display: 'block' }}>Tasa de entrega</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--ds-text)', fontFamily: 'var(--font-ibm-mono)' }}>{tasaEntrega}%</span>
        </div>
        <div style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--ds-text-muted)', display: 'block' }}>Prom. diario (7d)</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--ds-text)', fontFamily: 'var(--font-ibm-mono)' }}>{promedioSemanal}</span>
        </div>
        <div style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '8px', padding: '1rem 1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--ds-text-muted)', display: 'block' }}>Domiciliarios</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--ds-text)', fontFamily: 'var(--font-ibm-mono)' }}>{disponibles} libres · {enEntrega} ocupados</span>
        </div>
      </div>

      {/* Main content */}
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
          {/* Restaurantes — tabla simple */}
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

          {/* Domiciliarios — tabla simple */}
          <div className="panel-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span className="panel-card-title" style={{ marginBottom: 0 }}>Domiciliarios</span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--ds-text-muted)' }}>{disponibles} disponibles</span>
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
        </div>
      </div>
    </div>
  )
}
