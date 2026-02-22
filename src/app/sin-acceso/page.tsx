import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ShieldSlash } from '@/lib/icons'

export default function SinAccesoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--ds-bg)' }}>
      <div className="text-center max-w-md">
        <div className="kpi-icon kpi-icon-red mx-auto mb-6" style={{ width: 64, height: 64, borderRadius: 16 }}>
          <ShieldSlash style={{ width: 28, height: 28 }} />
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--ds-text)', marginBottom: '0.5rem' }}>
          Acceso denegado
        </h1>
        <p style={{ color: 'var(--ds-text-muted)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          No tienes permisos para acceder a esta sección.
          Contacta al administrador si crees que esto es un error.
        </p>
        <Button asChild>
          <Link href="/login">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  )
}
