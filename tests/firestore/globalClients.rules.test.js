/**
 * TC-007 — Règles Firestore globalClients
 *
 * Comportement protégé :
 *   - Lecture : tout utilisateur actif (hasProfile) peut lire tout globalClient
 *     quelle que soit la boutique d'enregistrement. C'est le comportement métier
 *     intentionnel (clients communs à toutes les boutiques).
 *   - Création : seul un utilisateur actif peut créer un client avec son propre storeId.
 *   - Modification : seul le propriétaire (même storeId que registeredStoreId) peut
 *     modifier. Le registeredStoreId ne peut pas être transféré.
 *   - Suppression : seul le propriétaire (même storeId que registeredStoreId) peut
 *     supprimer.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, collection, getDocs, updateDoc, deleteDoc, setDoc } from 'firebase/firestore'
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
  await seedDocument(testEnv, 'globalClients', 'gclient-bbb', {
    nom: 'Beta',
    prenom: 'Client',
    registeredStoreId: 'store-test-bbb',
    registeredStoreName: 'Store B',
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

  it('[TC-007-04] uid-admin-bbb (storeB, actif) — get globalClients/gclient-aaa (storeA) — allow (lecture inter-boutiques intentionnelle)', async () => {
    /**
     * La règle allow read pour globalClients vérifie uniquement hasProfile(),
     * sans filtrer sur registeredStoreId. C'est le comportement métier voulu :
     * les globalClients sont communs à toutes les boutiques, la lecture
     * inter-boutiques est intentionnelle et non une vulnérabilité.
     *
     * firestore.rules → allow read: if hasProfile()
     */
    await seedAll()
    const ctx = getAuthenticatedContext(testEnv, 'uid-admin-bbb')
    const ref = doc(ctx.firestore(), 'globalClients', 'gclient-aaa')
    const snap = await assertSucceeds(getDoc(ref))
    expect(snap.exists()).toBe(true)
    expect(snap.data().registeredStoreId).toBe('store-test-aaa')
  })
})

describe('TC-007B — Lecture globale (collection entière)', () => {
  it('[TC-007B-01] uid-member-aaa (storeA) — getDocs globalClients sans filtre — allow', async () => {
    await seedAll()
    const ctx = getAuthenticatedContext(testEnv, 'uid-member-aaa')
    const snap = await assertSucceeds(getDocs(collection(ctx.firestore(), 'globalClients')))
    const ids = snap.docs.map(d => d.id)
    expect(ids).toContain('gclient-aaa')
    expect(ids).toContain('gclient-bbb')
    const storeIds = snap.docs.map(d => d.data().registeredStoreId)
    expect(storeIds).toContain('store-test-aaa')
    expect(storeIds).toContain('store-test-bbb')
  })

  it('[TC-007B-02] uid-admin-bbb (storeB) — getDocs globalClients sans filtre — allow', async () => {
    await seedAll()
    const ctx = getAuthenticatedContext(testEnv, 'uid-admin-bbb')
    const snap = await assertSucceeds(getDocs(collection(ctx.firestore(), 'globalClients')))
    const ids = snap.docs.map(d => d.id)
    expect(ids).toContain('gclient-aaa')
    expect(ids).toContain('gclient-bbb')
  })
})

describe('TC-007C — Création globalClients', () => {
  it('[TC-007C-01] uid-member-aaa — crée client avec registeredStoreId store-test-aaa — allow', async () => {
    await seedAll()
    const ctx = getAuthenticatedContext(testEnv, 'uid-member-aaa')
    const ref = doc(ctx.firestore(), 'globalClients', 'gclient-new-aaa')
    await assertSucceeds(setDoc(ref, {
      nom: 'Nouveau',
      prenom: 'Client',
      registeredStoreId: 'store-test-aaa',
      registeredStoreName: 'Store A',
    }))
  })

  it('[TC-007C-02] uid-member-aaa — crée client avec registeredStoreId store-test-bbb — deny', async () => {
    await seedAll()
    const ctx = getAuthenticatedContext(testEnv, 'uid-member-aaa')
    const ref = doc(ctx.firestore(), 'globalClients', 'gclient-usurp')
    await assertFails(setDoc(ref, {
      nom: 'Usurp',
      prenom: 'Client',
      registeredStoreId: 'store-test-bbb',
      registeredStoreName: 'Store B',
    }))
  })

  it('[TC-007C-03] uid-admin-bbb — crée client avec registeredStoreId store-test-bbb — allow', async () => {
    await seedAll()
    const ctx = getAuthenticatedContext(testEnv, 'uid-admin-bbb')
    const ref = doc(ctx.firestore(), 'globalClients', 'gclient-new-bbb')
    await assertSucceeds(setDoc(ref, {
      nom: 'NouveauB',
      prenom: 'ClientB',
      registeredStoreId: 'store-test-bbb',
      registeredStoreName: 'Store B',
    }))
  })

  it('[TC-007C-04] uid-admin-bbb — crée client avec registeredStoreId store-test-aaa — deny', async () => {
    await seedAll()
    const ctx = getAuthenticatedContext(testEnv, 'uid-admin-bbb')
    const ref = doc(ctx.firestore(), 'globalClients', 'gclient-usurp-b')
    await assertFails(setDoc(ref, {
      nom: 'Usurp',
      prenom: 'ClientB',
      registeredStoreId: 'store-test-aaa',
      registeredStoreName: 'Store A',
    }))
  })
})

