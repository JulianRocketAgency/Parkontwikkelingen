'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Users, Settings, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutGrid },
  { href: '/eigenaren',    label: 'Eigenaren',    icon: Users },
  { href: '/instellingen', label: 'Instellingen', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="w-[220px] flex-shrink-0 flex flex-col gap-0.5 sticky top-0 h-screen overflow-y-auto
      bg-white/75 backdrop-blur-xl border-r border-black/[0.08] px-3 py-5">
      {/* Logo */}
      <div className="px-3 pb-4 mb-2 border-b border-black/[0.05]">
        <span className="text-[17px] font-bold tracking-tight">
          Park<span className="text-[#0071e3]">Bouw</span>
        </span>
      </div>

      {/* Nav section */}
      <p className="px-3 pt-2 pb-1 text-[11px] font-semibold text-[#aeaeb2] uppercase tracking-[0.06em]">
        Menu
      </p>
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link key={href} href={href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[14px] transition-all
              ${active
                ? 'bg-[rgba(0,113,227,0.10)] text-[#004f9e] font-medium'
                : 'text-[#3a3a3c] hover:bg-black/[0.05]'
              }`}>
            <Icon size={15} className="flex-shrink-0" />
            {label}
          </Link>
        )
      })}

      <p className="px-3 pt-4 pb-1 text-[11px] font-semibold text-[#aeaeb2] uppercase tracking-[0.06em]">
        Park
      </p>
      <button className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[14px] text-[#3a3a3c] hover:bg-black/[0.05] transition-all text-left">
        <Plus size={15} />Heideplas
      </button>

      {/* User */}
      <div className="mt-auto pt-3 border-t border-black/[0.05]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] hover:bg-black/[0.05] transition-all text-left"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0071e3] to-[#30d158]
            flex items-center justify-content-center text-[11px] font-semibold text-white flex-shrink-0
            flex items-center justify-center">
            JD
          </div>
          <div>
            <div className="text-[13px] font-medium text-[#3a3a3c]">Jan de Vries</div>
            <div className="text-[11px] text-[#aeaeb2]">Ontwikkelaar</div>
          </div>
        </button>
      </div>
    </nav>
  )
}
