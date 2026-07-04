/**
 * Handler de confirmation d'un transfert boutique → dealer par le dealer.
 *
 * Sémantique (sens unique) :
 *   Le dealer confirme la réception → SON inventaire (dealerBalances) est CRÉDITÉ.
 *   Le solde boutique a déjà été débité à la création ; il ne bouge pas ici.
 *
 * db et FieldValue injectés (testabilité sans émulateur Functions).
 */

import { DealerRequestError } from '../errors.js'
import { validateAuthUid, validateInputPayload } from '../dealerRequests/shared.js'
import {
  validateTransferId,
  validateDealerProfile,
  validateTransferType,
  transferBalanceField,
  readDealerBalanceAmount,
  TRANSFER_NETWORK,
} from './shared.js'

export async function confirmStoreDealerTransferHandler(request, { db, FieldValue }) {
  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const actorUid = validateAuthUid(request.auth?.uid)

  // ── 2. Payload ─────────────────────────────────────────────────────────────
  const payload = validateInputPayload(request.data, ['transferId'])
  const transferId = validateTransferId(payload.transferId)

  // ── 3. Prévalidation profil dealer ─────────────────────────────────────────
  const profileSnap = await db.doc(`users/${actorUid}`).get()
  if (!profileSnap.exists) {
    throw new DealerRequestError('PROFILE_NOT_FOUND', 'Profil utilisateur introuvable.')
  }
  validateDealerProfile(profileSnap.data())

  // ── 4. Transaction atomique : crédit inventaire dealer ─────────────────────
  let result
  try {
    result = await db.runTransaction(async (t) => {
      const txProfileSnap = await t.get(db.doc(`users/${actorUid}`))
      if (!txProfileSnap.exists) {
        throw new DealerRequestError('PROFILE_NOT_FOUND', 'Profil utilisateur introuvable.')
      }
      const txProfile = txProfileSnap.data()
      validateDealerProfile(txProfile)

      const transferRef = db.doc(`storeDealerTransfers/${transferId}`)
      const transferSnap = await t.get(transferRef)
      if (!transferSnap.exists) {
        throw new DealerRequestError('TRANSFER_NOT_FOUND', 'Transfert introuvable.')
      }
      const transfer = transferSnap.data()

      if (transfer.dealerUid !== actorUid) {
        throw new DealerRequestError('TRANSFER_DEALER_MISMATCH', 'Ce transfert ne vous est pas destiné.')
      }
      if (transfer.status !== 'pending') {
        throw new DealerRequestError('TRANSFER_NOT_PENDING', 'Ce transfert a déjà été traité.')
      }
      const field = transferBalanceField(validateTransferType(transfer.transferType))
      const amount = transfer.amount
      if (!Number.isSafeInteger(amount) || amount <= 0) {
        throw new DealerRequestError('INVALID_TRANSFER_DATA', 'Montant du transfert invalide.')
      }

      // Solde dealer (peut ne pas exister → 0)
      const balRef = db.doc(`dealerBalances/${actorUid}`)
      const balSnap = await t.get(balRef)
      const previousDealerBalance = readDealerBalanceAmount(balSnap.exists ? balSnap.data() : null, field)
      const newDealerBalance = previousDealerBalance + amount
      if (!Number.isSafeInteger(newDealerBalance)) {
        throw new DealerRequestError('BALANCE_OVERFLOW', 'Le solde résultant dépasse la limite des entiers sûrs.')
      }
      const now = FieldValue.serverTimestamp()

      // Crédit dealer — set + merge (crée le document s'il n'existe pas encore,
      // le merge profond préserve l'autre champ : stock ↔ liquidite).
      t.set(balRef, {
        balances: { Orange: { [field]: newDealerBalance } },
        updatedAt: now,
      }, { merge: true })

      // Mise à jour du transfert
      t.update(transferRef, {
        status: 'confirmed',
        updatedAt: now,
        confirmedBy: actorUid,
        confirmedAt: now,
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
        previousDealerBalance,
        newDealerBalance,
      })

      // Piste d'audit dealer
      const auditRef = db.collection(`dealerBalances/${actorUid}/auditLogs`).doc()
      t.set(auditRef, {
        action: 'STORE_DEALER_TRANSFER_CONFIRMED',
        actorUid,
        actorEmail: txProfile.email ?? null,
        actorName: txProfile.name ?? null,
        actorRole: 'dealer',
        transferId,
        storeId: transfer.storeId,
        storeName: transfer.storeName ?? null,
        transferType: transfer.transferType,
        network: TRANSFER_NETWORK,
        amount,
        previousBalance: previousDealerBalance,
        newBalance: newDealerBalance,
        createdAt: now,
      })

      return { previousDealerBalance, newDealerBalance }
    })
  } catch (err) {
    if (err instanceof DealerRequestError) throw err
    throw new DealerRequestError('TRANSACTION_FAILED', 'La transaction a échoué. Veuillez réessayer.')
  }

  return {
    success: true,
    transferId,
    previousDealerBalance: result.previousDealerBalance,
    newDealerBalance: result.newDealerBalance,
  }
}