describe('TC-007D — Modification globalClients', () => {
  it('[TC-007D-01] uid-member-aaa — modifie nom de gclient-aaa (sien) sans changer registeredStoreId — allow', async () => {
    await seedAll()
    const ctx = getAuthenticatedContext(testEnv, 'uid-member-aaa')
    const ref = doc(ctx.firestore(), 'globalClients', 'gclient-aaa')
    await assertSucceeds(updateDoc(ref, {
      nom: 'AlphaModifié',
      prenom: 'Client',
      registeredStoreId: 'store-test-aaa',
      registeredStoreName: 'Store A',
    }))
  })

  it('[TC-007D-02] uid-admin-bbb — tente de modifier gclient-aaa (appartient à storeA) — deny', async () => {
    await seedAll()
    const ctx = getAuthenticatedContext(testEnv, 'uid-admin-bbb')
    const ref = doc(ctx.firestore(), 'globalClients', 'gclient-aaa')
    await assertFails(updateDoc(ref, {
      nom: 'ModifParB',
      prenom: 'Client',
      registeredStoreId: 'store-test-aaa',
      registeredStoreName: 'Store A',
    }))
  })

  it('[TC-007D-03] uid-member-aaa — tente de changer registeredStoreId de store-test-aaa vers store-test-bbb — deny', async () => {
    await seedAll()
    const ctx = getAuthenticatedContext(testEnv, 'uid-member-aaa')
    const ref = doc(ctx.firestore(), 'globalClients', 'gclient-aaa')
    await assertFails(updateDoc(ref, {
      nom: 'Alpha',
      prenom: 'Client',
      registeredStoreId: 'store-test-bbb',
      registeredStoreName: 'Store B',
    }))
  })

  it('[TC-007D-04] uid-admin-bbb — tente de s\'attribuer gclient-aaa en remplaçant registeredStoreId par store-test-bbb — deny', async () => {
    await seedAll()
    const ctx = getAuthenticatedContext(testEnv, 'uid-admin-bbb')
    const ref = doc(ctx.firestore(), 'globalClients', 'gclient-aaa')
    await assertFails(updateDoc(ref, {
      nom: 'Alpha',
      prenom: 'Client',
      registeredStoreId: 'store-test-bbb',
      registeredStoreName: 'Store B',
    }))
  })
})

describe('TC-007E — Suppression globalClients', () => {
  it('[TC-007E-01] uid-member-aaa — supprime gclient-aaa (sien) — allow', async () => {
    await seedAll()
    const ctx = getAuthenticatedContext(testEnv, 'uid-member-aaa')
    const ref = doc(ctx.firestore(), 'globalClients', 'gclient-aaa')
    await assertSucceeds(deleteDoc(ref))
  })

  it('[TC-007E-02] uid-admin-bbb — tente de supprimer gclient-aaa (appartient à storeA) — deny', async () => {
    await seedAll()
    const ctx = getAuthenticatedContext(testEnv, 'uid-admin-bbb')
    const ref = doc(ctx.firestore(), 'globalClients', 'gclient-aaa')
    await assertFails(deleteDoc(ref))
  })

  it('[TC-007E-03] uid-inactive-aaa (inactif) — tente de supprimer gclient-aaa — deny', async () => {
    await seedAll()
    const ctx = getAuthenticatedContext(testEnv, 'uid-inactive-aaa')
    const ref = doc(ctx.firestore(), 'globalClients', 'gclient-aaa')
    await assertFails(deleteDoc(ref))
  })

  it('[TC-007E-04] non authentifié — tente de supprimer gclient-aaa — deny', async () => {
    await seedAll()
    const ctx = getUnauthenticatedContext(testEnv)
    const ref = doc(ctx.firestore(), 'globalClients', 'gclient-aaa')
    await assertFails(deleteDoc(ref))
  })
})
