'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase-server'

// ─── helpers ────────────────────────────────────────────────────────────────────

async function getUsuarioId() {
  const supabase = await createSupabaseServer()
  const { data: session } = await supabase.auth.getUser()
  if (!session?.user) return null

  const { data: usr } = await supabase
    .from('usuarios')
    .select('id')
    .eq('auth_id', session.user.id)
    .single()

  return usr?.id ?? null
}

// ─── DOMICILIARIO ───────────────────────────────────────────────────────────────

export async function crearDomiciliario(data: {
  nombre: string
  email: string
  telefono: string
  cedula: string
  password: string
  placa?: string
  modelo_moto?: string
  tiene_tecnomecanica?: boolean
  tiene_soat?: boolean
  tiene_licencia?: boolean
}) {
  const supabaseAdmin = await createSupabaseAdmin()

  // 1. Crear auth user
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nombre: data.nombre, rol: 'DOMICILIARIO' },
    })

  if (authError) throw new Error('Error creando auth user: ' + authError.message)

  const authId = authData.user.id

  try {
    // 2. Crear fila en usuarios
    const { data: usuario, error: userError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        auth_id: authId,
        email: data.email,
        nombre: data.nombre,
        telefono: data.telefono || null,
        rol: 'DOMICILIARIO',
        estado: 'ACTIVO',
      })
      .select('id')
      .single()

    if (userError) throw new Error('Error creando usuario: ' + userError.message)

    // 3. Crear fila en domiciliarios
    const { error: domError } = await supabaseAdmin.from('domiciliarios').insert({
      usuario_id: usuario.id,
      cedula: data.cedula,
      placa: data.placa || null,
      modelo_moto: data.modelo_moto || null,
      tiene_tecnomecanica: data.tiene_tecnomecanica ?? false,
      tiene_soat: data.tiene_soat ?? false,
      tiene_licencia: data.tiene_licencia ?? false,
    })

    if (domError) throw new Error('Error creando domiciliario: ' + domError.message)
  } catch (err) {
    // Rollback: eliminar auth user si falla algo después
    await supabaseAdmin.auth.admin.deleteUser(authId)
    throw err
  }

  revalidatePath('/admin/domiciliarios')
}

export async function toggleEstadoDomiciliario(usuarioId: string) {
  const supabase = await createSupabaseServer()

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('estado')
    .eq('id', usuarioId)
    .single()

  if (!usuario) throw new Error('Usuario no encontrado')

  const nuevoEstado = usuario.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO'

  const { error } = await supabase
    .from('usuarios')
    .update({ estado: nuevoEstado })
    .eq('id', usuarioId)

  if (error) throw new Error('Error al cambiar estado: ' + error.message)

  revalidatePath('/admin/domiciliarios')
}

// ─── RESTAURANTE ────────────────────────────────────────────────────────────────

export async function crearRestaurante(data: {
  nombre: string
  email: string
  telefono: string
  password: string
  nit?: string
  direccion?: string
  horario?: string
}) {
  const supabaseAdmin = await createSupabaseAdmin()

  // 1. Crear auth user
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nombre: data.nombre, rol: 'RESTAURANTE' },
    })

  if (authError) throw new Error('Error creando auth user: ' + authError.message)

  const authId = authData.user.id

  try {
    // 2. Crear fila en usuarios
    const { data: usuario, error: userError } = await supabaseAdmin
      .from('usuarios')
      .insert({
        auth_id: authId,
        email: data.email,
        nombre: data.nombre,
        telefono: data.telefono || null,
        rol: 'RESTAURANTE',
        estado: 'ACTIVO',
      })
      .select('id')
      .single()

    if (userError) throw new Error('Error creando usuario: ' + userError.message)

    // 3. Crear fila en restaurantes
    const { error: restError } = await supabaseAdmin.from('restaurantes').insert({
      usuario_id: usuario.id,
      nit: data.nit || null,
      direccion: data.direccion || null,
      horario: data.horario || null,
    })

    if (restError) throw new Error('Error creando restaurante: ' + restError.message)
  } catch (err) {
    await supabaseAdmin.auth.admin.deleteUser(authId)
    throw err
  }

  revalidatePath('/admin/restaurantes')
}

export async function toggleEstadoRestaurante(usuarioId: string) {
  const supabase = await createSupabaseServer()

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('estado')
    .eq('id', usuarioId)
    .single()

  if (!usuario) throw new Error('Usuario no encontrado')

  const nuevoEstado = usuario.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO'

  const { error } = await supabase
    .from('usuarios')
    .update({ estado: nuevoEstado })
    .eq('id', usuarioId)

  if (error) throw new Error('Error al cambiar estado: ' + error.message)

  revalidatePath('/admin/restaurantes')
}

// ─── DOMICILIOS ─────────────────────────────────────────────────────────────────

