import { useState, useRef, useEffect, useMemo, memo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTransactions } from '../../context/transactions.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import { useNetworkCards } from '../../hooks/useNetworkCards'
import { PAYMENT_METHODS } from '../../utils/constants.js'
import { getClientName, formatTime } from '../../utils/helpers.js'
import { TransactionRowSkeleton } from '../ui/LoadingSkeleton.jsx'
import OptimisticToast from '../ui/OptimisticToast.jsx'
import logger from '../../utils/logger.js'

const TransactionTable = memo(function TransactionTable() {
  const { pendingTransactions, getActionButtons, getTransactionStyles, validateTransaction, startEditTransaction, loading } = useTransactions()
  const { themeClasses } = useTheme()
  const { addToStock, addToLiquidity } = useNetworkCards()

  // Déduplicateur pour éviter les erreurs de clés React
  const uniquePendingTransactions = useMemo(() => {
    const seen = new Set()
    return (pendingTransactions || []).filter(transaction => {
      if (seen.has(transaction.id)) {
        return false
      }
      seen.add(transaction.id)
      return true
    })
  }, [pendingTransactions])
  const [activeDropdown, setActiveDropdown] = useState(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const [currentActionType, setCurrentActionType] = useState(null)
  const [processingActions, setProcessingActions] = useState(new Set())
  const [rollbackToast, setRollbackToast] = useState({ show: false, message: '', type: 'info' })
  const _buttonRefs = useRef({})


  const handleActionClick = useCallback((transactionId, actionType, event) => {
    if (actionType === 'modifier') {
      const transaction = pendingTransactions.find(t => t.id === transactionId)
      if (transaction) {
        startEditTransaction(transaction)
        // Scroll vers le haut du formulaire
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } else if (actionType === 'payerPar' || actionType === 'rembourser' || actionType === 'encaisser') {
      if (activeDropdown === transactionId) {
        setActiveDropdown(null)
        setCurrentActionType(null)
      } else {
        const button = event.currentTarget
        const rect = button.getBoundingClientRect()
        const position = {
          top: rect.bottom + window.scrollY + 8,
          left: rect.left + window.scrollX - 50
        }
        setDropdownPosition(position)
        setActiveDropdown(transactionId)
        setCurrentActionType(actionType)
      }
    }
  }, [pendingTransactions, startEditTransaction, activeDropdown, setActiveDropdown, setCurrentActionType, setDropdownPosition])

  const handlePaymentMethodSelect = useCallback(async (transactionId, method, actionType) => {
    // Vérifier si cette action est déjà en cours de traitement
    const actionKey = `${transactionId}-${actionType}-${method}`
    if (processingActions.has(actionKey)) return

    // Marquer l'action comme en cours de traitement
    setProcessingActions(prev => new Set(prev).add(actionKey))

    try {
      // Trouver la transaction pour récupérer les données
      const transaction = pendingTransactions.find(t => t.id === transactionId)
      if (!transaction) return

      // Mapping des méthodes de paiement vers les réseaux
      const networkMapping = {
        'Orange Money': 'Orange',
        'Moov Money': 'Moov',
        'Sank Money': 'Sank',
        'Coris Money': 'Coris',
        'Telecel Money': 'Telecel',
        'Cash': 'Cash' // Cash reste Cash
      }

      const targetNetwork = networkMapping[method] || method
      const amount = parseFloat(transaction.montant) || 0

      // === OPTIMISTIC UPDATE : APPLIQUER IMMÉDIATEMENT ===
      // Mettre à jour les cartes réseau instantanément
      if (targetNetwork === 'Cash') {
        addToLiquidity(amount)
      } else {
        addToStock(targetNetwork, amount)
      }

      // Fermer le dropdown immédiatement pour feedback instantané
      setActiveDropdown(null)
      setCurrentActionType(null)

      // Déterminer le statut basé sur l'action et la méthode
      let statusText
      if (actionType === 'payerPar') {
        statusText = `Payé par ${method}`
      } else if (actionType === 'rembourser') {
        statusText = `Remboursé par ${method}`
      } else if (actionType === 'encaisser') {
        statusText = `Encaissé par ${method}`
      } else {
        statusText = 'Validée'
      }

      // === SYNCHRONISATION FIRESTORE EN ARRIÈRE-PLAN ===
      // Valider la transaction dans Firestore (non-bloquant pour l'UI)
      validateTransaction(transactionId, statusText, method).then(success => {
        if (!success) {
          throw new Error('La transaction n’a pas pu être déplacée vers l’historique')
        }
      }).catch(error => {
        // En cas d'erreur Firestore, rollback des cartes réseau
        logger.user.error('Transaction validation failed, rolling back', error)

        // Rollback : annuler les changements des cartes
        if (targetNetwork === 'Cash') {
          addToLiquidity(-amount) // Retirer ce qui a été ajouté
        } else {
          addToStock(targetNetwork, -amount) // Retirer ce qui a été ajouté
        }

        // Afficher notification de rollback
        setRollbackToast({
          show: true,
          message: `Erreur de synchronisation - Changements annulés`,
          type: 'rollback'
        })

        // Auto-fermer après 4 secondes
        setTimeout(() => {
          setRollbackToast({ show: false, message: '', type: 'info' })
        }, 4000)
      })

    } catch (error) {
      logger.user.error('Transaction validation', error)

      // En cas d'erreur, rollback immédiat
      const transaction = pendingTransactions.find(t => t.id === transactionId)
      if (transaction) {
        const networkMapping = {
          'Orange Money': 'Orange',
          'Moov Money': 'Moov',
          'Sank Money': 'Sank',
          'Coris Money': 'Coris',
          'Telecel Money': 'Telecel',
          'Cash': 'Cash'
        }
        const targetNetwork = networkMapping[method] || method
        const amount = parseFloat(transaction.montant) || 0

        // Rollback
        if (targetNetwork === 'Cash') {
          addToLiquidity(-amount)
        } else {
          addToStock(targetNetwork, -amount)
        }
      }
    } finally {
      // Retirer l'action de la liste des actions en cours
      setProcessingActions(prev => {
        const newSet = new Set(prev)
        newSet.delete(actionKey)
        return newSet
      })
    }
  }, [processingActions, setProcessingActions, pendingTransactions, addToStock, addToLiquidity, validateTransaction, setActiveDropdown, setCurrentActionType])


  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    if (!activeDropdown) return
    
    const handleClickOutside = (event) => {
      // Ne pas fermer si on clique sur un bouton qui ouvre le dropdown
      if (event.target.closest('.dropdown-trigger')) return
      
      if (!event.target.closest('.dropdown-container')) {
        setActiveDropdown(null)
        setCurrentActionType(null)
      }
    }
    
    // Délai pour éviter la fermeture immédiate
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 100)
    
    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [activeDropdown])

  return (
    <div className="mt-8">
      <h2 className={`text-xl font-bold ${themeClasses.text} mb-4`}>
        Non Terminées
      </h2>

      <div className={`bg-white rounded-lg border ${themeClasses.tableHeader.split(' ')[1]}`}>
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full border-collapse">
            <thead>
              <tr className={themeClasses.tableHeader}>
                <th className={`border ${themeClasses.tableHeader.split(' ')[1]} px-4 py-3 text-left text-base font-medium ${themeClasses.text}`}>
                  Heure
                </th>
                <th className={`border ${themeClasses.tableHeader.split(' ')[1]} px-4 py-3 text-left text-base font-medium ${themeClasses.text}`}>
                  Client
                </th>
                <th className={`border ${themeClasses.tableHeader.split(' ')[1]} px-4 py-3 text-left text-base font-medium ${themeClasses.text}`}>
                  Type
                </th>
                <th className={`border ${themeClasses.tableHeader.split(' ')[1]} px-4 py-3 text-left text-base font-medium ${themeClasses.text}`}>
                  Réseau
                </th>
                <th className={`border ${themeClasses.tableHeader.split(' ')[1]} px-4 py-3 text-left text-base font-medium ${themeClasses.text}`}>
                  Montant
                </th>
                <th className={`border ${themeClasses.tableHeader.split(' ')[1]} px-4 py-3 text-center text-base font-medium ${themeClasses.text}`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // Afficher des squelettes pendant le chargement
                Array.from({ length: 3 }).map((_, index) => (
                  <TransactionRowSkeleton key={`skeleton-${index}`} />
                ))
              ) : uniquePendingTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="border border-green-300 px-4 py-8 text-center text-gray-500">
                    Aucune transaction en attente
                  </td>
                </tr>
              ) : (
                uniquePendingTransactions.map((transaction) => {
                  const actions = getActionButtons(transaction)
                  const styles = getTransactionStyles(transaction.type)
                  
                  return (
                    <tr 
                      key={transaction.id}
                      className={`${styles.bgColor}`}
                    >
                      <td className={`border border-green-300 px-4 py-3 text-base ${styles.textColor}`}>
                        {formatTime(transaction.date)}
                      </td>
                      <td className={`border border-green-300 px-4 py-3 text-base font-medium ${styles.textColor}`}>
                        {getClientName(transaction.client)}
                      </td>
                      <td className={`border border-green-300 px-4 py-3 text-base font-medium ${styles.textColor}`}>
                        {transaction.type}
                      </td>
                      <td className={`border border-green-300 px-4 py-3 text-base ${styles.textColor}`}>
                        {transaction.reseau} ({transaction.code})
                      </td>
                      <td className={`border border-green-300 px-4 py-3 text-base font-medium ${styles.textColor}`}>
                        {transaction.montant.toLocaleString()} FCFA
                      </td>
                      <td className="border border-green-300 px-4 py-3 text-base">
                        <div className="flex gap-2 justify-center">
                          {actions.modifier && (
                            <button
                              onClick={(e) => handleActionClick(transaction.id, 'modifier', e)}
                              className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                            >
                              Modifier
                            </button>
                          )}

                          {actions.encaisser && (
                            <button
                              onClick={(e) => handleActionClick(transaction.id, 'encaisser', e)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors dropdown-trigger"
                            >
                              Encaisser
                            </button>
                          )}

                          {actions.payerPar && (
                            <button
                              onClick={(e) => handleActionClick(transaction.id, 'payerPar', e)}
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors dropdown-trigger"
                            >
                              Payer par
                            </button>
                          )}

                          {actions.rembourser && (
                            <button
                              onClick={(e) => handleActionClick(transaction.id, 'rembourser', e)}
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors dropdown-trigger"
                            >
                              Rembourser
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* Dropdown modal élégant */}
      {activeDropdown && createPortal(
        <div 
          className="fixed bg-white border border-gray-300 rounded-lg shadow-lg dropdown-container"
          style={{
            top: Math.max(10, Math.min(dropdownPosition.top, window.innerHeight - 250)),
            left: Math.max(10, Math.min(dropdownPosition.left, window.innerWidth - 220)),
            zIndex: 9999,
            minWidth: '200px'
          }}
        >
          {/* En-tête du modal */}
          <div className="bg-gray-100 px-4 py-2 rounded-t-lg border-b border-gray-200">
            <p className="text-sm font-medium text-gray-700">Sélectionner méthode</p>
          </div>
          
          {/* Options de paiement */}
          <div className="py-1">
            {PAYMENT_METHODS.map((method) => {
              const actionKey = `${activeDropdown}-${currentActionType}-${method}`
              const isProcessing = processingActions.has(actionKey)

              return (
                <button
                  key={method}
                  onClick={() => handlePaymentMethodSelect(activeDropdown, method, currentActionType)}
                  disabled={isProcessing}
                  className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                    isProcessing
                      ? 'text-gray-400 cursor-not-allowed bg-gray-50'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {isProcessing ? `${method} (traitement...)` : method}
                </button>
              )
            })}
          </div>
        </div>,
        document.body
      )}

      {/* Toast pour les rollbacks */}
      <OptimisticToast
        message={rollbackToast.message}
        type={rollbackToast.type}
        isVisible={rollbackToast.show}
        onClose={() => setRollbackToast({ show: false, message: '', type: 'info' })}
        autoClose={true}
      />
    </div>
  )
})

export default TransactionTable
