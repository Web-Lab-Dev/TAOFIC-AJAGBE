/**
 * Handler de dépôt partenaire (sous-dealer hors boîte).
 *
 * Sémantique :
 *   Le dealer dépose du stock à un partenaire et reçoit de la liquidité, 1:1,
 *   sur SON propre inventaire : stock −M et liquidité +M, en une transaction.
 *   Aucune notification, aucune confirmation : l'opération est immédiate et
 *   juste enregistrée dans l'historique. Le partenaire n'a aucun solde.
 *
 * Exige que le dealer ait au moins M de stock (INSUFFICIENT_DEALER_BALANCE sinon).
 * db et FieldValue injectés (testabilité sans émulateur Functions).
 */

import { DealerRequestError } from '../errors.js'
import { validateAuthUid, validateInputPayload } from '../dealerRequests/shared.js'
import {
  validateTransferAmount,
  validatePartnerInput,
  validateDealerProfile,
  readDealerBalanceAmount,
  TRANSFER_NETWORK,
} from './shared.js'

export async function createPartnerDepositHandler(request, { db, FieldValue }) {
  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const actorUid = validateAuthUid(request.auth?.uid)

  // ── 2. Payload ─────────────────────────────────────────────────────────────
  const payload = validateInputPayload(request.data, [
    'partnerId', 'partnerNom', 'partnerPrenom', 'partnerNumeroDA', 'partnerLocalite', 'amount',
  ])
  const amount = validateTransferAmount(payload.amount)
  const partner = validatePartnerInput(payload)

  // ── 3. Prévalidation profil dealer ─────────────────────────────────────────
  const profileSnap = await db.doc(`users/${actorUid}`).get()
  if (!profileSnap.exists) {
    throw new DealerRequestError('PROFILE_NOT_FOUND', 'Profil utilisateur introuvable.')
  }
  validateDealerProfile(profileSnap.data())

  // ── 4. Transaction : −stock +liquidité sur l'inventaire dealer ─────────────
  let result
  try {
    result = await db.runTransaction(async (t) => {
      const txProfileSnap = await t.get(db.doc(`users/${actorUid}`))
      if (!txProfileSnap.exists) {
        throw new DealerRequestError('PROFILE_NOT_FOUND', 'Profil utilisateur introuvable.')
      }
      const txProfile = txProfileSnap.data()
      validateDealerProfile(txProfile)

      const balRef = db.doc(`dealerBalances/${actorUid}`)
      const balSnap = await t.get(balRef)
      const balData = balSnap.exists ? balSnap.data() : null
      const previousStock = readDealerBalanceAmount(balData, 'stock')
      const previousLiquidite = readDealerBalanceAmount(balData, 'liquidite')

      if (previousStock < amount) {
        throw new DealerRequestError('INSUFFICIENT_DEALER_BALANCE', 'Stock insuffisant pour ce dépôt partenaire.')
      }
      const newStock = previousStock - amount
      const newLiquidite = previousLiquidite + amount
      if (!Number.isSafeInteger(newLiquidite)) {
        throw new DealerRequestError('BALANCE_OVERFLOW', 'Le solde résultant dépasse la limite des entiers sûrs.')
      }
      const now = FieldValue.serverTimestamp()

      // Mise à jour atomique des deux champs (set+merge : préserve le document).
      t.set(balRef, {
        balances: { Orange: { stock: newStock, liquidite: newLiquidite } },
        updatedAt: now,
      }, { merge: true })

      // Enregistrement du dépôt (confirmé d'emblée — pas de flux de validation).
      const depositRef = db.collection('dealerPartnerDeposits').doc()
      t.set(depositRef, {
        dealerUid: actorUid,
        dealerName: txProfile.name ?? null,
        dealerEmail: txProfile.email ?? null,
        partnerId: partner.partnerId,
        partnerNom: partner.partnerNom,
        partnerPrenom: partner.partnerPrenom,
        partnerNumeroDA: partner.partnerNumeroDA,
        partnerLocalite: partner.partnerLocalite,
        network: TRANSFER_NETWORK,
        amount,
        previousStock,
        newStock,
        previousLiquidite,
        newLiquidite,
        status: 'confirmed',
        createdAt: now,
      })

      // Piste d'audit dealer
      const auditRef = db.collection(`dealerBalances/${actorUid}/auditLogs`).doc()
      t.set(auditRef, {
        action: 'PARTNER_DEPOSIT',
        actorUid,
        actorEmail: txProfile.email ?? null,
        actorName: txProfile.name ?? null,
        actorRole: 'dealer',
        depositId: depositRef.id,
        partnerId: partner.partnerId,
        partnerNom: partner.partnerNom,
        network: TRANSFER_NETWORK,
        amount,
        previousStock, newStock,
        previousLiquidite, newLiquidite,
        createdAt: now,
      })

      return { depositId: depositRef.id, newStock, newLiquidite }
    })
  } catch (err) {
    if (err instanceof DealerRequestError) throw err
    throw new DealerRequestError('TRANSACTION_FAILED', 'La transaction a échoué. Veuillez réessayer.')
  }

  return { success: true, ...result }
}
