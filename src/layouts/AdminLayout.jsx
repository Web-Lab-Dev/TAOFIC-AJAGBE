import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ADMIN_NAV_ITEMS } from '../constants/navigation'

const SECTIONS = [
  { key: 'main', label: 'Principal' },
  { key: 'supervision', label: 'Supervision' },
  { key: 'admin', label: 'Administration' },
]

function SidebarNav({ onClose }) {
  return (
    <nav aria-label="Navigation Gérant" className="flex flex-col gap-1 px-3 py-4" data-testid="admin-nav">
      {SECTIONS.map(sec => {
        const items = ADMIN_NAV_ITEMS.filter(i => i.section === sec.key)
        if (!items.length) return null
        return (
          <div key={sec.key} className="mb-3">
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-blue-300">
              {sec.label}
            </p>
            {items.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/admin'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-700 text-white'
                      : 'text-blue-100 hover:bg-blue-800/60 hover:text-white'
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </div>
        )
      })}
    </nav>
  )
}

function AdminLayout() {
  const { logout, userProfile } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50" data-testid="admin-layout">
      {/* ── Sidebar desktop ──────────────────────────────────────────────────── */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-blue-900 shadow-xl lg:flex"
        aria-label="Barre latérale"
      >
        <div className="flex h-16 flex-shrink-0 items-center gap-3 px-5 border-b border-blue-800">
          <div>
            <p className="text-lg font-bold text-white leading-none">AKAYIS</p>
            <p className="text-[11px] text-blue-300 leading-none mt-0.5">Administration</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav onClose={() => {}} />
        </div>
        <div className="flex-shrink-0 border-t border-blue-800 px-3 py-3">
          {userProfile?.name && (
            <p className="mb-2 truncate px-3 text-xs text-blue-300">{userProfile.name}</p>
          )}
          <button
            onClick={logout}
            className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* ── Sidebar mobile (overlay) ─────────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-64 flex flex-col bg-blue-900 shadow-xl">
            <div className="flex h-16 flex-shrink-0 items-center justify-between px-5 border-b border-blue-800">
              <p className="text-lg font-bold text-white">AKAYIS Admin</p>
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded p-1 text-blue-200 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                aria-label="Fermer le menu"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarNav onClose={() => setSidebarOpen(false)} />
            </div>
            <div className="flex-shrink-0 border-t border-blue-800 px-3 py-3">
              {userProfile?.name && (
                <p className="mb-2 truncate px-3 text-xs text-blue-300">{userProfile.name}</p>
              )}
              <button
                onClick={logout}
                className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                Se déconnecter
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Header mobile ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 shadow-sm lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Ouvrir le menu"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <p className="font-bold text-blue-900">AKAYIS Admin</p>
      </header>

      {/* ── Contenu principal ─────────────────────────────────────────────────── */}
      <div className="lg:pl-60">
        <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
