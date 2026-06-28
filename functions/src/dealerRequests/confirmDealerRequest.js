/**
 * Handler de confirmation d'une demande Dealer.
 *
 * Design :
 *   - db et FieldValue sont injectés en paramètre (testabilité sans emulateur Functions).
 *   - Toutes les erreurs métier lancent DealerRequestError ; index.js les convertit en HttpsError.
 *   - Une prévalidation rapide du profil hors transaction retourne une erreur tôt.
 *   - La validation autoritative du profil est répétée dans la transaction : si le profil
 *     change entre la prévalidation et le commit (active, role, storeId), la transaction
 *     est rejetée avec l'erreur appropriée.
 *   - La transaction lit la demande ET le solde atomiquement.
 *   - La mise à jour du solde utilise le chemin pointé (balances.Orange.<field>)
 *     pour préserver les autres réseaux et champs.
 *
 * Région choisie : europe-west1 (proximité géographique Afrique de l'Ouest / FCFA).
 */

import { DealerRequestError } from '../errors.js'
import {
  validateAuthUid,
  validateInputPayload,
  validateRequestId,
  validateRequestData,
  readCurrentBalance,
  getBalanceField,
  buildAuditEntry,
} from './shared.js'

function validateProfileData(profile) {
  if (!profile.active) {
    throw new DealerRequestError('PROFILE_INACTIVE', 'Votre compte est désactivé.')
  }
  if (profile.role !== 'store_admin') {
    throw new DealerRequestError('ROLE_FORBIDDEN', 'Action réservée aux administrateurs de boutique.')
  }
  const storeId = typeof profile.storeId === 'string' ? profile.storeId.trim() : ''
  if (!storeId) {
    throw new DealerRequestError('STORE_ID_REQUIRED', 'Identifiant de boutique manquant dans votre profil.')
  }
  return storeId
}

export async function confirmDealerRequestHandler(request, { db, FieldValue }) {
  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const actorUid = validateAuthUid(request.auth?.uid)

  // ── 2. Validation de la forme du payload ───────────────────────────────────
  const payload = validateInputPayload(request.data, ['requestId'])

  // ── 3. Validation des entrées ──────────────────────────────────────────────
  const requestId = validateRequestId(payload.requestId)

  // ── 4. Prévalidation rapide du profil acteur (retour d'erreur anticipé) ───
  const profileSnap = await db.doc(`users/${actorUid}`).get()
  if (!profileSnap.exists) {
    throw new DealerRequestError('PROFILE_NOT_FOUND', 'Profil utilisateur introuvable.')
  }
  validateProfileData(profileSnap.data())

  // ── 5. Transaction atomique ────────────────────────────────────────────────
  //   La validation du profil est RÉPÉTÉE dans la transaction (autoritative).
  //   Si active, role ou storeId changent entre la prévalidation et le commit,
  //   la transaction est rejetée (ABORTED sur conflit Firestore + relecture invalide).
  let result
  try {
    result = await db.runTransaction(async (t) => {
      // Relecture authoritative du profil
      const profileRef   = db.doc(`users/${actorUid}`)
      const txProfileSnap = await t.get(profileRef)
      if (!txProfileSnap.exists) {
        throw new DealerRequestError('PROFILE_NOT_FOUND', 'Profil utilisateur introuvable.')
      }
      const txProfile    = txProfileSnap.data()
      const actorStoreId = validateProfileData(txProfile)

      const reqRef  = db.doc(`dealerRequests/${requestId}`)
      const reqSnap = await t.get(reqRef)

      if (!reqSnap.exists) {
        throw new DealerRequestError('REQUEST_NOT_FOUND', 'Demande introuvable.')
      }
      const reqData = reqSnap.data()

      // Valide : status pending, store match, type/réseau/montant propres
      validateRequestData(reqData, actorStoreId)

      // Lecture du solde dans la même transaction
      const balRef  = db.doc(`clients/${actorStoreId}/networkBalances/current`)
      const balSnap = await t.get(balRef)
      if (!balSnap.exists) {
        throw new DealerRequestError('BALANCE_NOT_FOUND', 'Document de soldes introuvable pour cette boutique.')
      }

      const previousBalance = readCurrentBalance(balSnap.data(), reqData.requestType)
      const newBalance      = previousBalance + reqData.amount

      if (!Number.isSafeInteger(newBalance)) {
        throw new DealerRequestError(
          'BALANCE_OVERFLOW',
          'Le solde résultant dépasse la limite des entiers sûrs.'
        )
      }

      const now      = FieldValue.serverTimestamp()
      const balField = getBalanceField(reqData.requestType)

      // Mise à jour de la demande
      t.update(reqRef, {
        status:          'confirmed',
        updatedAt:       now,
        confirmedBy:     actorUid,
        confirmedAt:     now,
        rejectedBy:      null,
        rejectedAt:      null,
        rejectionReason: null,
        previousBalance,
        newBalance,
      })

      // Mise à jour du solde (chemin pointé pour préserver les autres réseaux)
      t.update(balRef, {
        [`balances.Orange.${balField}`]: newBalance,
        updatedAt: now,
      })

      // Piste d'audit dans clients/{storeId}/auditLogs
      const auditRef = db.collection(`clients/${actorStoreId}/auditLogs`).doc()
      t.set(auditRef, buildAuditEntry({
        action:          'DEALER_REQUEST_CONFIRMED',
        actorUid,
        actorEmail:      txProfile.email  ?? null,
        actorName:       txProfile.name   ?? null,
        actorRole:       'store_admin',
        actorStoreId,
        requestId,
        reqData,
        previousBalance,
        newBalance,
        rejectionReason: null,
        createdAt:       now,
      }))

      return { previousBalance, newBalance }
    })
  } catch (err) {
    if (err instanceof DealerRequestError) throw err
    throw new DealerRequestError('TRANSACTION_FAILED', 'La transaction a échoué. Veuillez réessayer.')
  }

  return {
    success:         true,
    requestId,
    previousBalance: result.previousBalance,
    newBalance:      result.newBalance,
  }
}
