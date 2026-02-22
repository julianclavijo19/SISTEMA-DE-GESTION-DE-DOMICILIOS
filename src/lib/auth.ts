import { createSupabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export type Rol = 'ADMIN' | 'SECRETARIA' | 'DOMICILIARIO' | 'RESTAURANTE'

export interface UsuarioSesion {
  id: string
  authId: string
  email: string
  nombre: string
  rol: Rol
}

// Obtiene la sesión actual del usuario autenticado
export async function getSession(): Promise<UsuarioSesion | null> {
  const supabase = await createSupabaseServer()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) return null

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, auth_id, email, nombre, rol')
    .eq('auth_id', user.id)
    .single()

  if (!usuario) return null

  return {
    id: usuario.id,
    authId: usuario.auth_id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol as Rol,
  }
}

// Requiere autenticación o redirige al login
export async function requireAuth(): Promise<UsuarioSesion> {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}

// Requiere un rol específico o redirige
export async function requireRole(rolesPermitidos: Rol[]): Promise<UsuarioSesion> {
  const session = await requireAuth()
  if (!rolesPermitidos.includes(session.rol)) {
    redirect('/sin-acceso')
  }
  return session
}

// Mapea el rol a la ruta del dashboard correspondiente
export function getRutaDashboard(rol: Rol): string {
  const rutas: Record<Rol, string> = {
    ADMIN: '/admin/dashboard',
    SECRETARIA: '/secretaria/operaciones',
    DOMICILIARIO: '/domiciliario/inicio',
    RESTAURANTE: '/restaurante/solicitar',
  }
  return rutas[rol]
}
