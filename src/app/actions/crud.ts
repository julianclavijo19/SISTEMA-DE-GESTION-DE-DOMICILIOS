'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase-server'

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

export async function asignarDomiciliarioAction(
  domicilioId: string,
  domiciliarioId: string,
) {
  const supabase = await createSupabaseServer()

  const { error } = await supabase
    .from('domicilios')
    .update({
      domiciliario_id: domiciliarioId,
      estado: 'ASIGNADO',
    })
    .eq('id', domicilioId)

  if (error) throw new Error('Error al asignar: ' + error.message)

  // Registrar en historial
  const { data: session } = await supabase.auth.getUser()
  if (session?.user) {
    const { data: usr } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_id', session.user.id)
      .single()

    if (usr) {
      await supabase.from('historial_estados').insert({
        domicilio_id: domicilioId,
        estado: 'ASIGNADO',
        cambiado_por_id: usr.id,
        nota: 'Asignado a domiciliario',
      })
    }
  }

  revalidatePath('/secretaria/operaciones')
}

export async function cancelarDomicilioAction(
  domicilioId: string,
  motivo: string,
) {
  const supabase = await createSupabaseServer()

  const { data: session } = await supabase.auth.getUser()
  let canceladoPorId: string | null = null

  if (session?.user) {
    const { data: usr } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_id', session.user.id)
      .single()
    canceladoPorId = usr?.id ?? null
  }

  const { error } = await supabase
    .from('domicilios')
    .update({
      estado: 'CANCELADO',
      motivo_cancelacion: motivo,
      cancelado_por_id: canceladoPorId,
    })
    .eq('id', domicilioId)

  if (error) throw new Error('Error al cancelar: ' + error.message)

  // Registrar en historial
  if (canceladoPorId) {
    await supabase.from('historial_estados').insert({
      domicilio_id: domicilioId,
      estado: 'CANCELADO',
      cambiado_por_id: canceladoPorId,
      nota: motivo,
    })
  }

  revalidatePath('/secretaria/operaciones')
}

export async function avanzarEstadoDomicilioAction(domicilioId: string) {
  const supabase = await createSupabaseServer()

  const { data: domicilio } = await supabase
    .from('domicilios')
    .select('estado')
    .eq('id', domicilioId)
    .single()

  if (!domicilio) throw new Error('Domicilio no encontrado')

  const flujo: Record<string, string> = {
    ASIGNADO: 'EN_CAMINO',
    EN_CAMINO: 'ENTREGADO',
  }

  const siguiente = flujo[domicilio.estado]
  if (!siguiente) throw new Error('No se puede avanzar desde el estado actual')

  const updateData: Record<string, unknown> = { estado: siguiente }
  if (siguiente === 'ENTREGADO') {
    updateData.entregado_en = new Date().toISOString()
  }

  const { error } = await supabase
    .from('domicilios')
    .update(updateData)
    .eq('id', domicilioId)

  if (error) throw new Error('Error al avanzar estado: ' + error.message)

  // Registrar en historial
  const { data: session } = await supabase.auth.getUser()
  if (session?.user) {
    const { data: usr } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_id', session.user.id)
      .single()

    if (usr) {
      await supabase.from('historial_estados').insert({
        domicilio_id: domicilioId,
        estado: siguiente,
        cambiado_por_id: usr.id,
      })
    }
  }

  revalidatePath('/domiciliario/inicio')
}

export async function crearNovedadAction(
  domicilioId: string,
  descripcion: string,
) {
  const supabase = await createSupabaseServer()

  const { data: session } = await supabase.auth.getUser()
  if (!session?.user) throw new Error('No autenticado')

  const { data: usr } = await supabase
    .from('usuarios')
    .select('id')
    .eq('auth_id', session.user.id)
    .single()

  if (!usr) throw new Error('Usuario no encontrado')

  const { error } = await supabase.from('novedades').insert({
    domicilio_id: domicilioId,
    reportado_por_id: usr.id,
    descripcion,
  })

  if (error) throw new Error('Error al crear novedad: ' + error.message)

  revalidatePath('/domiciliario/inicio')
  revalidatePath('/secretaria/operaciones')
}
