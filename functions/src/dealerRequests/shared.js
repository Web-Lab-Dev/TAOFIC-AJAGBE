/**
 * Helpers purs — aucune dépendance externe.
 * Utilisés par les handlers et testés directement en TC-034.
 *
 * Conventions :
 *   - Les fonctions de validation ne retournent rien ou retournent la valeur normalisée.
 *   - Toute validation échouée lance DealerRequestError (jamais HttpsError).
 *   - readCurrentBalance accepte la donnée brute du document (pas le snapshot).
 *   - buildAuditEntry retourne un objet plain JS (createdAt passé en paramètre).
 */

import { DealerRequestError } from '../errors.js'

const VALID_REQUEST_TYPES = new Set(['stock_add', 'liquidity_add'])
const VALID_NETWORKS = new Set(['Orange'])

// ---------------------------------------------------------------------------
// Validation de l'identité Firebase
// ---------------------------------------------------------------------------

// Les UID Firebase Auth ne contiennent pas d'espaces.
// On refuse toute valeur où uid !== uid.trim() pour bloquer les tentatives d'injection.
export function validateAuthUid(uid) {
  if (
    typeof uid !== 'string' ||
    uid.trim().length === 0 ||
    uid !== uid.trim()
  ) {
    throw new DealerRequestError('UNAUTHENTICATED', 'Vous devez être connecté.')
  }
  return uid
}

// ---------------------------------------------------------------------------
// Validation de la forme du payload (liste blanche de clés)
// ---------------------------------------------------------------------------

// Refuse toute clé hors de allowedKeys pour prévenir l'injection de données
// côté client (actorStoreId, amount, confirmedBy, etc.).
// Exige que le payload soit un objet JSON simple (Object.prototype) pour bloquer
// les attaques par prototype (Object.create, instances de classe, null-prototype).
// Utilise Reflect.ownKeys pour inclure les symboles et la clé __proto__ propre.
// Les clés manquantes sont validées individuellement par les fonctions de champ.
// Retourne data pour permettre la lecture des propriétés propres validées.
export function validateInputPayload(data, allowedKeys) {
  if (
    data === null ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    Object.getPrototypeOf(data) !== Object.prototype
  ) {
    throw new DealerRequestError('INVALID_REQUEST_ID', 'Format de données invalide.')
  }

  const ownKeys = Reflect.ownKeys(data)

  if (ownKeys.some((key) => typeof key !== 'string')) {
    throw new DealerRequestError('INVALID_REQUEST_ID', 'Format de données invalide.')
  }

  const allowed = new Set(allowedKeys)
  if (ownKeys.some((key) => !allowed.has(key))) {
    throw new DealerRequestError(
      'INVALID_REQUEST_ID',
      'Le payload contient des champs non autorisés.'
    )
  }

  return data
}

// ---------------------------------------------------------------------------
// Validation des entrées
// ---------------------------------------------------------------------------

export function validateRequestId(requestId) {
  if (!requestId || typeof requestId !== 'string' || requestId.trim() === '') {
    throw new DealerRequestError('INVALID_REQUEST_ID', 'Identifiant de demande requis.')
  }
  return requestId.trim()
}

export function validateRejectionReason(reason) {
  if (reason == null || typeof reason !== 'string') {
    throw new DealerRequestError(
      'INVALID_REJECTION_REASON',
      'Motif de rejet requis et doit être une chaîne de caractères.'
    )
  }
  const normalized = reason.trim()
  if (normalized.length < 3) {
    throw new DealerRequestError('INVALID_REJECTION_REASON', 'Motif de rejet trop court (3 caractères minimum).')
  }
  if (normalized.length > 500) {
    throw new DealerRequestError('INVALID_REJECTION_REASON', 'Motif de rejet trop long (500 caractères maximum).')
  }
  return normalized
}

// ---------------------------------------------------------------------------
// Validation des données de la demande (état pending propre)
// ---------------------------------------------------------------------------

