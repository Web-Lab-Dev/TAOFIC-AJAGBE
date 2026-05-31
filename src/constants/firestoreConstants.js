// Configuration et constantes Firestore
export const FIRESTORE_CONFIG = {
  // Collections
  COLLECTIONS: {
    STORES: 'stores',
    USERS: 'users',
    CLIENTS: 'globalClients',
    DRAFTS: 'drafts',
    HISTORY: 'history',
    NETWORK_BALANCES: 'networkBalances',
    SESSIONS: 'sessions',
    AUDIT_LOGS: 'auditLogs'
  },

  // Limites et pagination
  LIMITS: {
    DEFAULT_PAGE_SIZE: 25,
    MAX_PAGE_SIZE: 100,
    MAX_BATCH_SIZE: 500,
    LISTENER_TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
  },

  // Cache
  CACHE: {
    TTL: 5 * 60 * 1000, // 5 minutes
    MAX_SIZE: 1000,
    INVALIDATION_PATTERNS: ['*_updated', '*_deleted', '*_created']
  },

  // Types de transactions
  TRANSACTION_TYPES: {
    DEPOT: 'Dépôt',
    RETRAIT: 'Retrait',
    CREDIT: 'Crédit'
  },

  // Statuts
  STATUS: {
    PENDING: 'Non Terminées',
    VALIDATED: 'Validée',
    REFUNDED: 'Remboursée',
    CANCELLED: 'Annulée'
  },

  // Règles de validation
  VALIDATION: {
    CLIENT: {
      NAME_MIN_LENGTH: 2,
      NAME_MAX_LENGTH: 50,
      PHONE_REGEX: /^[0-9+\-\s()]{8,15}$/,
      REQUIRED_FIELDS: ['nom', 'prenom']
    },
    TRANSACTION: {
      AMOUNT_MIN: 0.01,
      AMOUNT_MAX: 1000000,
      REQUIRED_FIELDS: ['type', 'montant', 'clientId']
    }
  },

  // Messages d'erreur
  ERRORS: {
    NETWORK: 'Erreur de connexion réseau',
    PERMISSION_DENIED: 'Permissions insuffisantes',
    NOT_FOUND: 'Document non trouvé',
    QUOTA_EXCEEDED: 'Quota dépassé',
    TIMEOUT: 'Timeout de connexion',
    INVALID_DATA: 'Données invalides'
  }
}

// Index recommandés pour les requêtes optimisées
export const FIRESTORE_INDEXES = {
  clients: [
    { fields: [{ fieldPath: 'createdAt', order: 'DESCENDING' }] },
    { fields: [{ fieldPath: 'nom', order: 'ASCENDING' }, { fieldPath: 'prenom', order: 'ASCENDING' }] },
    { fields: [{ fieldPath: 'agentCommercial', order: 'ASCENDING' }, { fieldPath: 'createdAt', order: 'DESCENDING' }] }
  ],
  drafts: [
    { fields: [{ fieldPath: 'createdAt', order: 'DESCENDING' }] },
    { fields: [{ fieldPath: 'type', order: 'ASCENDING' }, { fieldPath: 'createdAt', order: 'DESCENDING' }] },
    { fields: [{ fieldPath: 'clientId', order: 'ASCENDING' }, { fieldPath: 'createdAt', order: 'DESCENDING' }] }
  ],
  history: [
    { fields: [{ fieldPath: 'createdAt', order: 'DESCENDING' }] },
    { fields: [{ fieldPath: 'statut', order: 'ASCENDING' }, { fieldPath: 'createdAt', order: 'DESCENDING' }] },
    { fields: [{ fieldPath: 'clientId', order: 'ASCENDING' }, { fieldPath: 'createdAt', order: 'DESCENDING' }] },
    { fields: [{ fieldPath: 'type', order: 'ASCENDING' }, { fieldPath: 'statut', order: 'ASCENDING' }] }
  ]
}

// Règles de sécurité Firestore (pour référence)
export const SECURITY_RULES_TEMPLATE = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /clients/{clientId} {
      match /users/{userId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /clients/{document} {
        allow read, write: if request.auth != null;
        allow create: if request.auth != null &&
          validateClientData(request.resource.data);
      }

      match /drafts/{document} {
        allow read, write: if request.auth != null;
        allow create: if request.auth != null &&
          validateTransactionData(request.resource.data);
      }

      match /history/{document} {
        allow read: if request.auth != null;
        allow write: if request.auth != null;
      }
    }

    function validateClientData(data) {
      return data.keys().hasAll(['nom', 'prenom']) &&
             data.nom is string && data.nom.size() >= 2 &&
             data.prenom is string && data.prenom.size() >= 2 &&
             (!data.keys().hasAny(['numeroPersonnel']) ||
              data.numeroPersonnel == '' ||
              data.numeroPersonnel.matches('^[0-9+\\\\-\\\\s()]{8,15}$'));
    }

    function validateTransactionData(data) {
      return data.keys().hasAll(['type', 'montant', 'clientId']) &&
             data.type in ['Dépôt', 'Retrait', 'Crédit'] &&
             data.montant is number && data.montant > 0;
    }
  }
}
`
