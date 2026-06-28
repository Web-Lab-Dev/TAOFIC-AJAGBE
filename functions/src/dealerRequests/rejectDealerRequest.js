/**
 * Handler de rejet d'une demande Dealer.
 *
 * Design :
 *   - Aucune modification de solde lors d'un rejet.
 *   - Le motif de rejet est obligatoire, normalisé (trim) et validé (3–500 chars).
 *   - db et FieldValue sont injectés en paramètre (testabilité sans emulateur Functions).
 *   - Toutes les erreurs métier lancent DealerRequestError ; index.js les convertit en HttpsError.
 *   - Une prévalidation rapide du profil hors transaction retourne une erreur tôt.
 *   - La validation autoritative du profil est répétée dans la transaction : si le profil
 *     change entre la prévalidation et le commit (active, role, storeId), la transaction
 *     est rejetée avec l'erreur appropriée.
 */

import { DealerRequestError } from '../errors.js'
import {
  validateAuthUid,
  validateInputPayload,
  validateRequestId,
  validateRejectionReason,
  validateRequestData,
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

export async function rejectDealerRequestHandler(request, { db, FieldValue }) {
  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const actorUid = validateAuthUid(request.auth?.uid)

  // ── 2. Validation de la forme du payload ───────────────────────────────────
  const payload = validateInputPayload(request.data, ['requestId', 'rejectionReason'])

  // ── 3. Validation des entrées ──────────────────────────────────────────────
  const requestId       = validateRequestId(payload.requestId)
  const rejectionReason = validateRejectionReason(payload.rejectionReason)

  // ── 4. Prévalidation rapide du profil acteur (retour d'erreur anticipé) ───
  const profileSnap = await db.doc(`users/${actorUid}`).get()
  if (!profileSnap.exists) {
    throw new DealerRequestError('PROFILE_NOT_FOUND', 'Profil utilisateur introuvable.')
  }
  validateProfileData(profileSnap.data())

  // ── 5. Transaction atomique ────────────────────────────────────────────────
  //   La validation du profil est RÉPÉTÉE dans la transaction (autoritative).
  //   Si active, role ou storeId changent entre la prévalidation et le commit,
  //   la transaction est rejetée avec l'erreur appropriée.
  try {
    await db.runTransaction(async (t) => {
      // Relecture authoritative du profil
      const profileRef    = db.doc(`users/${actorUid}`)
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

      const now = FieldValue.serverTimestamp()

      // Mise à jour de la demande (pas de changement de solde)
      t.update(reqRef, {
        status:          'rejected',
        updatedAt:       now,
        rejectedBy:      actorUid,
        rejectedAt:      now,
        rejectionReason,
        confirmedBy:     null,
        confirmedAt:     null,
        previousBalance: null,
        newBalance:      null,
      })

      // Piste d'audit dans clients/{storeId}/auditLogs
      const auditRef = db.collection(`clients/${actorStoreId}/auditLogs`).doc()
      t.set(auditRef, buildAuditEntry({
        action:          'DEALER_REQUEST_REJECTED',
        actorUid,
        actorEmail:      txProfile.email  ?? null,
        actorName:       txProfile.name   ?? null,
        actorRole:       'store_admin',
        actorStoreId,
        requestId,
        reqData,
        previousBalance: null,
        newBalance:      null,
        rejectionReason,
        createdAt:       now,
      }))
    })
  } catch (err) {
    if (err instanceof DealerRequestError) throw err
    throw new DealerRequestError('TRANSACTION_FAILED', 'La transaction a échoué. Veuillez réessayer.')
  }

  return { success: true, requestId }
}
