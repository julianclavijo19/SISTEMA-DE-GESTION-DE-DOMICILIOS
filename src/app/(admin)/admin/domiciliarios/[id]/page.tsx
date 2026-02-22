import { requireRole } from '@/lib/auth'
import { createSupabaseServer } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Warning, CheckCircle } from '@/lib/icons'
import { DocumentUpload } from './document-upload'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DomiciliarioDetallePage({ params }: PageProps) {
  await requireRole(['ADMIN'])
  const { id } = await params
  const supabase = await createSupabaseServer()

  const { data: domiciliario } = await supabase
    .from('domiciliarios')
    .select('*, usuarios(*)')
    .eq('id', id)
    .single()

  if (!domiciliario) notFound()

  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)

  const { count: entregasMes } = await supabase
    .from('domicilios')
    .select('*', { count: 'exact', head: true })
    .eq('domiciliario_id', id)
    .eq('estado', 'ENTREGADO')
    .gte('creado_en', inicioMes.toISOString())

  function estadoDoc(fecha: string | null): { texto: string; variante: 'default' | 'destructive' | 'secondary' } {
    if (!fecha) return { texto: 'Sin registrar', variante: 'secondary' }
    if (new Date(fecha) < hoy) return { texto: 'Vencido', variante: 'destructive' }
    const en30 = new Date(); en30.setDate(en30.getDate() + 30)
    if (new Date(fecha) <= en30) return { texto: 'Por vencer', variante: 'destructive' }
    return { texto: 'Vigente', variante: 'default' }
  }

  const documentos = [
    { nombre: 'SOAT', vence: domiciliario.soat_vence, url: domiciliario.doc_soat },
    { nombre: 'Licencia', vence: domiciliario.licencia_vence, url: domiciliario.doc_licencia },
    { nombre: 'Tecno-mecánica', vence: domiciliario.tecno_mec_vence, url: domiciliario.doc_tecno_mec },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/domiciliarios"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{domiciliario.usuarios?.nombre}</h1>
          <p className="text-muted-foreground">CC: {domiciliario.cedula}</p>
        </div>
        <Badge variant={domiciliario.disponible ? 'default' : 'secondary'} className="ml-auto">
          {domiciliario.disponible ? 'Disponible' : 'No disponible'}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Información personal</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{domiciliario.usuarios?.email}</span></div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">Teléfono</span><span>{domiciliario.usuarios?.telefono ?? 'No registrado'}</span></div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">Estado</span>
              <Badge variant={domiciliario.usuarios?.estado === 'ACTIVO' ? 'default' : 'destructive'}>{domiciliario.usuarios?.estado}</Badge>
            </div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">Entregas este mes</span><span className="font-medium">{entregasMes ?? 0}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Documentos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {documentos.map((doc) => {
              const estado = estadoDoc(doc.vence)
              return (
                <div key={doc.nombre} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {estado.variante === 'destructive' ? <Warning className="h-4 w-4 text-destructive" /> : <CheckCircle className="h-4 w-4 text-green-600" />}
                    <span className="text-sm">{doc.nombre}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={estado.variante} className="text-xs">{estado.texto}</Badge>
                    {doc.url ? <Badge variant="outline" className="text-xs">Cargado</Badge> : <Badge variant="secondary" className="text-xs">Pendiente</Badge>}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <DocumentUpload
        domiciliarioId={domiciliario.id}
        documentos={[
          { campo: 'doc_cedula_frente', label: 'Cédula (frente)', url: domiciliario.doc_cedula_frente },
          { campo: 'doc_cedula_reverso', label: 'Cédula (reverso)', url: domiciliario.doc_cedula_reverso },
          { campo: 'doc_soat', label: 'SOAT', url: domiciliario.doc_soat, campoFecha: 'soat_vence', fecha: domiciliario.soat_vence ?? null },
          { campo: 'doc_licencia', label: 'Licencia de conducción', url: domiciliario.doc_licencia, campoFecha: 'licencia_vence', fecha: domiciliario.licencia_vence ?? null },
          { campo: 'doc_tecno_mec', label: 'Tecnomecánica', url: domiciliario.doc_tecno_mec, campoFecha: 'tecno_mec_vence', fecha: domiciliario.tecno_mec_vence ?? null },
          { campo: 'doc_tarjeta_prop', label: 'Tarjeta de propiedad', url: domiciliario.doc_tarjeta_prop },
          { campo: 'foto_perfil', label: 'Foto de perfil', url: domiciliario.foto_perfil },
          { campo: 'foto_moto', label: 'Foto de la moto', url: domiciliario.foto_moto },
        ]}
      />
    </div>
  )
}
