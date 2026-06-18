/**
 * TC-008 — Suppression et modification d'un document history (règle actuelle)
 * TC-010 — Lecture non paginée history (règle actuelle)
 *
 * Comportement actuel figé :
 *   TC-008 : firestore.rules:125-135 — match /clients/{storeId}/history/{historyId}
 *     - allow read:   if isStoreMember(storeId)
 *     - allow create: if isStoreMember(storeId) && validStoreScopedTransaction && validStatus && !isPendingStatus
 *     - allow update: if isStoreMember(storeId) && affectedKeys hasOnly ['statut','updatedAt','notes'] && validStatus
 *     - allow delete: if isStoreMember(storeId)  ← MASTER-SEC-003
 *
 *   TC-010 : la règle allow list (couverte par allow read) n'impose pas de limite de pagination.
 *
 * Risques couverts : MASTER-SEC-003 (delete permissif), MASTER-PERF-001 (lecture non bornée).
 * Ne pas corriger en Lot 0.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, getDocs, deleteDoc, updateDoc, collection } from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertSucceeds,
  assertFails,
  getAuthenticatedContext,
  getUnauthenticatedContext,
  seedDocument,
} from './helpers.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rulesPath = resolve(__dirname, '../../firestore.rules')
const rules = readFileSync(rulesPath, 'utf-8')

let testEnv

beforeAll(async () => {
  const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || ''
  if (!projectId.startsWith('demo-')) {
    throw new Error(
      `SÉCURITÉ : projectId manquant ou non-demo. Valeur reçue : "${projectId}"`
    )
  }
  if (projectId !== 'demo-akayis-test') {
    throw new Error(
      `SÉCURITÉ : projectId doit être exactement "demo-akayis-test". Valeur reçue : "${projectId}"`
    )
  }

  testEnv = await initializeTestEnvironment({
    projectId: 'demo-akayis-test',
    firestore: {
      rules,
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

afterAll(async () => {
  if (testEnv) await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

/**
 * Seeds communs pour TC-008.
 * Appelé au début de chaque `it` car clearFirestore() s'exécute dans beforeEach.
 *
 * Profils seedés :
 *   - uid-member-aaa  : membre actif, boutique A (store-test-aaa)
 *   - uid-member-bbb  : membre actif, boutique B (store-test-bbb)
 *   - uid-inactive-aaa: membre INACTIF, boutique A
 *   - clients/store-test-aaa/history/hist-aaa-001 : transaction Validée, boutique A
 */
async function seedAll() {
  await seedDocument(testEnv, 'users', 'uid-member-aaa', {
    active: true,
    storeId: 'store-test-aaa',
    role: 'member',
    storeName: 'Store A',
  })
  await seedDocument(testEnv, 'users', 'uid-member-bbb', {
    active: true,
    storeId: 'store-test-bbb',
    role: 'member',
    storeName: 'Store B',
  })
  await seedDocument(testEnv, 'users', 'uid-inactive-aaa', {
    active: false,
    storeId: 'store-test-aaa',
    role: 'member',
    storeName: 'Store A',
  })
  await seedDocument(testEnv, 'clients/store-test-aaa/history', 'hist-aaa-001', {
    montant: 1000,
    statut: 'Validée',
    type: 'Dépôt',
    storeId: 'store-test-aaa',
    reseau: 'Orange',
    clientId: 'client-001',
    createdAt: '2026-06-17T08:00:00.000Z',
  })
}

