import { useNetworkCards } from './useNetworkCards'

/**
 * Hook de compatibilité pour maintenir l'interface existante
 *
 * SIMPLIFIÉ: Redirige vers useNetworkCards
 * Plus de logique complexe de transactions !
 */
export const useSimpleNetworkData = () => {
  const { cardsData, getStock, getLiquidite, formatAmount } = useNetworkCards()

  // Interface de compatibilité pour le formulaire
  const validateAmount = (network, amount, transactionType) => {
    const numericAmount = parseFloat(amount) || 0

    if (numericAmount <= 0) {
      return {
        isValid: false,
        message: 'Le montant doit être supérieur à 0'
      }
    }

    // Pour les dépôts et crédits, vérifier le stock disponible
    if (transactionType === 'Dépôt' || transactionType === 'Crédit') {
      const networkStock = getStock(network)

      if (numericAmount > networkStock) {
        return {
          isValid: false,
          message: `Stock insuffisant pour ${network}. Disponible: ${formatAmount(networkStock)} FCFA`
        }
      }
    }

    return {
      isValid: true,
      message: ''
    }
  }

  const getFormattedStock = (network) => {
    return formatAmount(getStock(network))
  }

  return {
    networkData: cardsData,
    validateAmount,
    getStock,
    getLiquidite,
    getFormattedStock
  }
}