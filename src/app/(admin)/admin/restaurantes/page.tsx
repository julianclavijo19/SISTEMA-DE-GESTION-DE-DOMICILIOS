import { requireRole } from '@/lib/auth'
import { createSupabaseServer } from '@/lib/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { Plus, Storefront } from '@/lib/icons'

export default async function RestaurantesPage() {
  await requireRole(['ADMIN'])
  const supabase = await createSupabaseServer()

  const { data: restaurantes } = await supabase
    .from('restaurantes')
    .select('id, nit, direccion, horario, creado_en, usuarios(nombre, email, estado)')
    .order('creado_en', { ascending: false })

  const lista = restaurantes ?? []

  // Count domicilios per restaurant
  const ids = lista.map((r) => r.id)
  const counts: Record<string, number> = {}
  if (ids.length > 0) {
    for (const id of ids) {
      const { count } = await supabase.from('domicilios').select('*', { count: 'exact', head: true }).eq('restaurante_id', id)
      counts[id] = count ?? 0
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Restaurantes</h1>
          <p>{lista.length} restaurantes aliados</p>
        </div>
        <Button asChild>
          <Link href="/admin/restaurantes/nuevo"><Plus className="h-4 w-4 mr-2" />Nuevo restaurante</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((r: any) => (
          <Card key={r.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <Storefront className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">{r.usuarios?.nombre}</CardTitle>
              </div>
              <Badge variant={r.usuarios?.estado === 'ACTIVO' ? 'default' : 'destructive'}>{r.usuarios?.estado}</Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {r.nit && <p className="text-muted-foreground">NIT: {r.nit}</p>}
              {r.direccion && <p className="text-muted-foreground">{r.direccion}</p>}
              {r.horario && <p className="text-muted-foreground">Horario: {r.horario}</p>}
              <p className="text-muted-foreground">{counts[r.id] ?? 0} domicilios solicitados</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