/** Secretaria o Admin asigna un domiciliario a un pedido */
export async function asignarDomiciliarioAction(
  domicilioId: string,
  domiciliarioId: string,
) {
  const supabase = await createSupabaseServer()
  const usuarioId = await getUsuarioId()

  // Update domicilio
  const { error } = await supabase
    .from('domicilios')
    .update({
      domiciliario_id: domiciliarioId,
      estado: 'ASIGNADO',
      actualizado_en: new Date().toISOString(),
    })
    .eq('id', domicilioId)

  if (error) throw new Error('Error al asignar: ' + error.message)

  // Marcar domiciliario como no disponible
  await supabase
    .from('domiciliarios')
    .update({ disponible: false })
    .eq('id', domiciliarioId)

  // Registrar en historial
  if (usuarioId) {
    await supabase.from('historial_estados').insert({
      domicilio_id: domicilioId,
      estado: 'ASIGNADO',
      cambiado_por_id: usuarioId,
      nota: 'Asignado por secretaría/admin',
    })
  }

  revalidatePath('/secretaria/operaciones')
  revalidatePath('/domiciliario/inicio')
  revalidatePath('/admin/dashboard')
}

/** Reasignar domiciliario */
export async function reasignarDomiciliarioAction(
  domicilioId: string,
  nuevoDomiciliarioId: string,
  anteriorDomiciliarioId: string | null,
) {
  const supabase = await createSupabaseServer()
  const usuarioId = await getUsuarioId()

  const { error } = await supabase
    .from('domicilios')
    .update({
      domiciliario_id: nuevoDomiciliarioId,
      actualizado_en: new Date().toISOString(),
    })
    .eq('id', domicilioId)

  if (error) throw new Error('Error reasignando: ' + error.message)

  // Liberar domiciliario anterior
  if (anteriorDomiciliarioId) {
    await supabase
      .from('domiciliarios')
      .update({ disponible: true })
      .eq('id', anteriorDomiciliarioId)
  }

  // Marcar nuevo domiciliario como ocupado
  await supabase
    .from('domiciliarios')
    .update({ disponible: false })
    .eq('id', nuevoDomiciliarioId)

  // Registrar en historial
  if (usuarioId) {
    await supabase.from('historial_estados').insert({
      domicilio_id: domicilioId,
      estado: 'ASIGNADO',
      cambiado_por_id: usuarioId,
      nota: 'Reasignado a otro domiciliario',
    })
  }

  revalidatePath('/secretaria/operaciones')
  revalidatePath('/domiciliario/inicio')
}

/** Cancelar un domicilio */
export async function cancelarDomicilioAction(
  domicilioId: string,
  motivo: string,
) {
  const supabase = await createSupabaseServer()
  const usuarioId = await getUsuarioId()

  // Obtener info del domicilio para liberar domiciliario
  const { data: domicilio } = await supabase
    .from('domicilios')
    .select('domiciliario_id')
    .eq('id', domicilioId)
    .single()

  const { error } = await supabase
    .from('domicilios')
    .update({
      estado: 'CANCELADO',
      motivo_cancelacion: motivo,
      cancelado_por_id: usuarioId,
      actualizado_en: new Date().toISOString(),
    })
    .eq('id', domicilioId)

  if (error) throw new Error('Error al cancelar: ' + error.message)

  // Liberar domiciliario si había uno asignado
  if (domicilio?.domiciliario_id) {
    await supabase
      .from('domiciliarios')
      .update({ disponible: true })
      .eq('id', domicilio.domiciliario_id)
  }

  // Registrar en historial
  if (usuarioId) {
    await supabase.from('historial_estados').insert({
      domicilio_id: domicilioId,
      estado: 'CANCELADO',
      cambiado_por_id: usuarioId,
      nota: motivo,
    })
  }

  revalidatePath('/secretaria/operaciones')
  revalidatePath('/domiciliario/inicio')
  revalidatePath('/admin/dashboard')
}

/** Domiciliario acepta un pedido pendiente */
export async function aceptarPedidoAction(domicilioId: string) {
  const supabase = await createSupabaseServer()
  const usuarioId = await getUsuarioId()
  if (!usuarioId) throw new Error('No autenticado')

  // Get domiciliario profile
  const { data: dom } = await supabase
    .from('domiciliarios')
    .select('id')
    .eq('usuario_id', usuarioId)
    .single()

  if (!dom) throw new Error('Perfil de domiciliario no encontrado')

  // Check the order is still PENDIENTE
  const { data: pedido } = await supabase
    .from('domicilios')
    .select('estado')
    .eq('id', domicilioId)
    .single()

  if (!pedido || pedido.estado !== 'PENDIENTE') {
    throw new Error('El pedido ya no está disponible')
  }

  const { error } = await supabase
    .from('domicilios')
    .update({
      domiciliario_id: dom.id,
      estado: 'ASIGNADO',
      actualizado_en: new Date().toISOString(),
    })
    .eq('id', domicilioId)
    .eq('estado', 'PENDIENTE')

  if (error) throw new Error('No se pudo aceptar el pedido: ' + error.message)

  // Marcar domiciliario como no disponible
  await supabase
    .from('domiciliarios')
    .update({ disponible: false })
    .eq('id', dom.id)

  // Historial
  await supabase.from('historial_estados').insert({
    domicilio_id: domicilioId,
    estado: 'ASIGNADO',
    cambiado_por_id: usuarioId,
    nota: 'Aceptado por domiciliario',
  })

  revalidatePath('/domiciliario/inicio')
  revalidatePath('/secretaria/operaciones')
}

