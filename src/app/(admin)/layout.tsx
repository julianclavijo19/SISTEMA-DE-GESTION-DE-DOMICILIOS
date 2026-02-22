'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import Link from 'next/link'
import { useState } from 'react'
import {
  SquaresFour,
  Users,
  Storefront,
  GearSix,
  SignOut,
  List,
  Warning,
  Scissors,
  ChartBar,
} from '@/lib/icons'

const navSections = [
  {
    label: 'PRINCIPAL',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: SquaresFour },
    ],
  },
  {
    label: 'OPERACIONES',
    items: [
      { href: '/admin/domiciliarios', label: 'Domiciliarios', icon: Users },
      { href: '/admin/restaurantes', label: 'Restaurantes', icon: Storefront },
      { href: '/admin/novedades', label: 'Novedades', icon: Warning },
      { href: '/admin/cortes', label: 'Cortes de caja', icon: Scissors },
    ],
  },
  {
    label: 'SISTEMA',
    items: [
      { href: '/admin/reportes', label: 'Reportes', icon: ChartBar },
      { href: '/admin/configuracion', label: 'Configuración', icon: GearSix },
    ],
  },
]

function NavContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createSupabaseBrowser()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="ds-sidebar">
      {/* Brand */}
      <div className="ds-sidebar-brand">
        <span className="brand-delivery">delivery</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navSections.map((section) => (
          <div key={section.label} className="ds-sidebar-section">
            <div className="ds-sidebar-section-label">{section.label}</div>
            {section.items.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`ds-sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <Icon weight={isActive ? 'fill' : 'regular'} />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User card + Logout */}
      <div className="ds-sidebar-user">
        <div className="ds-sidebar-user-avatar">AD</div>
        <div className="ds-sidebar-user-info">
          <p>Administrador</p>
          <span>admin@sistema.co</span>
        </div>
      </div>
      <div style={{ padding: '0 0.625rem 0.75rem' }}>
        <button
          className="ds-sidebar-link"
          onClick={handleLogout}
          style={{ margin: 0, width: '100%' }}
        >
          <SignOut />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <div className="flex h-screen" style={{ background: 'var(--ds-bg)' }}>
      {/* Sidebar — solo desktop, fijo */}
      <aside className="hidden md:flex md:w-[220px] md:flex-col md:flex-shrink-0">
        <NavContent pathname={pathname} />
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header — solo celular */}
        <header className="ds-mobile-header md:hidden">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <List size={20} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[220px]" style={{ background: 'var(--ds-sidebar)' }}>
              <NavContent pathname={pathname} onNavigate={() => setSheetOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="brand-delivery" style={{ fontSize: '1.25rem' }}>delivery</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6" style={{ background: 'var(--ds-bg)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
