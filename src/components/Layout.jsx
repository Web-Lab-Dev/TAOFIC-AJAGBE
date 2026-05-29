import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import NavBar from './NavBar'
import NetworkCardsDrawer from './network/NetworkCardsDrawer'
import Chatbot from './chatbot/Chatbot'

function Layout({ children }) {
  const { themeClasses, backgroundImage } = useTheme()
  const [navbarHeight, setNavbarHeight] = useState(0)
  const [networkCardsHeight, setNetworkCardsHeight] = useState(0)
  const [isNavbarSticky, setIsNavbarSticky] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const headerHeight = 200

      setIsNavbarSticky(scrollTop >= headerHeight)
    }

    // Mesurer la hauteur de la navbar et des cartes réseau
    const navbar = document.querySelector('nav')
    const networkCards = document.querySelector('[data-network-cards]')

    if (navbar) {
      setNavbarHeight(navbar.offsetHeight)
    }

    if (networkCards) {
      setNetworkCardsHeight(networkCards.offsetHeight)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className={`min-h-screen ${themeClasses.background}`}>
      {/* Header avec titre */}
      <header
        className="relative text-white w-full overflow-hidden"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          minHeight: '200px'
        }}
      >
        {/* Overlay pour garder la visibilité */}
        <div className="absolute inset-0 bg-black/20"></div>

        {/* Contenu du header */}
        <div className="relative z-10 w-full px-4 py-12 flex items-center justify-center">
          <h1
            className="text-4xl font-bold text-center text-white"
            style={{
              textShadow: '0 3px 12px rgba(0, 0, 0, 0.8), 0 2px 6px rgba(0, 0, 0, 0.6)'
            }}
          >
            Moalim Telecom
          </h1>
        </div>
      </header>

      {/* Navigation */}
      <NavBar />

      {/* Rideau des cartes réseau */}
      <NetworkCardsDrawer />

      {/* Contenu principal avec padding top conditionnel */}
      <main
        className="w-full px-4 py-6 transition-all duration-300"
        style={{
          paddingTop: isNavbarSticky ? `${navbarHeight + networkCardsHeight + 24}px` : '24px'
        }}
      >
        <div className="relative">
          {/* Arrière-plan thématique avec overlay */}
          <div
            className="fixed inset-0 -z-10 opacity-5"
            style={{
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundAttachment: 'fixed'
            }}
          />
          {children}
        </div>
      </main>

      {/* Chatbot flottant */}
      <Chatbot />
    </div>
  )
}

export default Layout