/** Domiciliario avanza el estado (ASIGNADO → EN_CAMINO → ENTREGADO) */
export async function avanzarEstadoDomicilioAction(domicilioId: string) {
  const supabase = await createSupabaseServer()
  const usuarioId = await getUsuarioId()

  const { data: domicilio } = await supabase
    .from('domicilios')
    .select('estado, valor_pedido, porcentaje_comision, domiciliario_id')
    .eq('id', domicilioId)
    .single()

  if (!domicilio) throw new Error('Domicilio no encontrado')

  const flujo: Record<string, string> = {
    ASIGNADO: 'EN_CAMINO',
    EN_CAMINO: 'ENTREGADO',
  }

  const siguiente = flujo[domicilio.estado]
  if (!siguiente) throw new Error('No se puede avanzar desde el estado actual')

  const updateData: Record<string, unknown> = {
    estado: siguiente,
    actualizado_en: new Date().toISOString(),
  }

  if (siguiente === 'ENTREGADO') {
    updateData.entregado_en = new Date().toISOString()
    // Calcular comisión de la empresa
    const comision = Math.round(
      Number(domicilio.valor_pedido) * Number(domicilio.porcentaje_comision) / 100
    )
    updateData.comision_empresa = comision
  }

  const { error } = await supabase
    .from('domicilios')
    .update(updateData)
    .eq('id', domicilioId)

  if (error) throw new Error('Error al avanzar estado: ' + error.message)

  // Si se entregó, liberar domiciliario
  if (siguiente === 'ENTREGADO' && domicilio.domiciliario_id) {
    await supabase
      .from('domiciliarios')
      .update({ disponible: true })
      .eq('id', domicilio.domiciliario_id)
  }

  // Registrar en historial
  if (usuarioId) {
    await supabase.from('historial_estados').insert({
      domicilio_id: domicilioId,
      estado: siguiente,
      cambiado_por_id: usuarioId,
      nota: siguiente === 'ENTREGADO' ? 'Entrega confirmada por domiciliario' : 'En camino al destino',
    })
  }

  revalidatePath('/domiciliario/inicio')
  revalidatePath('/secretaria/operaciones')
  revalidatePath('/admin/dashboard')
}

/** Secretaria/Admin crea un pedido */
export async function crearDomicilioSecretariaAction(data: {
  restaurante_id: string
  nombre_cliente: string
  telefono_cliente: string
  direccion_entrega: string
  referencia_direccion?: string
  observaciones?: string
  valor_pedido: number
}) {
  const supabase = await createSupabaseServer()
  const usuarioId = await getUsuarioId()
  if (!usuarioId) throw new Error('No autenticado')

  // Get commission config
  const { data: config } = await supabase
    .from('configuracion_sistema')
    .select('porcentaje_comision')
    .limit(1)
    .single()

  const porcentaje = Number(config?.porcentaje_comision ?? 20)
  const comision = Math.round(data.valor_pedido * porcentaje / 100)

  const { data: nuevoDomicilio, error } = await supabase.from('domicilios').insert({
    restaurante_id: data.restaurante_id,
    creado_por_id: usuarioId,
    nombre_cliente: data.nombre_cliente,
    telefono_cliente: data.telefono_cliente,
    direccion_entrega: data.direccion_entrega,
    referencia_direccion: data.referencia_direccion || null,
    observaciones: data.observaciones || null,
    valor_pedido: data.valor_pedido,
    porcentaje_comision: porcentaje,
    comision_empresa: comision,
    estado: 'PENDIENTE',
  }).select('id').single()

  if (error) throw new Error('Error creando domicilio: ' + error.message)

  // Historial
  if (nuevoDomicilio) {
    await supabase.from('historial_estados').insert({
      domicilio_id: nuevoDomicilio.id,
      estado: 'PENDIENTE',
      cambiado_por_id: usuarioId,
      nota: 'Pedido creado por secretaría',
    })
  }

  revalidatePath('/secretaria/operaciones')
  revalidatePath('/admin/dashboard')
}

export async function crearNovedadAction(
  domicilioId: string,
  descripcion: string,
) {
  const supabase = await createSupabaseServer()
  const usuarioId = await getUsuarioId()
  if (!usuarioId) throw new Error('No autenticado')

  const { error } = await supabase.from('novedades').insert({
    domicilio_id: domicilioId,
    reportado_por_id: usuarioId,
    descripcion,
  })

  if (error) throw new Error('Error al crear novedad: ' + error.message)

  revalidatePath('/domiciliario/inicio')
  revalidatePath('/secretaria/operaciones')
  revalidatePath('/secretaria/novedades')
  revalidatePath('/admin/novedades')
}
