import { requireRole } from '@/lib/auth'
import { createSupabaseServer } from '@/lib/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfiguracionForm } from './configuracion-form'

export default async function ConfiguracionPage() {
  await requireRole(['ADMIN'])
  const supabase = await createSupabaseServer()

  const { data: config } = await supabase
    .from('configuracion_sistema')
    .select('*')
    .eq('id', 'singleton')
    .single()

  return (
    <div className="space-y-6">
      <div className="page-header" style={{ marginBottom: 0 }}>
        <h1>Configuración del sistema</h1>
        <p>Ajusta los parámetros globales del sistema de domicilios.</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Parámetros generales</CardTitle></CardHeader>
        <CardContent>
          <ConfiguracionForm
            porcentajeComision={Number(config?.porcentaje_comision ?? 20)}
            tiempoLimiteAceptacion={config?.tiempo_limite_aceptacion ?? 300}
            motivosCancelacion={config?.motivos_cancelacion ?? []}
          />
        </CardContent>
      </Card>
    </div>
  )
}
