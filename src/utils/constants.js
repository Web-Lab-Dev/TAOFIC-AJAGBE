// Constantes réseau et codes associés
export const NETWORK_CODES = {
  'Orange': '000001',
  'Moov': '000626',
  'Telecel': '000002',
  'Coris': '000003',
  'Sank': '000004'
}

// Options réseau visibles pour ce client.
// Les autres réseaux restent dans la logique interne et peuvent être réactivés.
export const NETWORK_OPTIONS = ['Orange']

// Types de transaction
export const TRANSACTION_TYPES = [
  { value: 'Dépôt', label: 'Dépôt' },
  { value: 'Retrait', label: 'Retrait' },
  { value: 'Crédit', label: 'Crédit' }
]

// Méthodes de paiement
export const PAYMENT_METHODS = [
  'Orange Money',
  'Cash'
]

// Status des transactions
export const TRANSACTION_STATUS = {
  PENDING: 'Non Terminées',
  COMPLETED: 'Validée',
  PAID_BY: (method) => `Payé par ${method}`,
  REFUNDED_BY: (method) => `Remboursé par ${method}`
}

// Styles pour les types de transactions
export const TRANSACTION_STYLES = {
  'Retrait': {
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  'Dépôt': {
    textColor: 'text-green-600', 
    bgColor: 'bg-green-50'
  },
  'Crédit': {
    textColor: 'text-red-600',
    bgColor: 'bg-red-50'
  },
  default: {
    textColor: 'text-gray-600',
    bgColor: 'bg-gray-50'
  }
}

// Configuration pour l'export Excel
export const EXPORT_CONFIG = {
  COLUMN_WIDTHS: [
    { wch: 5 },   // N°
    { wch: 20 },  // Date & Heure  
    { wch: 25 },  // Client
    { wch: 10 },  // Type
    { wch: 15 },  // Réseau
    { wch: 10 },  // Code
    { wch: 15 },  // Montant
    { wch: 10 },  // Statut
    { wch: 25 }   // Email
  ],
  SHEET_NAME: 'Historique',
  FILE_EXTENSIONS: '.xlsx,.xls,.xlsm'
}

// Messages d'erreur et de succès
export const MESSAGES = {
  ERRORS: {
    FORM_INCOMPLETE: 'Veuillez remplir tous les champs',
    NO_EXPORT_DATA: 'Aucune transaction à exporter',
    IMPORT_ERROR: 'Erreur lors de l\'import du fichier. Vérifiez le format.',
    TRANSACTION_NOT_FOUND: 'Transaction introuvable'
  },
  SUCCESS: {
    TRANSACTION_SAVED: 'Transaction sauvée en attente',
    TRANSACTION_VALIDATED: 'Transaction validée',
    TRANSACTION_MODIFIED: 'Transaction modifiée avec succès',
    MODIFICATION_CANCELLED: 'Modification annulée',
    IMPORT_SUCCESS: (count) => `${count} transactions importées avec succès !`
  }
}

// Configuration des filtres
export const FILTER_CONFIG = {
  SEARCH_DEBOUNCE_MS: 300,
  DAYS_PER_PAGE: 7,
  DATE_FORMAT: {
    locale: 'fr-FR',
    options: {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
  }
}
