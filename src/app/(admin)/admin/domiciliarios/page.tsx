import { requireRole } from '@/lib/auth'
import { createSupabaseServer } from '@/lib/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, Warning } from '@/lib/icons'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default async function DomiciliariosPage() {
  await requireRole(['ADMIN'])
  const supabase = await createSupabaseServer()

  const { data: domiciliarios } = await supabase
    .from('domiciliarios')
    .select('id, cedula, disponible, soat_vence, licencia_vence, tecno_mec_vence, creado_en, usuarios(nombre, email, estado, telefono)')
    .order('creado_en', { ascending: false })

  const lista = domiciliarios ?? []
  const hoy = new Date()
  const en30Dias = new Date()
  en30Dias.setDate(en30Dias.getDate() + 30)

  const conDocsPorVencer = lista.filter((d: any) => {
    const fechas = [d.soat_vence, d.licencia_vence, d.tecno_mec_vence]
    return fechas.some((f: any) => f && new Date(f) <= en30Dias && new Date(f) >= hoy)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Domiciliarios</h1>
          <p>{lista.length} domiciliarios registrados</p>
        </div>
        <Button asChild>
          <Link href="/admin/domiciliarios/nuevo"><Plus className="h-4 w-4 mr-2" />Nuevo domiciliario</Link>
        </Button>
      </div>

      {conDocsPorVencer.length > 0 && (
        <Alert variant="destructive">
          <Warning className="h-4 w-4" />
          <AlertDescription>{conDocsPorVencer.length} domiciliario(s) con documentos próximos a vencer en los próximos 30 días.</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((d: any) => {
          const vencidos = [
            d.soat_vence && new Date(d.soat_vence) < hoy ? 'SOAT' : null,
            d.licencia_vence && new Date(d.licencia_vence) < hoy ? 'Licencia' : null,
            d.tecno_mec_vence && new Date(d.tecno_mec_vence) < hoy ? 'T. Mecánica' : null,
          ].filter(Boolean)

          return (
            <Link key={d.id} href={`/admin/domiciliarios/${d.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">{d.usuarios?.nombre}</CardTitle>
                  <Badge variant={d.disponible ? 'default' : 'secondary'}>{d.disponible ? 'Disponible' : 'No disponible'}</Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">CC: {d.cedula}</p>
                  <p className="text-sm text-muted-foreground">{d.usuarios?.telefono ?? 'Sin teléfono'}</p>
                  <Badge variant={d.usuarios?.estado === 'ACTIVO' ? 'default' : 'destructive'}>{d.usuarios?.estado}</Badge>
                  {vencidos.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {vencidos.map((v) => (<Badge key={v} variant="destructive" className="text-xs">{v} vencido</Badge>))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
