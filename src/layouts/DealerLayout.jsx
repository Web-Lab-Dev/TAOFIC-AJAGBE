import { useState, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { DEALER_NAV_ITEMS } from '../constants/navigation'
import { subscribeDealerPendingCount } from '../services/dealerService'

function PendingBadge({ count }) {
  if (!count) return null
  return (
    <span
      className="ml-1.5 inline-flex items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none min-w-[1.2rem]"
      aria-label={`${count} demande${count > 1 ? 's' : ''} en attente`}
      data-testid="dealer-pending-badge"
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

function DealerLayout() {
  const { logout, userProfile, currentUser } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    setPendingCount(0)
    const unsub = subscribeDealerPendingCount({
      currentUser,
      userProfile,
      onUpdate: setPendingCount,
    })
    return unsub
  }, [currentUser, userProfile])

  return (
    <div className="min-h-screen bg-gray-100" data-testid="dealer-layout">
      {/* Header */}
      <header className="bg-green-900 text-white shadow-md">
        <div className="w-full px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">AKAYIS</h1>
            <p className="text-sm text-green-200">Espace Dealer</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {userProfile?.name && (
              <span className="text-sm text-green-200 hidden sm:inline">{userProfile.name}</span>
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
      <nav className="bg-green-800 text-white shadow" data-testid="dealer-nav">
        <div className="w-full px-2 overflow-x-auto">
          <div className="flex min-w-max space-x-1">
            {DEALER_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dealer'}
                className={({ isActive }) =>
                  `px-4 py-3 text-white font-medium transition-colors duration-200 hover:bg-black/20 whitespace-nowrap inline-flex items-center ${
                    isActive ? 'bg-black/30 border-b-2 border-white/50' : ''
                  }`
                }
              >
                {item.name}
                {item.path === '/dealer/requests' && (
                  <PendingBadge count={pendingCount} />
                )}
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

export default DealerLayout
