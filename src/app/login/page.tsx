'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
      {/* Left brand panel — solid black */}
      <div className="login-brand">
        <div className="login-brand-content">
          <span className="brand-delivery" style={{ fontSize: '4rem', color: '#FFFFFF' }}>
            delivery
          </span>
          <p style={{ marginTop: '1rem' }}>
            Sistema de gestión de domicilios
          </p>
        </div>
      </div>

      {/* Right form side */}
      <div className="login-form-side">
        <div className="login-form-container">
          <h1>Iniciar sesión</h1>
          <p>Ingresa tus credenciales para continuar</p>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold"
              disabled={loading}
              style={{ background: '#0A0A0A', color: '#FFFFFF' }}
            >
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </Button>
          </form>

          <p className="text-center text-xs mt-8" style={{ color: 'var(--ds-text-muted)' }}>
            Ocaña, Norte de Santander
          </p>
        </div>
      </div>
    </div>
  )
}
