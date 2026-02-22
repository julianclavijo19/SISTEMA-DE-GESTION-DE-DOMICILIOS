import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Mapeo de rutas protegidas por rol
const RUTAS_ROL: Record<string, string[]> = {
  '/admin': ['ADMIN'],
  '/secretaria': ['ADMIN', 'SECRETARIA'],
  '/domiciliario': ['DOMICILIARIO'],
  '/restaurante': ['RESTAURANTE'],
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Si no está autenticado y no está en /login, redirigir
  if (!user && pathname !== '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Si está autenticado y va al login, redirigir al dashboard
  if (user && pathname === '/login') {
    // Obtener el rol del usuario desde la BD
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('auth_id', user.id)
      .single()

    if (usuario) {
      const rutas: Record<string, string> = {
        ADMIN: '/admin/dashboard',
        SECRETARIA: '/secretaria/operaciones',
        DOMICILIARIO: '/domiciliario/inicio',
        RESTAURANTE: '/restaurante/solicitar',
      }
      const url = request.nextUrl.clone()
      url.pathname = rutas[usuario.rol] || '/'
      return NextResponse.redirect(url)
    }
  }

  // Verificar autorización por rol en rutas protegidas
  if (user) {
    for (const [ruta, rolesPermitidos] of Object.entries(RUTAS_ROL)) {
      if (pathname.startsWith(ruta)) {
        const { data: usuario } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('auth_id', user.id)
          .single()

        if (!usuario || !rolesPermitidos.includes(usuario.rol)) {
          const url = request.nextUrl.clone()
          url.pathname = '/sin-acceso'
          return NextResponse.redirect(url)
        }
        break
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico
     * - archivos de assets públicos
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
