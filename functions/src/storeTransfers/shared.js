/**
 * Helpers purs des transferts boutique → dealer (retours de stock / liquidité).
 *
 * Sémantique métier :
 *   Une boutique renvoie UNE ressource (stock OU liquidité) au dealer.
 *   Sens unique : le solde boutique baisse à la création, le solde dealer monte
 *   à la confirmation. Un rejet restaure le solde boutique.
 *
 * Aucune dépendance externe (testables directement). Les validations échouées
 * lancent DealerRequestError (jamais HttpsError).
 */

import { DealerRequestError } from '../errors.js'

export const TRANSFER_TYPES = new Set(['return_stock', 'return_liquidity'])
export const TRANSFER_NETWORK = 'Orange'

// ── Type de transfert → champ de solde ──────────────────────────────────────
export function validateTransferType(transferType) {
  if (typeof transferType !== 'string' || !TRANSFER_TYPES.has(transferType)) {
    throw new DealerRequestError('INVALID_TRANSFER_TYPE', 'Type de transfert invalide.')
  }
  return transferType
}

// Note orthographique : le champ Firestore est "liquidite" (sans accent).
export function transferBalanceField(transferType) {
  return transferType === 'return_stock' ? 'stock' : 'liquidite'
}

// ── Ressource d'inventaire dealer (approvisionnement) ────────────────────────
export const INVENTORY_RESOURCES = new Set(['stock', 'liquidite'])
export function validateInventoryResource(resource) {
  if (typeof resource !== 'string' || !INVENTORY_RESOURCES.has(resource)) {
    throw new DealerRequestError('INVALID_INVENTORY_RESOURCE', 'Ressource invalide (stock ou liquidite).')
  }
  return resource
}

// ── Montant (entier strictement positif, chiffres uniquement côté client) ────
export function validateTransferAmount(amount) {
  if (typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount <= 0) {
    throw new DealerRequestError('INVALID_TRANSFER_AMOUNT', 'Montant invalide : entier strictement positif requis.')
  }
  return amount
}

export function validateTransferId(transferId) {
  if (!transferId || typeof transferId !== 'string' || transferId.trim() === '') {
    throw new DealerRequestError('INVALID_TRANSFER_ID', 'Identifiant de transfert requis.')
  }
  return transferId.trim()
}

// ── Profil dealer (actif, role dealer) ───────────────────────────────────────
export function validateDealerProfile(profile) {
  if (!profile || typeof profile !== 'object') {
    throw new DealerRequestError('PROFILE_NOT_FOUND', 'Profil utilisateur introuvable.')
  }
  if (!profile.active) {
    throw new DealerRequestError('PROFILE_INACTIVE', 'Votre compte est désactivé.')
  }
  if (profile.role !== 'dealer') {
    throw new DealerRequestError('ROLE_FORBIDDEN', 'Action réservée aux dealers.')
  }
  return true
}

// ── Lecture d'un champ de solde (stock|liquidite) : entier sûr >= 0 ──────────
export function readBalanceAmount(balanceData, field) {
  if (!balanceData || typeof balanceData !== 'object') {
    throw new DealerRequestError('BALANCE_NOT_FOUND', 'Document de soldes introuvable ou invalide.')
  }
  const balances = balanceData.balances
  if (!balances || typeof balances !== 'object') {
    throw new DealerRequestError('INVALID_BALANCE_DATA', 'Structure balances manquante.')
  }
  const orange = balances.Orange
  if (!orange || typeof orange !== 'object') {
    throw new DealerRequestError('INVALID_BALANCE_DATA', 'Solde Orange manquant.')
  }
  const value = orange[field]
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new DealerRequestError('INVALID_BALANCE_DATA', `Solde Orange.${field} invalide : entier sûr non-négatif requis.`)
  }
  return value
}

// ── Solde dealer courant pour un champ : 0 si le document/solde n'existe pas ──
// À la différence des boutiques, le solde dealer peut ne pas encore exister
// (premier retour) → on part de 0. Toute valeur présente doit rester valide.
export function readDealerBalanceAmount(balanceData, field) {
  if (balanceData === undefined || balanceData === null) return 0
  if (typeof balanceData !== 'object') {
    throw new DealerRequestError('INVALID_BALANCE_DATA', 'Solde dealer invalide.')
  }
  const orange = balanceData?.balances?.Orange
  if (orange === undefined || orange === null) return 0
  if (typeof orange !== 'object') {
    throw new DealerRequestError('INVALID_BALANCE_DATA', 'Solde dealer Orange invalide.')
  }
  const value = orange[field]
  if (value === undefined || value === null) return 0
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isSafeInteger(value) || value < 0) {
    throw new DealerRequestError('INVALID_BALANCE_DATA', `Solde dealer Orange.${field} invalide.`)
  }
  return value
}

// ── Résolution du dealer unique (compte role==='dealer' actif) ───────────────
// Deux égalités sans orderBy → aucune index composite requise.
export async function resolveSingleDealer(db) {
  const snap = await db
    .collection('users')
    .where('role', '==', 'dealer')
    .where('active', '==', true)
    .limit(1)
    .get()
  if (snap.empty) {
    throw new DealerRequestError('DEALER_NOT_FOUND', 'Aucun dealer actif disponible.')
  }
  const doc = snap.docs[0]
  const data = doc.data()
  return { uid: doc.id, name: data.name ?? null, email: data.email ?? null }
}
