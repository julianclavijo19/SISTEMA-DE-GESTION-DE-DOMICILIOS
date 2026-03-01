import { requireRole } from '@/lib/auth'
import { createSupabaseServer } from '@/lib/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Scissors, CurrencyDollar, TrendUp, Package } from '@/lib/icons'
import { CorteCajaForm } from './corte-form'

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

export default async function CortesPage() {
  const session = await requireRole(['ADMIN'])
  const supabase = await createSupabaseServer()

  const { data: cortes } = await supabase
    .from('cortes_caja')
    .select('*, usuarios(nombre)')
    .order('creado_en', { ascending: false })
    .limit(50)

  const lista = cortes ?? []

  // Totales acumulados
  const totalHistoricoComisiones = lista.reduce((s, c: any) => s + Number(c.total_comisiones ?? 0), 0)
  const totalHistoricoBruto = lista.reduce((s, c: any) => s + Number(c.total_bruto ?? 0), 0)
  const totalHistoricoDomicilios = lista.reduce((s, c: any) => s + Number(c.total_domicilios ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="page-header" style={{ marginBottom: 0 }}>
        <h1>Cortes de Caja</h1>
        <p>Cierres financieros por período</p>
      </div>

      {/* Acumulados */}
      {lista.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-xl font-bold">{totalHistoricoDomicilios}</p>
              <p className="text-xs text-muted-foreground">Total entregas (todos los cortes)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-xl font-bold text-blue-600">{formatCOP(totalHistoricoBruto)}</p>
              <p className="text-xs text-muted-foreground">Total bruto acumulado</p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-xl font-bold text-green-700">{formatCOP(totalHistoricoComisiones)}</p>
              <p className="text-xs text-muted-foreground">Comisiones acumuladas</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Scissors className="h-4 w-4" /> Generar nuevo corte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CorteCajaForm usuarioId={session.id} />
        </CardContent>
      </Card>

      <Separator />

      <h2 className="text-lg font-semibold">Historial de cortes ({lista.length})</h2>

      {lista.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No hay cortes de caja registrados.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {lista.map((c: any) => (
            <Card key={c.id} className="hover:shadow-sm transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    {new Date(c.fecha_inicio).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                    {' — '}
                    {new Date(c.fecha_fin).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px]">
                    {new Date(c.creado_en).toLocaleDateString('es-CO')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-y-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Entregas:</span>
                    <span className="font-semibold">{c.total_domicilios}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CurrencyDollar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Bruto:</span>
                    <span className="font-semibold">{formatCOP(Number(c.total_bruto))}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendUp className="h-3 w-3 text-green-600" />
                    <span className="text-muted-foreground">Comisión:</span>
                    <span className="font-semibold text-green-700">{formatCOP(Number(c.total_comisiones))}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CurrencyDollar className="h-3 w-3 text-orange-500" />
                    <span className="text-muted-foreground">A domiciliarios:</span>
                    <span className="font-semibold">{formatCOP(Number(c.total_pago_domiciliarios))}</span>
                  </div>
                </div>
                <Separator />
                <p className="text-xs text-muted-foreground">Creado por: {c.usuarios?.nombre}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
