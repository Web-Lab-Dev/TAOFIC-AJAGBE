import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ADMIN_NAV_ITEMS } from '../constants/navigation'

function AdminLayout() {
  const { logout, userProfile } = useAuth()

  return (
    <div className="min-h-screen bg-gray-100" data-testid="admin-layout">
      {/* Header */}
      <header className="bg-blue-900 text-white shadow-md">
        <div className="w-full px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">AKAYIS</h1>
            <p className="text-sm text-blue-200">Administration globale</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {userProfile?.name && (
              <span className="text-sm text-blue-200 hidden sm:inline">{userProfile.name}</span>
            )}
            <button
              onClick={logout}
              className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-blue-800 text-white shadow" data-testid="admin-nav">
        <div className="w-full px-2 overflow-x-auto">
          <div className="flex min-w-max space-x-1">
            {ADMIN_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/admin'}
                className={({ isActive }) =>
                  `px-4 py-3 text-white font-medium transition-colors duration-200 hover:bg-black/20 whitespace-nowrap ${
                    isActive ? 'bg-black/30 border-b-2 border-white/50' : ''
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Contenu principal */}
      <main className="w-full px-4 py-4 sm:px-6 sm:py-6">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
