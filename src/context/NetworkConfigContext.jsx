import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { getStorageKey } from '../config/clientIsolation'

const NetworkConfigContext = createContext()

// Configuration par défaut : STOCKS + LIQUIDITÉS par réseau
const DEFAULT_NETWORK_DATA = {
  Orange: { stock: 0, liquidite: 0 },
  Moov: { stock: 0, liquidite: 0 },
  Telecel: { stock: 0, liquidite: 0 },
  Coris: { stock: 0, liquidite: 0 },
  Sank: { stock: 0, liquidite: 0 }
}

// Clés pour localStorage
const NETWORK_DATA_STORAGE_KEY = getStorageKey('network_data_v3')

export function useNetworkConfig() {
  const context = useContext(NetworkConfigContext)
  if (!context) {
    throw new Error('useNetworkConfig must be used within a NetworkConfigProvider')
  }
  return context
}

// Charger depuis localStorage
const loadNetworkDataFromStorage = () => {
  try {
    const stored = localStorage.getItem(NETWORK_DATA_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed && typeof parsed === 'object') {
        // Fusionner avec les défauts pour ajouter de nouveaux réseaux si nécessaire
        return { ...DEFAULT_NETWORK_DATA, ...parsed }
      }
    }
  } catch (error) {
    console.warn('Erreur lors du chargement des données réseau:', error)
  }
  return { ...DEFAULT_NETWORK_DATA }
}

// Sauvegarder dans localStorage
const saveNetworkDataToStorage = (data) => {
  try {
    localStorage.setItem(NETWORK_DATA_STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.warn('Erreur lors de la sauvegarde:', error)
  }
}

export function NetworkConfigProvider({ children }) {
  const [networkData, setNetworkData] = useState(() => loadNetworkDataFromStorage())

  // Sauvegarder automatiquement
  useEffect(() => {
    saveNetworkDataToStorage(networkData)
  }, [networkData])

  // Mettre à jour un réseau (stock OU liquidité)
  const updateNetwork = useCallback((network, type, amount) => {
    setNetworkData(prev => {
      const newData = { ...prev }

      if (!newData[network]) {
        newData[network] = { stock: 0, liquidite: 0 }
      }

      newData[network] = {
        ...newData[network],
        [type]: Math.max(0, amount) // Pas de négatif
      }

      return newData
    })
  }, [])

  // Réinitialiser
  const resetToDefaults = useCallback(() => {
    setNetworkData({ ...DEFAULT_NETWORK_DATA })
    localStorage.removeItem(NETWORK_DATA_STORAGE_KEY)
  }, [])

  const value = {
    networkData,
    updateNetwork,
    resetToDefaults
  }

  return (
    <NetworkConfigContext.Provider value={value}>
      {children}
    </NetworkConfigContext.Provider>
  )
}

export { DEFAULT_NETWORK_DATA }
