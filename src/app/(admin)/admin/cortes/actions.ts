'use server'

import { requireRole } from '@/lib/auth'
import { createSupabaseServer } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

interface CorteCajaInput {
  fechaInicio: string
  fechaFin: string
  creadoPorId: string
}

export async function generarCorteCaja(data: CorteCajaInput) {
  await requireRole(['ADMIN'])
  const supabase = await createSupabaseServer()

  const inicio = new Date(data.fechaInicio)
  inicio.setHours(0, 0, 0, 0)
  const fin = new Date(data.fechaFin)
  fin.setHours(23, 59, 59, 999)

  const { data: domicilios } = await supabase
    .from('domicilios')
    .select('valor_pedido, comision_empresa')
    .gte('creado_en', inicio.toISOString())
    .lte('creado_en', fin.toISOString())
    .eq('estado', 'ENTREGADO')

  const lista = domicilios ?? []
  const totalDomicilios = lista.length
  const totalBruto = lista.reduce((sum, d) => sum + Number(d.valor_pedido), 0)
  const totalComisiones = lista.reduce((sum, d) => sum + Number(d.comision_empresa ?? 0), 0)
  const totalPagoDomiciliarios = totalBruto - totalComisiones
  const saldoNeto = totalComisiones

  await supabase.from('cortes_caja').insert({
    fecha_inicio: inicio.toISOString(),
    fecha_fin: fin.toISOString(),
    total_domicilios: totalDomicilios,
    total_bruto: totalBruto,
    total_comisiones: totalComisiones,
    total_pago_domiciliarios: totalPagoDomiciliarios,
    saldo_neto: saldoNeto,
    creado_por_id: data.creadoPorId,
  })

  revalidatePath('/admin/cortes')
}