describe('TC-008 — Suppression et modification history (règles Firestore)', () => {
  it('[TC-008-01] uid-member-aaa (storeA) — delete clients/store-test-aaa/history/hist-aaa-001 — allow', async () => {
    /**
     * COMPORTEMENT ACTUEL FIGÉ — MASTER-SEC-003
     *
     * firestore.rules:134 — règle delete sur clients/{storeId}/history/{histId} :
     *   allow delete: if isStoreMember(storeId)
     *
     * Un membre peut supprimer n'importe quelle transaction de sa boutique,
     * y compris les transactions "Validée". Aucune vérification du statut.
     * Piste d'audit financière non protégée.
     *
     * Ce test fige ce comportement actuel. Ne pas corriger en Lot 0.
     * Correction prévue au Lot 3B.
     */
    await seedAll()
    const ctx = getAuthenticatedContext(testEnv, 'uid-member-aaa')
    const ref = doc(ctx.firestore(), 'clients', 'store-test-aaa', 'history', 'hist-aaa-001')
    await assertSucceeds(deleteDoc(ref))
  })

  it('[TC-008-02] uid-member-bbb (storeB) — delete clients/store-test-aaa/history/hist-aaa-001 — deny', async () => {
    await seedAll()
    const ctx = getAuthenticatedContext(testEnv, 'uid-member-bbb')
    const ref = doc(ctx.firestore(), 'clients', 'store-test-aaa', 'history', 'hist-aaa-001')
    await assertFails(deleteDoc(ref))
  })

  it('[TC-008-03] non authentifié — delete clients/store-test-aaa/history/hist-aaa-001 — deny', async () => {
    await seedAll()
    const ctx = getUnauthenticatedContext(testEnv)
    const ref = doc(ctx.firestore(), 'clients', 'store-test-aaa', 'history', 'hist-aaa-001')
    await assertFails(deleteDoc(ref))
  })

  it('[TC-008-04] uid-inactive-aaa (active: false) — delete clients/store-test-aaa/history/hist-aaa-001 — deny', async () => {
    await seedAll()
    const ctx = getAuthenticatedContext(testEnv, 'uid-inactive-aaa')
    const ref = doc(ctx.firestore(), 'clients', 'store-test-aaa', 'history', 'hist-aaa-001')
    await assertFails(deleteDoc(ref))
  })

  it('[TC-008-05] uid-member-aaa (storeA) — update montant — deny', async () => {
    /**
     * firestore.rules:131-133 :
     *   allow update: if isStoreMember(storeId) &&
     *     request.resource.data.diff(resource.data).affectedKeys().hasOnly(['statut', 'updatedAt', 'notes']) &&
     *     validStatus(request.resource.data.statut);
     *
     * 'montant' n'est pas dans la liste des champs autorisés → DENY.
     */
    await seedAll()
    const ctx = getAuthenticatedContext(testEnv, 'uid-member-aaa')
    const ref = doc(ctx.firestore(), 'clients', 'store-test-aaa', 'history', 'hist-aaa-001')
    await assertFails(updateDoc(ref, { montant: 9999 }))
  })

  it('[TC-008-06] uid-member-aaa (storeA) — update statut seul vers valeur valide — allow', async () => {
    /**
     * firestore.rules:131-133 :
     *   allow update: if isStoreMember(storeId) &&
     *     request.resource.data.diff(resource.data).affectedKeys().hasOnly(['statut', 'updatedAt', 'notes']) &&
     *     validStatus(request.resource.data.statut);
     *
     * 'statut' est dans la liste des champs autorisés et 'Non Terminées' est une valeur validStatus → ALLOW.
     */
    await seedAll()
    const ctx = getAuthenticatedContext(testEnv, 'uid-member-aaa')
    const ref = doc(ctx.firestore(), 'clients', 'store-test-aaa', 'history', 'hist-aaa-001')
    await assertSucceeds(updateDoc(ref, { statut: 'Non Terminées' }))
  })

  it('[TC-008-07] uid-member-aaa (storeA) — get clients/store-test-aaa/history/hist-aaa-001 — allow', async () => {
    await seedAll()
    const ctx = getAuthenticatedContext(testEnv, 'uid-member-aaa')
    const ref = doc(ctx.firestore(), 'clients', 'store-test-aaa', 'history', 'hist-aaa-001')
    const snap = await assertSucceeds(getDoc(ref))
    expect(snap.exists()).toBe(true)
    expect(snap.data().storeId).toBe('store-test-aaa')
  })

  it('[TC-008-08] uid-member-aaa (storeA) — get clients/store-test-bbb/history/hist-bbb-001 — deny', async () => {
    await seedAll()
    await seedDocument(testEnv, 'clients/store-test-bbb/history', 'hist-bbb-001', {
      montant: 500,
      statut: 'Validée',
      type: 'Retrait',
      storeId: 'store-test-bbb',
      clientId: 'client-002',
      createdAt: '2026-06-17T08:00:00.000Z',
    })
    const ctx = getAuthenticatedContext(testEnv, 'uid-member-aaa')
    const ref = doc(ctx.firestore(), 'clients', 'store-test-bbb', 'history', 'hist-bbb-001')
    await assertFails(getDoc(ref))
  })
})

describe('TC-010 — Lecture non paginée history (règles Firestore)', () => {
  it('[TC-010-01] uid-member-aaa — getDocs sans limit sur clients/store-test-aaa/history — allow — 5 documents reçus', async () => {
    /**
     * COMPORTEMENT ACTUEL FIGÉ — MASTER-PERF-001
     *
     * firestore.rules:126 — allow read: if isStoreMember(storeId)
     * La règle n'impose aucune limite de pagination (pas de limit() requis).
     * Un getDocs sans limit charge toute la collection history.
     *
     * Ce test fige ce comportement actuel. Ne pas corriger en Lot 0.
     * Correction prévue au Lot 4.
     */
    await seedDocument(testEnv, 'users', 'uid-member-aaa', {
      active: true,
      storeId: 'store-test-aaa',
      role: 'member',
      storeName: 'Store A',
    })
    for (let i = 1; i <= 5; i++) {
      await seedDocument(testEnv, 'clients/store-test-aaa/history', `hist-${i}`, {
        montant: i * 100,
        statut: 'Validée',
        type: 'Dépôt',
        storeId: 'store-test-aaa',
        clientId: `client-00${i}`,
        createdAt: '2026-06-17T08:00:00.000Z',
      })
    }
    const ctx = getAuthenticatedContext(testEnv, 'uid-member-aaa')
    const col = collection(ctx.firestore(), 'clients', 'store-test-aaa', 'history')
    const snap = await assertSucceeds(getDocs(col))
    expect(snap.size).toBe(5)
  })

  it('[TC-010-02] uid-member-bbb (storeB) — getDocs sur clients/store-test-aaa/history — deny', async () => {
    await seedDocument(testEnv, 'users', 'uid-member-aaa', {
      active: true,
      storeId: 'store-test-aaa',
      role: 'member',
      storeName: 'Store A',
    })
    await seedDocument(testEnv, 'users', 'uid-member-bbb', {
      active: true,
      storeId: 'store-test-bbb',
      role: 'member',
      storeName: 'Store B',
    })
    for (let i = 1; i <= 5; i++) {
      await seedDocument(testEnv, 'clients/store-test-aaa/history', `hist-${i}`, {
        montant: i * 100,
        statut: 'Validée',
        type: 'Dépôt',
        storeId: 'store-test-aaa',
        clientId: `client-00${i}`,
        createdAt: '2026-06-17T08:00:00.000Z',
      })
    }
    const ctx = getAuthenticatedContext(testEnv, 'uid-member-bbb')
    const col = collection(ctx.firestore(), 'clients', 'store-test-aaa', 'history')
    await assertFails(getDocs(col))
  })
})
