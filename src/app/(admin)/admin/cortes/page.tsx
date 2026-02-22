import { requireRole } from '@/lib/auth'
import { createSupabaseServer } from '@/lib/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export const dynamic = 'force-dynamic'
import { Scissors, CurrencyDollar, TrendUp, Package } from '@/lib/icons'
import { CorteCajaForm } from './corte-form'

export default async function CortesPage() {
  const session = await requireRole(['ADMIN'])
  const supabase = await createSupabaseServer()

  const { data: cortes } = await supabase
    .from('cortes_caja')
    .select('*, usuarios(nombre)')
    .order('creado_en', { ascending: false })
    .limit(50)

  const lista = cortes ?? []

  return (
    <div className="space-y-6">
      <div className="page-header" style={{ marginBottom: 0 }}>
        <h1>Cortes de Caja</h1>
        <p>Cierres financieros por período</p>
      </div>

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

      <h2 className="text-lg font-semibold">Historial de cortes</h2>

      {lista.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No hay cortes de caja registrados.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {lista.map((c: any) => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    {new Date(c.fecha_inicio).toLocaleDateString('es-CO')} — {new Date(c.fecha_fin).toLocaleDateString('es-CO')}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">{new Date(c.creado_en).toLocaleString('es-CO')}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Domicilios:</span>
                    <span className="font-medium">{c.total_domicilios}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CurrencyDollar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Bruto:</span>
                    <span className="font-medium">${Number(c.total_bruto).toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendUp className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Comisiones:</span>
                    <span className="font-medium">${Number(c.total_comisiones).toLocaleString('es-CO')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CurrencyDollar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Neto:</span>
                    <Badge variant={Number(c.saldo_neto) >= 0 ? 'default' : 'destructive'}>
                      ${Number(c.saldo_neto).toLocaleString('es-CO')}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Creado por: {c.usuarios?.nombre}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
