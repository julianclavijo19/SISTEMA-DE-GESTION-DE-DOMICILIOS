import { requireRole } from '@/lib/auth'
import { createSupabaseServer } from '@/lib/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Warning } from '@/lib/icons'

export const dynamic = 'force-dynamic'

export default async function NovedadesPage() {
  await requireRole(['ADMIN', 'SECRETARIA'])
  const supabase = await createSupabaseServer()

  const { data: novedades } = await supabase
    .from('novedades')
    .select('id, descripcion, creado_en, domicilios(nombre_cliente, direccion_entrega, estado), usuarios(nombre, rol)')
    .order('creado_en', { ascending: false })
    .limit(100)

  const lista = novedades ?? []

  return (
    <div className="space-y-6">
      <div className="page-header" style={{ marginBottom: 0 }}>
        <h1>Novedades e Incidentes</h1>
        <p>{lista.length} novedades registradas</p>
      </div>

      {lista.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No hay novedades registradas aún.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {lista.map((n: any) => (
            <Card key={n.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Warning className="h-4 w-4 text-yellow-500" />
                    <CardTitle className="text-sm font-medium">
                      Domicilio: {n.domicilios?.nombre_cliente}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{n.domicilios?.estado?.replace('_', ' ')}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(n.creado_en).toLocaleString('es-CO')}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>{n.descripcion}</p>
                <p className="text-muted-foreground">
                  Reportado por: <span className="font-medium">{n.usuarios?.nombre}</span> ({n.usuarios?.rol})
                </p>
                <p className="text-muted-foreground">Dirección: {n.domicilios?.direccion_entrega}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
