import { useState, useEffect, useCallback } from 'react'
import { useSimpleNetworkData } from '../../hooks/useSimpleNetworkData'
import NetworkCard from './NetworkCard'

const VISIBLE_NETWORK_CARDS = new Set(['Orange', 'Liquidite'])

function NetworkCardsDrawer() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSticky, setIsSticky] = useState(false)

  const { networkData } = useSimpleNetworkData()

  // Détecter quand la navbar devient sticky
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const headerHeight = 200 // Même valeur que dans Layout.jsx
      setIsSticky(scrollTop >= headerHeight)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleDrawer = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  return (
    <div
      data-network-cards
      className={`
        bg-white border-b border-gray-200 shadow-sm transition-all duration-300
        ${isSticky ? 'fixed top-0 left-0 right-0 z-40' : 'relative'}
      `}>
      {/* Bouton de contrôle */}
      <div className="flex justify-center items-center gap-4 py-2 bg-gray-50">
        <button
          onClick={toggleDrawer}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors duration-200"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Réduire les cartes réseau" : "Afficher les cartes réseau"}
        >
          <span>Cartes Réseau</span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

      </div>

      {/* Contenu du rideau avec animation */}
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide pb-2 justify-center">
            {/* Cartes réseau */}
            {Object.entries(networkData)
              .filter(([network]) => VISIBLE_NETWORK_CARDS.has(network))
              .map(([network, data]) => {
              return (
                <NetworkCard
                  key={network}
                  network={network}
                  stockAmount={data.stock}
                  liquiditeAmount={data.liquidite}
                />
              )
            })}
          </div>


        </div>
      </div>

      {/* Style pour masquer la scrollbar sur mobile */}
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}

export default NetworkCardsDrawer
