import { useState, useEffect, useContext, useCallback } from 'react'
import { firestoreService } from '../services/firestore'
import { ClientsContext } from '../context/ClientsContext'

export const useHistoriqueFiltersAdvanced = () => {
  const { clients } = useContext(ClientsContext)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeFilters, setActiveFilters] = useState({})

  // Fonction pour appliquer les filtres et écouter les changements
  const applyFilters = useCallback((filters = {}) => {
    setActiveFilters(filters)
    setLoading(true)
    setError(null)

    try {
      // Créer les options de requête Firestore basées sur les filtres
      const firestoreFilters = {}

      if (filters.dateRange) {
        firestoreFilters.dateRange = filters.dateRange
      }

      if (filters.clientId) {
        firestoreFilters.clientId = filters.clientId
      }

      // S'abonner aux changements avec les filtres appliqués
      const unsubscribe = firestoreService.subscribeToHistory(
        (historyData) => {
          let filteredData = historyData

          // Appliquer le filtrage côté client si nécessaire
          // (pour les filtres complexes non supportés par Firestore)
          if (filters.searchTerm) {
            filteredData = historyData.filter(transaction => {
              const client = clients.find(c => c.id === transaction.clientId)
              const clientName = client ? client.nom.toLowerCase() : ''
              const searchLower = filters.searchTerm.toLowerCase()

              return (
                transaction.nomAgentCommercial?.toLowerCase().includes(searchLower) ||
                clientName.includes(searchLower) ||
                transaction.type?.toLowerCase().includes(searchLower) ||
                transaction.statut?.toLowerCase().includes(searchLower)
              )
            })
          }

          setTransactions(filteredData)
          setLoading(false)
        },
        firestoreFilters
      )

      return unsubscribe
    } catch (error) {
      console.error('Erreur lors de l\'application des filtres:', error)
      setError(error.message)
      setLoading(false)
    }
  }, [clients])

  // Réinitialiser les filtres
  const clearFilters = () => {
    setActiveFilters({})
    applyFilters({})
  }

  // Initialisation - charger toutes les transactions
  useEffect(() => {
    const unsubscribe = applyFilters()

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [applyFilters])

  // Filtres prédéfinis utiles
  const getTransactionsToday = () => {
    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()

    applyFilters({
      dateRange: {
        start: startOfDay,
        end: endOfDay
      }
    })
  }

  const getTransactionsThisWeek = () => {
    const today = new Date()
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()))
    startOfWeek.setHours(0, 0, 0, 0)
    const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6))
    endOfWeek.setHours(23, 59, 59, 999)

    applyFilters({
      dateRange: {
        start: startOfWeek.toISOString(),
        end: endOfWeek.toISOString()
      }
    })
  }

  const getTransactionsThisMonth = () => {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)

    applyFilters({
      dateRange: {
        start: startOfMonth.toISOString(),
        end: endOfMonth.toISOString()
      }
    })
  }

  const getTransactionsByClient = (clientId) => {
    applyFilters({
      clientId: clientId
    })
  }

  // Recherche en temps réel
  const searchTransactions = (searchTerm) => {
    applyFilters({
      ...activeFilters,
      searchTerm: searchTerm
    })
  }

  return {
    // Données
    transactions,
    loading,
    error,
    activeFilters,

    // Actions
    applyFilters,
    clearFilters,
    searchTransactions,

    // Filtres prédéfinis
    getTransactionsToday,
    getTransactionsThisWeek,
    getTransactionsThisMonth,
    getTransactionsByClient,

    // Statistiques utiles
    totalTransactions: transactions.length,
    totalAmount: transactions.reduce((sum, t) => sum + (parseFloat(t.montant) || 0), 0)
  }
}
