import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { getTransactionStyles, getAvailableActions } from '../utils/helpers.js'
import { STORAGE_KEYS } from '../constants/index.js'
import { firestoreService } from '../services/firestore'
import { AuthContext } from './AuthContext'

const TransactionsContext = createContext()

export const useTransactions = () => {
  const context = useContext(TransactionsContext)
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionsProvider')
  }
  return context
}

export const TransactionsProvider = ({ children }) => {
  const { currentUser: user, loading: authLoading } = useContext(AuthContext)

  // États pour les deux collections Firestore
  const [pendingTransactions, setPendingTransactions] = useState([])
  const [completedTransactions, setCompletedTransactions] = useState([])
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Synchronisation temps réel avec Firestore pour les deux collections - seulement si authentifié
  useEffect(() => {
    // Ne pas initialiser si l'auth est encore en cours de chargement
    if (authLoading) {
      return
    }

    // Si pas d'utilisateur connecté, ne pas essayer de charger depuis Firestore
    if (!user) {
      setPendingTransactions([])
      setCompletedTransactions([])
      setLoading(false)
      return
    }

    let isMounted = true
    let unsubscribeDrafts, unsubscribeHistory

    const initializeTransactions = async () => {
      try {
        setLoading(true)
        setError(null)

        // Vérifier s'il y a des données localStorage à migrer
        const pendingData = localStorage.getItem(STORAGE_KEYS.PENDING_TRANSACTIONS)
        const completedData = localStorage.getItem(STORAGE_KEYS.COMPLETED_TRANSACTIONS)

        if (pendingData || completedData) {
          const pendingTx = pendingData ? JSON.parse(pendingData) : []
          const completedTx = completedData ? JSON.parse(completedData) : []

          if (pendingTx.length > 0 || completedTx.length > 0) {
            await firestoreService.migrateLocalStorageData({
              pendingTransactions: pendingTx,
              completedTransactions: completedTx
            })
            localStorage.removeItem(STORAGE_KEYS.PENDING_TRANSACTIONS)
            localStorage.removeItem(STORAGE_KEYS.COMPLETED_TRANSACTIONS)
          }
        }

        // Écouter les drafts (transactions non terminées)
        unsubscribeDrafts = firestoreService.subscribeToDrafts((draftsData) => {
          if (isMounted) {
            // Déduplication des drafts
            const uniqueDrafts = draftsData.filter((draft, index, array) =>
              array.findIndex(d => d.id === draft.id) === index
            )
            setPendingTransactions(uniqueDrafts)
          }
        })

        // Écouter l'historique (transactions terminées)
        unsubscribeHistory = firestoreService.subscribeToHistory((historyData) => {
          if (isMounted) {
            // Déduplication de l'historique
            const uniqueHistory = historyData.filter((history, index, array) =>
              array.findIndex(h => h.id === history.id) === index
            )
            setCompletedTransactions(uniqueHistory)
          }
        })

        if (isMounted) {
          setLoading(false)
        }
      } catch (error) {
        console.error('Erreur lors de l\'initialisation des transactions:', error)
        if (isMounted) {
          setError(error.message)
          setLoading(false)
          // Fallback vers localStorage en cas d'erreur
          try {
            const savedPending = localStorage.getItem(STORAGE_KEYS.PENDING_TRANSACTIONS)
            const savedCompleted = localStorage.getItem(STORAGE_KEYS.COMPLETED_TRANSACTIONS)
            setPendingTransactions(savedPending ? JSON.parse(savedPending) : [])
            setCompletedTransactions(savedCompleted ? JSON.parse(savedCompleted) : [])
          } catch {
            setPendingTransactions([])
            setCompletedTransactions([])
          }
        }
      }
    }

    initializeTransactions()

    return () => {
      isMounted = false
      if (unsubscribeDrafts && typeof unsubscribeDrafts === 'function') {
        unsubscribeDrafts()
      }
      if (unsubscribeHistory && typeof unsubscribeHistory === 'function') {
        unsubscribeHistory()
      }
    }
  }, [user, authLoading])

  const addTransaction = useCallback(async (transactionData) => {
    try {
      setError(null)
      const transaction = {
        ...transactionData,
        statut: transactionData.statut || 'Non Terminées',
        userEmail: user?.email || 'Utilisateur inconnu' // Ajouter l'email de l'utilisateur connecté
      }

      if (transaction.statut === 'Non Terminées') {
        await firestoreService.addDraft(transaction)
      } else {
        await firestoreService.addToHistory(transaction)
      }
      // La mise à jour de l'état se fera automatiquement via onSnapshot
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la transaction:', error)
      setError(error.message)
      throw error
    }
  }, [user])

  const updateTransaction = useCallback(async (id, updates) => {
    try {
      setError(null)
      await firestoreService.updateDraft(id, updates)
      // La mise à jour de l'état se fera automatiquement via onSnapshot
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la transaction:', error)
      setError(error.message)
      throw error
    }
  }, [])

  const validateTransaction = useCallback(async (id, customStatus = 'Validée', selectedPaymentMethod = null) => {
    try {
      setError(null)

      const success = await firestoreService.validateTransaction(id, customStatus, selectedPaymentMethod)
      if (!success) {
        console.warn(`Transaction ${id} n'a pas pu être validée (probablement déjà supprimée)`)
        return false
      }

      // L'impact des transactions validées avec méthode de paiement est maintenant géré
      // DIRECTEMENT par les boutons dans TransactionTable.jsx
      // Plus besoin de logique d'impact ici !

      return true
    } catch (error) {
      console.error('Erreur lors de la validation de la transaction:', error)
      setError(error.message)
      throw error
    }
  }, [])

  const deleteTransaction = useCallback(async (id) => {
    try {
      setError(null)
      // Vérifier d'abord si c'est dans les drafts ou l'historique
      const isDraft = pendingTransactions.some(t => t.id === id)

      if (isDraft) {
        await firestoreService.deleteDraft(id)
      } else {
        await firestoreService.deleteFromHistory(id)
      }
      // La mise à jour de l'état se fera automatiquement via onSnapshot
    } catch (error) {
      console.error('Erreur lors de la suppression de la transaction:', error)
      setError(error.message)
      throw error
    }
  }, [pendingTransactions])

  const startEditTransaction = useCallback((transaction) => {
    setEditingTransaction(transaction)
  }, [])

  const clearEditTransaction = useCallback(() => {
    setEditingTransaction(null)
  }, [])

  const getActionButtons = useCallback((transaction) => {
    return getAvailableActions(transaction.type)
  }, [])

  const getTransactionStylesFunc = useCallback((type) => {
    return getTransactionStyles(type)
  }, [])

  const value = {
    pendingTransactions,
    completedTransactions,
    editingTransaction,
    loading,
    error,
    addTransaction,
    updateTransaction,
    validateTransaction,
    deleteTransaction,
    startEditTransaction,
    clearEditTransaction,
    getActionButtons,
    getTransactionStyles: getTransactionStylesFunc
  }

  return (
    <TransactionsContext.Provider value={value}>
      {children}
    </TransactionsContext.Provider>
  )
}
