'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'
import { createSupabaseServer } from '@/lib/supabase-server'

const configuracionSchema = z.object({
  porcentajeComision: z.number().min(0).max(100),
  tiempoLimiteAceptacion: z.number().min(60).max(3600),
  motivosCancelacion: z.array(z.string()),
})

export async function actualizarConfiguracion(data: {
  porcentajeComision: number
  tiempoLimiteAceptacion: number
  motivosCancelacion: string[]
}) {
  await requireRole(['ADMIN'])
  const supabase = await createSupabaseServer()

  const parsed = configuracionSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error('Datos inválidos: ' + parsed.error.issues.map(i => i.message).join(', '))
  }

  const { error } = await supabase
    .from('configuracion_sistema')
    .update({
      porcentaje_comision: parsed.data.porcentajeComision,
      tiempo_limite_aceptacion: parsed.data.tiempoLimiteAceptacion,
      motivos_cancelacion: parsed.data.motivosCancelacion,
    })
    .eq('id', 'singleton')

  if (error) {
    throw new Error('Error al guardar: ' + error.message)
  }

  revalidatePath('/admin/configuracion')
}
