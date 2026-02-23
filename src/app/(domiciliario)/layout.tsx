'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import Link from 'next/link'
import { House, ClockCounterClockwise, SignOut } from '@/lib/icons'

const navItems = [
  { href: '/domiciliario/inicio', label: 'Inicio', icon: House },
  { href: '/domiciliario/historial', label: 'Historial', icon: ClockCounterClockwise },
]

export default function DomiciliarioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  async function handleLogout() {
    const supabase = createSupabaseBrowser()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto" style={{ background: 'var(--ds-bg)' }}>
      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4">{children}</main>

      {/* Bottom navigation */}
      <nav className="ds-bottom-nav">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={isActive ? 'active' : ''}
            >
              <Icon />
              {item.label}
            </Link>
          )
        })}
        <button onClick={handleLogout} className="ds-bottom-nav-btn">
          <SignOut />
          Salir
        </button>
      </nav>
    </div>
  )
}