export function validateRequestData(reqData, actorStoreId) {
  if (!reqData || typeof reqData !== 'object') {
    throw new DealerRequestError('INVALID_REQUEST_DATA', 'Données de la demande invalides.')
  }
  if (reqData.status !== 'pending') {
    throw new DealerRequestError('REQUEST_NOT_PENDING', 'Cette demande a déjà été traitée ou n\'est pas en attente.')
  }
  if (reqData.targetStoreId !== actorStoreId) {
    throw new DealerRequestError('REQUEST_STORE_MISMATCH', 'Cette demande ne cible pas votre boutique.')
  }
  if (!VALID_REQUEST_TYPES.has(reqData.requestType)) {
    throw new DealerRequestError('INVALID_REQUEST_DATA', 'Type de demande non reconnu.')
  }
  if (!VALID_NETWORKS.has(reqData.network)) {
    throw new DealerRequestError('INVALID_REQUEST_DATA', 'Réseau non reconnu.')
  }
  if (!Number.isSafeInteger(reqData.amount) || reqData.amount <= 0) {
    throw new DealerRequestError('INVALID_REQUEST_DATA', 'Montant invalide : entier positif sûr requis.')
  }
  // Vérifie que les champs de réponse sont null (demande propre en attente)
  const responseFields = [
    'confirmedBy', 'confirmedAt',
    'rejectedBy', 'rejectedAt', 'rejectionReason',
    'previousBalance', 'newBalance',
  ]
  for (const field of responseFields) {
    if (reqData[field] != null) {
      throw new DealerRequestError(
        'INVALID_REQUEST_DATA',
        `Demande corrompue : champ "${field}" non nul sur une demande pending.`
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Lecture du solde courant depuis les données brutes du document
// ---------------------------------------------------------------------------

export function readCurrentBalance(balanceData, requestType) {
  if (!balanceData || typeof balanceData !== 'object') {
    throw new DealerRequestError('BALANCE_NOT_FOUND', 'Document de soldes introuvable ou invalide.')
  }
  const balances = balanceData.balances
  if (!balances || typeof balances !== 'object') {
    throw new DealerRequestError('INVALID_BALANCE_DATA', 'Structure balances manquante dans le document de soldes.')
  }
  const orange = balances.Orange
  if (!orange || typeof orange !== 'object') {
    throw new DealerRequestError('INVALID_BALANCE_DATA', 'Solde Orange manquant dans le document de soldes.')
  }
  const field = getBalanceField(requestType)
  const value = orange[field]
  // Number.isSafeInteger rejette les décimaux (100.5), Infinity, NaN, et les
  // entiers hors plage ±2^53. On rejette aussi les négatifs.
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new DealerRequestError(
      'INVALID_BALANCE_DATA',
      `Solde Orange.${field} invalide : entier sûr non-négatif requis.`
    )
  }
  return value
}

// ---------------------------------------------------------------------------
// Nom du champ balance selon le type de demande
// ---------------------------------------------------------------------------

export function getBalanceField(requestType) {
  // Note orthographique : le champ Firestore est "liquidite" (sans accent)
  return requestType === 'stock_add' ? 'stock' : 'liquidite'
}

// ---------------------------------------------------------------------------
// Construction de l'entrée d'audit
// ---------------------------------------------------------------------------

export function buildAuditEntry({
  action,
  actorUid,
  actorEmail,
  actorName,
  actorRole,
  actorStoreId,
  requestId,
  reqData,
  previousBalance,
  newBalance,
  rejectionReason,
  createdAt,
}) {
  return {
    action,
    actorUid,
    actorEmail:      actorEmail      ?? null,
    actorName:       actorName       ?? null,
    actorRole,
    actorStoreId,
    requestId,
    dealerUid:       reqData.dealerUid   ?? null,
    dealerName:      reqData.dealerName  ?? null,
    targetStoreId:   reqData.targetStoreId,
    requestType:     reqData.requestType,
    network:         reqData.network,
    amount:          reqData.amount,
    previousBalance: previousBalance  ?? null,
    newBalance:      newBalance       ?? null,
    rejectionReason: rejectionReason  ?? null,
    createdAt,
  }
}
