import { requireRole } from '@/lib/auth'
import { createSupabaseServer } from '@/lib/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CurrencyDollar, TrendUp, Package, CheckCircle, Users } from '@/lib/icons'

export default async function ReportesPage() {
  await requireRole(['ADMIN'])
  const supabase = await createSupabaseServer()

  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const inicioSemana = new Date(hoy)
  inicioSemana.setDate(hoy.getDate() - hoy.getDay())
  inicioSemana.setHours(0, 0, 0, 0)

  const mesISO = inicioMes.toISOString()
  const semanaISO = inicioSemana.toISOString()

  // KPIs del mes
  const [rTotalMes, rEntregadosMes, rCanceladosMes, rIngresosMes] = await Promise.all([
    supabase.from('domicilios').select('*', { count: 'exact', head: true }).gte('creado_en', mesISO),
    supabase.from('domicilios').select('*', { count: 'exact', head: true }).gte('creado_en', mesISO).eq('estado', 'ENTREGADO'),
    supabase.from('domicilios').select('*', { count: 'exact', head: true }).gte('creado_en', mesISO).eq('estado', 'CANCELADO'),
    supabase.from('domicilios').select('valor_pedido, comision_empresa').gte('creado_en', mesISO).eq('estado', 'ENTREGADO'),
  ])

  const totalMes = rTotalMes.count ?? 0
  const entregadosMes = rEntregadosMes.count ?? 0
  const canceladosMes = rCanceladosMes.count ?? 0

  // KPIs de la semana
  const [rTotalSemana, rEntregadosSemana, rIngresosSemana] = await Promise.all([
    supabase.from('domicilios').select('*', { count: 'exact', head: true }).gte('creado_en', semanaISO),
    supabase.from('domicilios').select('*', { count: 'exact', head: true }).gte('creado_en', semanaISO).eq('estado', 'ENTREGADO'),
    supabase.from('domicilios').select('valor_pedido, comision_empresa').gte('creado_en', semanaISO).eq('estado', 'ENTREGADO'),
  ])

  const totalSemana = rTotalSemana.count ?? 0
  const entregadosSemana = rEntregadosSemana.count ?? 0

  // Top restaurantes del mes
  const { data: topRestDomicilios } = await supabase
    .from('domicilios')
    .select('restaurante_id, valor_pedido, comision_empresa, restaurantes(usuarios(nombre))')
    .gte('creado_en', mesISO)
    .eq('estado', 'ENTREGADO')

  const restAgg: Record<string, { nombre: string; count: number; bruto: number; comision: number }> = {}
  for (const d of topRestDomicilios ?? []) {
    const rid = d.restaurante_id
    if (!restAgg[rid]) restAgg[rid] = { nombre: (d as any).restaurantes?.usuarios?.nombre ?? 'Sin nombre', count: 0, bruto: 0, comision: 0 }
    restAgg[rid].count++
    restAgg[rid].bruto += Number(d.valor_pedido ?? 0)
    restAgg[rid].comision += Number(d.comision_empresa ?? 0)
  }
  const topRestaurantes = Object.entries(restAgg).sort((a, b) => b[1].count - a[1].count).slice(0, 5)

  // Top domiciliarios del mes
  const { data: topDomiDomicilios } = await supabase
    .from('domicilios')
    .select('domiciliario_id, valor_pedido, domiciliarios(usuarios(nombre))')
    .gte('creado_en', mesISO)
    .eq('estado', 'ENTREGADO')
    .not('domiciliario_id', 'is', null)

  const domiAgg: Record<string, { nombre: string; count: number; bruto: number }> = {}
  for (const d of topDomiDomicilios ?? []) {
    const did = d.domiciliario_id!
    if (!domiAgg[did]) domiAgg[did] = { nombre: (d as any).domiciliarios?.usuarios?.nombre ?? 'Sin nombre', count: 0, bruto: 0 }
    domiAgg[did].count++
    domiAgg[did].bruto += Number(d.valor_pedido ?? 0)
  }
  const topDomiciliarios = Object.entries(domiAgg).sort((a, b) => b[1].count - a[1].count).slice(0, 5)

  const ingresosMesData = rIngresosMes.data ?? []
  const brutoMes = ingresosMesData.reduce((s, d) => s + Number(d.valor_pedido ?? 0), 0)
  const comisionesMes = ingresosMesData.reduce((s, d) => s + Number(d.comision_empresa ?? 0), 0)
  const ingresosSemanaData = rIngresosSemana.data ?? []
  const brutoSemana = ingresosSemanaData.reduce((s, d) => s + Number(d.valor_pedido ?? 0), 0)
  const comisionesSemana = ingresosSemanaData.reduce((s, d) => s + Number(d.comision_empresa ?? 0), 0)
  const tasaExitoMes = totalMes > 0 ? ((entregadosMes / totalMes) * 100).toFixed(1) : '0'

  function formatCOP(n: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1>Reportes Financieros</h1>
        <p>{hoy.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}</p>
      </div>

      <h2 className="text-lg font-semibold">Resumen del Mes</h2>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-blue"><Package /></div>
          <div className="kpi-body">
            <span className="kpi-label">Total domicilios</span>
            <span className="kpi-value">{totalMes}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-green"><CheckCircle /></div>
          <div className="kpi-body">
            <span className="kpi-label">Entregados / Cancelados</span>
            <span className="kpi-value">{entregadosMes} / {canceladosMes}</span>
            <span className="kpi-sub">Tasa de éxito: {tasaExitoMes}%</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-green"><CurrencyDollar /></div>
          <div className="kpi-body">
            <span className="kpi-label">Ingresos brutos</span>
            <span className="kpi-value">{formatCOP(brutoMes)}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-orange"><TrendUp /></div>
          <div className="kpi-body">
            <span className="kpi-label">Comisiones del mes</span>
            <span className="kpi-value">{formatCOP(comisionesMes)}</span>
          </div>
        </div>
      </div>

      <Separator />

      <h2 className="text-lg font-semibold">Resumen de la Semana</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Domicilios</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold">{totalSemana} total / {entregadosSemana} entregados</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Ingresos brutos</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold">{formatCOP(brutoSemana)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Comisiones</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold">{formatCOP(comisionesSemana)}</p></CardContent></Card>
      </div>

      <Separator />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5" /> Top Restaurantes (mes)</h2>
          {topRestaurantes.length === 0 ? (
            <Card className="p-8 text-center"><p className="text-muted-foreground">Sin datos</p></Card>
          ) : (
            <div className="space-y-2">
              {topRestaurantes.map(([id, r], i) => (
                <Card key={id} className="p-3">
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
          <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5" /> Top Domiciliarios (mes)</h2>
          {topDomiciliarios.length === 0 ? (
            <Card className="p-8 text-center"><p className="text-muted-foreground">Sin datos</p></Card>
          ) : (
            <div className="space-y-2">
              {topDomiciliarios.map(([id, d], i) => (
                <Card key={id} className="p-3">
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
  )
}
