'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Truck, Package, MapPin } from '@/lib/icons'

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
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0A0A0A',
        padding: '1.25rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(255,255,255,0.06) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 100%, rgba(255,255,255,0.04) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      {/* Login Card */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '420px',
          background: '#FFFFFF',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 25px 50px -12px rgba(0,0,0,0.35)',
        }}
      >
        {/* Brand header */}
        <div
          style={{
            textAlign: 'center',
            padding: '2.5rem 2rem 1.5rem',
            background: '#0A0A0A',
            color: '#FFFFFF',
          }}
        >
          <span className="brand-delivery" style={{ fontSize: '2.5rem', color: '#FFFFFF' }}>
            delivery
          </span>
          <p
            style={{
              fontSize: '0.8125rem',
              color: 'rgba(255,255,255,0.55)',
              margin: '0.5rem 0 0',
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              fontWeight: 500,
            }}
          >
            Sistema de gestión de domicilios
          </p>
        </div>

        {/* Form section */}
        <div style={{ padding: '2rem 2rem 1.5rem' }}>
          <div style={{ marginBottom: '1.75rem' }}>
            <h1
              style={{
                fontSize: '1.375rem',
                fontWeight: 600,
                color: '#0F172A',
                margin: '0 0 0.25rem',
                letterSpacing: '-0.02em',
              }}
            >
              Bienvenido
            </h1>
            <p style={{ fontSize: '0.8125rem', color: '#94A3B8', margin: 0 }}>
              Ingresa tus credenciales para continuar
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}
          >
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <Label htmlFor="email" style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <Label htmlFor="password" style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
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
              disabled={loading}
              style={{
                width: '100%',
                height: '2.75rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                background: '#0A0A0A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                marginTop: '0.5rem',
              }}
            >
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </Button>
          </form>
        </div>

        {/* Footer features */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            padding: '0 2rem 1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: '#94A3B8', fontWeight: 500 }}>
            <Truck size={16} weight="bold" style={{ color: '#0A0A0A', opacity: 0.6 }} />
            <span>Entregas</span>
          </div>
          <div style={{ width: '1px', height: '14px', background: '#E2E8F0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: '#94A3B8', fontWeight: 500 }}>
            <Package size={16} weight="bold" style={{ color: '#0A0A0A', opacity: 0.6 }} />
            <span>Pedidos</span>
          </div>
          <div style={{ width: '1px', height: '14px', background: '#E2E8F0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: '#94A3B8', fontWeight: 500 }}>
            <MapPin size={16} weight="bold" style={{ color: '#0A0A0A', opacity: 0.6 }} />
            <span>Rastreo</span>
          </div>
        </div>

        <p
          style={{
            textAlign: 'center',
            fontSize: '0.6875rem',
            color: '#94A3B8',
            padding: '0.75rem 2rem 1.25rem',
            margin: 0,
            opacity: 0.7,
          }}
        >
          Ocaña, Norte de Santander
        </p>
      </div>
    </div>
  )
}
