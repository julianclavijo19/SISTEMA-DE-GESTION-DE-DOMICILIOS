'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useState } from 'react'
import { PlusCircle, Eye, ClockCounterClockwise, SignOut, List } from '@/lib/icons'

const navItems = [
  { href: '/restaurante/solicitar', label: 'Solicitar domicilio', icon: PlusCircle },
  { href: '/restaurante/rastreo', label: 'Rastreo en vivo', icon: Eye },
  { href: '/restaurante/historial', label: 'Historial', icon: ClockCounterClockwise },
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
      <div className="ds-sidebar-brand">
        <span className="brand-delivery">delivery</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        <div className="ds-sidebar-section">
          <div className="ds-sidebar-section-label">MENÚ</div>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`ds-sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      <div style={{ padding: '0 1.25rem 1rem' }}>
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

export default function RestauranteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <div className="flex h-screen" style={{ background: 'var(--ds-bg)' }}>
      <aside className="hidden md:flex md:w-[280px] md:flex-col md:flex-shrink-0">
        <NavContent pathname={pathname} />
      </aside>

      {/* Mobile sidebar trigger */}
      <div className="md:hidden fixed top-3 left-3 z-50">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" style={{ background: 'var(--ds-sidebar)', border: '1px solid var(--ds-border)', borderRadius: '8px' }}>
              <List className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[280px]" style={{ background: 'var(--ds-sidebar)' }}>
            <NavContent pathname={pathname} onNavigate={() => setSheetOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-6" style={{ background: 'var(--ds-bg)' }}>
        {children}
      </main>
    </div>
  )
}
