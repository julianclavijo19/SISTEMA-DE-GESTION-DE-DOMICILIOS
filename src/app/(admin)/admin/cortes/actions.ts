'use server'

import { requireRole } from '@/lib/auth'
import { createSupabaseServer } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

interface CorteCajaInput {
  fechaInicio: string
  fechaFin: string
  creadoPorId: string
}

/** Preview data for a date range (no insert, just read) */
export async function previsualizarCorte(data: { fechaInicio: string; fechaFin: string }) {
  await requireRole(['ADMIN'])
  const supabase = await createSupabaseServer()

  const inicio = new Date(data.fechaInicio)
  inicio.setHours(0, 0, 0, 0)
  const fin = new Date(data.fechaFin)
  fin.setHours(23, 59, 59, 999)

  const { data: domicilios } = await supabase
    .from('domicilios')
    .select(`
      id, valor_pedido, comision_empresa, porcentaje_comision,
      restaurantes(usuarios(nombre)),
      domiciliarios(usuarios(nombre))
    `)
    .gte('creado_en', inicio.toISOString())
    .lte('creado_en', fin.toISOString())
    .eq('estado', 'ENTREGADO')

  const lista = domicilios ?? []

  const totalDomicilios = lista.length
  const totalBruto = lista.reduce((sum, d) => sum + Number(d.valor_pedido), 0)
  const totalComisiones = lista.reduce((sum, d) => sum + Number(d.comision_empresa ?? 0), 0)
  const totalPagoDomiciliarios = totalBruto - totalComisiones

  // Desglose por restaurante
  const porRestaurante: Record<string, { pedidos: number; bruto: number; comision: number }> = {}
  for (const d of lista) {
    const nombre = (d.restaurantes as any)?.usuarios?.nombre ?? 'Sin restaurante'
    if (!porRestaurante[nombre]) porRestaurante[nombre] = { pedidos: 0, bruto: 0, comision: 0 }
    porRestaurante[nombre].pedidos++
    porRestaurante[nombre].bruto += Number(d.valor_pedido)
    porRestaurante[nombre].comision += Number(d.comision_empresa ?? 0)
  }

  // Desglose por domiciliario
  const porDomiciliario: Record<string, { entregas: number; bruto: number }> = {}
  for (const d of lista) {
    const nombre = (d.domiciliarios as any)?.usuarios?.nombre ?? 'Sin asignar'
    if (!porDomiciliario[nombre]) porDomiciliario[nombre] = { entregas: 0, bruto: 0 }
    porDomiciliario[nombre].entregas++
    porDomiciliario[nombre].bruto += Number(d.valor_pedido)
  }

  return {
    totalDomicilios,
    totalBruto,
    totalComisiones,
    totalPagoDomiciliarios,
    saldoNeto: totalComisiones,
    porRestaurante: Object.entries(porRestaurante)
      .sort((a, b) => b[1].comision - a[1].comision)
      .map(([nombre, data]) => ({ nombre, ...data })),
    porDomiciliario: Object.entries(porDomiciliario)
      .sort((a, b) => b[1].entregas - a[1].entregas)
      .map(([nombre, data]) => ({ nombre, ...data })),
  }
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

  const { error } = await supabase.from('cortes_caja').insert({
    fecha_inicio: inicio.toISOString(),
    fecha_fin: fin.toISOString(),
    total_domicilios: totalDomicilios,
    total_bruto: totalBruto,
    total_comisiones: totalComisiones,
    total_pago_domiciliarios: totalPagoDomiciliarios,
    saldo_neto: saldoNeto,
    creado_por_id: data.creadoPorId,
  })

  if (error) throw new Error('Error guardando corte: ' + error.message)

  revalidatePath('/admin/cortes')
}
