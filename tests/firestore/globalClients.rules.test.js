/**
 * TC-007 — Lecture globalClients inter-boutiques (règle actuelle permissive)
 *
 * Comportement actuel figé :
 *   firestore.rules:98 → allow read: if hasProfile()
 *   Aucun filtre sur registeredStoreId. Tout utilisateur actif (quelle que soit
 *   sa boutique) peut lire n'importe quel document globalClients.
 *
 * Risque couvert : MASTER-SEC-002
 * Ne pas corriger en Lot 0 — correction prévue au Lot 1 / décision D2.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc } from 'firebase/firestore'
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
 * Seeds communs à tous les tests du fichier.
 * Appelé au début de chaque `it` car clearFirestore() s'exécute dans beforeEach.
 *
 * Profils seedés :
 *   - uid-member-aaa  : membre actif, boutique A (store-test-aaa)
 *   - uid-admin-bbb   : admin actif, boutique B (store-test-bbb)
 *   - uid-inactive-aaa: membre INACTIF, boutique A
 *   - gclient-aaa     : globalClient enregistré par boutique A
 */
async function seedAll() {
  await seedDocument(testEnv, 'users', 'uid-member-aaa', {
    active: true,
    storeId: 'store-test-aaa',
    role: 'member',
    storeName: 'Store A',
  })
  await seedDocument(testEnv, 'users', 'uid-admin-bbb', {
    active: true,
    storeId: 'store-test-bbb',
    role: 'store_admin',
    storeName: 'Store B',
  })
  await seedDocument(testEnv, 'users', 'uid-inactive-aaa', {
    active: false,
    storeId: 'store-test-aaa',
    role: 'member',
    storeName: 'Store A',
  })
  await seedDocument(testEnv, 'globalClients', 'gclient-aaa', {
    nom: 'Alpha',
    prenom: 'Client',
    registeredStoreId: 'store-test-aaa',
    registeredStoreName: 'Store A',
  })
}

describe('TC-007 — Lecture globalClients (règles Firestore)', () => {
  it('[TC-007-01] non authentifié — get globalClients/gclient-aaa — deny', async () => {
    await seedAll()
    const ctx = getUnauthenticatedContext(testEnv)
    const ref = doc(ctx.firestore(), 'globalClients', 'gclient-aaa')
    await assertFails(getDoc(ref))
  })

  it('[TC-007-02] uid-inactive-aaa (active: false) — get globalClients/gclient-aaa — deny', async () => {
    await seedAll()
    const ctx = getAuthenticatedContext(testEnv, 'uid-inactive-aaa')
    const ref = doc(ctx.firestore(), 'globalClients', 'gclient-aaa')
    await assertFails(getDoc(ref))
  })

  it('[TC-007-03] uid-member-aaa (storeA, actif) — get globalClients/gclient-aaa — allow', async () => {
    await seedAll()
    const ctx = getAuthenticatedContext(testEnv, 'uid-member-aaa')
    const ref = doc(ctx.firestore(), 'globalClients', 'gclient-aaa')
    const snap = await assertSucceeds(getDoc(ref))
    expect(snap.exists()).toBe(true)
    expect(snap.data().registeredStoreId).toBe('store-test-aaa')
  })

  it('[TC-007-04] uid-admin-bbb (storeB, actif) — get globalClients/gclient-aaa (storeA) — allow (MASTER-SEC-002 : absence de filtre registeredStoreId)', async () => {
    /**
     * COMPORTEMENT ACTUEL FIGÉ — MASTER-SEC-002
     *
     * La règle allow read pour globalClients vérifie uniquement hasProfile(),
     * sans filtrer sur registeredStoreId. Un membre de la boutique B peut donc
     * lire les clients enregistrés par la boutique A.
     *
     * Ce test fige ce comportement actuel. Ne pas corriger en Lot 0.
     * La correction est prévue au Lot 1 / décision D2.
     *
     * firestore.rules:98 → allow read: if hasProfile()
     */
    await seedAll()
    const ctx = getAuthenticatedContext(testEnv, 'uid-admin-bbb')
    const ref = doc(ctx.firestore(), 'globalClients', 'gclient-aaa')
    const snap = await assertSucceeds(getDoc(ref))
    expect(snap.exists()).toBe(true)
    expect(snap.data().registeredStoreId).toBe('store-test-aaa')
  })
})
