import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { NAV_ITEMS } from '../constants/navigation'
import { useTheme } from '../context/ThemeContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import PWAInstallButton from './PWAInstallButton'

function NavBar() {
  const navigate = useNavigate()
  const { themeClasses } = useTheme()
  const { isStoreAdmin } = useAuth()
  const [isSticky, setIsSticky] = useState(false)
  const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || isStoreAdmin)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const headerHeight = 200 // hauteur approximative du header

      setIsSticky(scrollTop >= headerHeight)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={`${themeClasses.navbar} shadow-md w-full transition-all duration-300 z-50 ${
        isSticky
          ? 'fixed top-0 left-0 right-0 shadow-lg'
          : 'relative'
      }`}
    >
      <div className="w-full px-4">
        {/* Navigation desktop */}
        <div className="hidden md:flex justify-between items-center">
          <div className="flex-1"></div>
          <div className="flex justify-center space-x-1">
            {visibleItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `px-4 py-3 text-white font-medium transition-colors duration-200 hover:bg-black/20 ${
                    isActive ? 'bg-black/30 border-b-2 border-white/50' : ''
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </div>
          <div className="flex-1 flex justify-end">
            <PWAInstallButton />
          </div>
        </div>

        {/* Navigation mobile */}
        <div className="md:hidden">
          <select
            className={`w-full py-3 px-4 ${themeClasses.navbar} text-white border-none focus:outline-none`}
            onChange={(e) => navigate(e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>Sélectionner une page</option>
            {visibleItems.map((item) => (
              <option key={item.path} value={item.path}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </nav>
  )
}

export default NavBar
