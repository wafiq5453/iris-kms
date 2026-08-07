'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BookOpen, Upload, Globe, Rss, Network, Settings,
  LogOut, ChevronDown, Menu, X, Shield
} from 'lucide-react'
import clsx from 'clsx'

interface NavbarProps {
  role: 'staff' | 'researcher'
  username: string
  userId: string
}

const TABS = [
  { href: '/library', label: 'Perpustakaan', icon: BookOpen },
  { href: '/wiki',    label: 'Wiki',          icon: Globe },
  { href: '/feed',    label: 'Suapan',        icon: Rss },
  { href: '/map',     label: 'Peta Ilmu',     icon: Network },
]
const STAFF_TABS = [
  { href: '/upload',  label: 'Upload',   icon: Upload },
  { href: '/admin',   label: 'Admin',    icon: Settings },
]

export default function Navbar({ role, username }: NavbarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)

  const tabs = role === 'staff' ? [...TABS, ...STAFF_TABS] : TABS

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-0 flex-shrink-0 z-40 relative">

        {/* Brand */}
        <Link href="/library" className="flex items-center gap-2.5 mr-4 flex-shrink-0" onClick={() => setMenuOpen(false)}>
          <div className="w-8 h-8 rounded-lg bg-iris-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            I
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-bold text-slate-900 leading-none">IRIS KMS</div>
            <div className="text-[10px] text-slate-400 leading-none mt-0.5 uppercase tracking-wider">Knowledge Hub</div>
          </div>
        </Link>

        {/* Nav tabs desktop */}
        <div className="hidden md:block w-px h-7 bg-slate-200 mr-4" />
        <nav className="hidden md:flex h-14 items-stretch gap-0 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={clsx('nav-tab', pathname.startsWith(tab.href) && 'active')}
              >
                <Icon size={14} />
                {tab.label}
              </Link>
            )
          })}
        </nav>

        {/* Right */}
        <div className="ml-auto flex items-center gap-2">
          {role === 'staff' && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-iris-50 text-iris-700 text-xs font-medium rounded-md border border-iris-200">
              <Shield size={11} /> Staff
            </span>
          )}

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => { setUserOpen(s => !s); setMenuOpen(false) }}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-sm text-slate-700"
            >
              <div className="w-7 h-7 rounded-full bg-iris-100 flex items-center justify-center text-iris-700 text-xs font-semibold uppercase flex-shrink-0">
                {username[0] ?? 'U'}
              </div>
              <span className="hidden sm:block font-medium max-w-[80px] truncate">{username}</span>
              <ChevronDown size={13} className="text-slate-400 hidden sm:block" />
            </button>
            {userOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-panel z-50 py-1 animate-fade-in">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-900 truncate">{username}</p>
                    <p className="text-xs text-slate-500 capitalize">{role}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={13} /> Log Keluar
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Hamburger — mobile only */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
            onClick={() => { setMenuOpen(s => !s); setUserOpen(false) }}
            aria-label="Menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/20 md:hidden" onClick={() => setMenuOpen(false)} />
          <div className="fixed top-14 left-0 right-0 z-30 bg-white border-b border-slate-200 shadow-lg md:hidden">
            {tabs.map(tab => {
              const Icon = tab.icon
              const active = pathname.startsWith(tab.href)
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setMenuOpen(false)}
                  className={clsx(
                    'flex items-center gap-3 px-5 py-4 text-sm border-l-2 transition-colors',
                    active
                      ? 'border-iris-600 bg-iris-50 text-iris-700 font-medium'
                      : 'border-transparent text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <Icon size={18} />
                  {tab.label}
                </Link>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
