/**
 * TC-070 — Dépôt partenaire (createPartnerDeposit).
 *
 * Comportement protégé :
 *   - Succès : inventaire dealer stock −M et liquidité +M (1:1), enregistrement
 *     dealerPartnerDeposits confirmé, audit dealer. Aucune notification/pending.
 *   - Stock insuffisant → INSUFFICIENT_DEALER_BALANCE, aucune écriture.
 *   - Rôle non dealer → ROLE_FORBIDDEN. Partenaire/montant invalides → erreurs.
 *
 * Exécution : npm run test:functions (émulateur, demo-akayis-test).
 */

import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest'
import { initializeApp, getApps, deleteApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { createPartnerDepositHandler } from '../../functions/src/storeTransfers/createPartnerDeposit.js'

let adminApp, db
const PROJECT_ID = process.env.GCLOUD_PROJECT
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST

beforeAll(() => {
  if (!FIRESTORE_HOST) throw new Error('SÉCURITÉ : FIRESTORE_EMULATOR_HOST non défini. Lancer via : npm run test:functions')
  if (PROJECT_ID !== 'demo-akayis-test') throw new Error(`SÉCURITÉ : projectId doit être "demo-akayis-test". Reçu : "${PROJECT_ID}"`)
  adminApp = getApps().length === 0 ? initializeApp({ projectId: PROJECT_ID }) : getApps()[0]
  db = getFirestore(adminApp)
})
afterAll(async () => { if (adminApp) await deleteApp(adminApp) })

async function clearFirestoreEmulator() {
  const url = `http://${FIRESTORE_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`
  const res = await fetch(url, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Impossible de vider l'émulateur : HTTP ${res.status}`)
}
beforeEach(async () => { await clearFirestoreEmulator() })

const DEALER_UID = 'dealer-uid'
const STORE_ADMIN_UID = 'store-admin-uid'
const DEALER_PROFILE = { role: 'dealer', active: true, email: 'd@t.test', name: 'Dealer Test' }
const STORE_ADMIN_PROFILE = { role: 'store_admin', active: true, storeId: 'store-A', email: 'a@t.test', name: 'Admin' }

const PARTNER = { partnerId: '54525263', partnerNom: 'KABORE', partnerPrenom: 'HAMIDOU', partnerNumeroDA: '54525263', partnerLocalite: 'OUAGA' }
const seedUser = (uid, p) => db.doc(`users/${uid}`).set(p)
const seedDealerBal = (orange) => db.doc(`dealerBalances/${DEALER_UID}`).set({ balances: { Orange: orange } })
const req = (uid, data) => ({ auth: { uid, token: {} }, data })
async function expectError(promise, code) { await expect(promise).rejects.toMatchObject({ code }) }

describe('TC-070 — createPartnerDeposit', () => {
  it('[PD-01] succès : stock −M, liquidité +M, dépôt confirmé, audit', async () => {
    await seedUser(DEALER_UID, DEALER_PROFILE)
    await seedDealerBal({ stock: 40000, liquidite: 10000 })

    const res = await createPartnerDepositHandler(req(DEALER_UID, { ...PARTNER, amount: 15000 }), { db, FieldValue })
    expect(res.success).toBe(true)
    expect(res.newStock).toBe(25000)      // 40000 - 15000
    expect(res.newLiquidite).toBe(25000)  // 10000 + 15000

    const dbal = (await db.doc(`dealerBalances/${DEALER_UID}`).get()).data()
    expect(dbal.balances.Orange.stock).toBe(25000)
    expect(dbal.balances.Orange.liquidite).toBe(25000)

    const deps = await db.collection('dealerPartnerDeposits').get()
    expect(deps.size).toBe(1)
    const d = deps.docs[0].data()
    expect(d.status).toBe('confirmed')
    expect(d.dealerUid).toBe(DEALER_UID)
    expect(d.partnerId).toBe('54525263')
    expect(d.amount).toBe(15000)

    const audit = await db.collection(`dealerBalances/${DEALER_UID}/auditLogs`).get()
    expect(audit.size).toBe(1)
    expect(audit.docs[0].data().action).toBe('PARTNER_DEPOSIT')
  })

  it('[PD-02] stock insuffisant → INSUFFICIENT_DEALER_BALANCE, aucune écriture', async () => {
    await seedUser(DEALER_UID, DEALER_PROFILE)
    await seedDealerBal({ stock: 5000, liquidite: 10000 })
    await expectError(
      createPartnerDepositHandler(req(DEALER_UID, { ...PARTNER, amount: 15000 }), { db, FieldValue }),
      'INSUFFICIENT_DEALER_BALANCE',
    )
    const dbal = (await db.doc(`dealerBalances/${DEALER_UID}`).get()).data()
    expect(dbal.balances.Orange.stock).toBe(5000)      // inchangé
    expect(dbal.balances.Orange.liquidite).toBe(10000) // inchangé
    expect((await db.collection('dealerPartnerDeposits').get()).size).toBe(0)
  })

  it('[PD-03] inventaire absent (0) → INSUFFICIENT_DEALER_BALANCE', async () => {
    await seedUser(DEALER_UID, DEALER_PROFILE)
    await expectError(
      createPartnerDepositHandler(req(DEALER_UID, { ...PARTNER, amount: 1000 }), { db, FieldValue }),
      'INSUFFICIENT_DEALER_BALANCE',
    )
  })

  it('[PD-04] appelant non dealer → ROLE_FORBIDDEN', async () => {
    await seedUser(STORE_ADMIN_UID, STORE_ADMIN_PROFILE)
    await expectError(
      createPartnerDepositHandler(req(STORE_ADMIN_UID, { ...PARTNER, amount: 1000 }), { db, FieldValue }),
      'ROLE_FORBIDDEN',
    )
  })

  it('[PD-05] partenaire invalide (id manquant) → INVALID_PARTNER', async () => {
    await seedUser(DEALER_UID, DEALER_PROFILE)
    await seedDealerBal({ stock: 40000, liquidite: 0 })
    await expectError(
      createPartnerDepositHandler(req(DEALER_UID, { partnerId: '', partnerNom: 'X', amount: 1000 }), { db, FieldValue }),
      'INVALID_PARTNER',
    )
  })

  it('[PD-06] montant invalide → INVALID_TRANSFER_AMOUNT', async () => {
    await seedUser(DEALER_UID, DEALER_PROFILE)
    await seedDealerBal({ stock: 40000, liquidite: 0 })
    await expectError(
      createPartnerDepositHandler(req(DEALER_UID, { ...PARTNER, amount: 0 }), { db, FieldValue }),
      'INVALID_TRANSFER_AMOUNT',
    )
  })
})
