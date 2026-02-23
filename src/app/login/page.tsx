'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createSupabaseBrowser()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(`Error: ${authError.message}`)
        return
      }

      router.refresh()
      router.push('/')
    } catch (err: unknown) {
      setError(`Error inesperado: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Header negro */}
        <div className="login-card-header">
          <span className="brand-delivery" style={{ fontSize: '2.25rem', color: '#FFFFFF', fontWeight: 400 }}>
            delivery
          </span>
          <p className="login-card-subtitle">
            SISTEMA DE GESTIÓN DE DOMICILIOS
          </p>
        </div>

        {/* Formulario blanco */}
        <div className="login-card-body">
          <h2 className="login-card-title">Bienvenido</h2>
          <p className="login-card-desc">Ingresa tus credenciales para continuar</p>

          <form onSubmit={handleLogin} className="login-form">
            {error && (
              <Alert variant="destructive" style={{ marginBottom: '0.5rem' }}>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="login-field">
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>

          {/* Feature links */}
          <div className="login-features">
            <span className="login-feature">🛵 Entregas</span>
            <span className="login-sep">|</span>
            <span className="login-feature">📦 Pedidos</span>
            <span className="login-sep">|</span>
            <span className="login-feature">📍 Rastreo</span>
          </div>

          <p className="login-location">Ocaña, Norte de Santander</p>
        </div>
      </div>
    </div>
  )
}
