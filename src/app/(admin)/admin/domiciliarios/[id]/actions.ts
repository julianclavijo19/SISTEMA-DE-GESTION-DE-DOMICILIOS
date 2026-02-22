'use server'

import { requireRole } from '@/lib/auth'
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function subirDocumentoDomiciliario(formData: FormData) {
  await requireRole(['ADMIN'])

  const domiciliarioId = formData.get('domiciliarioId') as string
  const tipoDocumento = formData.get('tipoDocumento') as string
  const archivo = formData.get('archivo') as File

  if (!domiciliarioId || !tipoDocumento || !archivo) {
    throw new Error('Faltan datos requeridos')
  }

  const supabase = await createSupabaseAdmin()

  const ext = archivo.name.split('.').pop() || 'pdf'
  const filePath = `${domiciliarioId}/${tipoDocumento}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('domiciliarios-docs')
    .upload(filePath, archivo, { upsert: true })

  if (uploadError) throw new Error('Error subiendo archivo: ' + uploadError.message)

  const { data: urlData } = supabase.storage
    .from('domiciliarios-docs')
    .getPublicUrl(filePath)

  await supabase
    .from('domiciliarios')
    .update({ [tipoDocumento]: urlData.publicUrl })
    .eq('id', domiciliarioId)

  revalidatePath(`/admin/domiciliarios/${domiciliarioId}`)
}

export async function actualizarFechaDocumento(data: {
  domiciliarioId: string
  campo: string
  fecha: string
}) {
  await requireRole(['ADMIN'])

  const supabase = await createSupabaseServer()

  await supabase
    .from('domiciliarios')
    .update({ [data.campo]: data.fecha })
    .eq('id', data.domiciliarioId)

  revalidatePath(`/admin/domiciliarios/${data.domiciliarioId}`)
}
