/**
 * TC-009 — Création d'un profil users avec storeId arbitraire (règle actuelle)
 *
 * Comportement actuel figé :
 *   firestore.rules:87-92 — match /users/{userId} → allow create :
 *     allow create: if signedIn() &&
 *       request.auth.uid == userId &&
 *       request.resource.data.role == 'store_admin' &&
 *       request.resource.data.active == true &&
 *       request.resource.data.storeId is string &&
 *       request.resource.data.storeName is string;
 *
 *   MASTER-SEC-001 : un utilisateur authentifié peut créer son propre profil avec
 *   role 'store_admin' et n'importe quel storeId, sans vérification de l'existence
 *   de stores/{storeId} ni de adminUid. Ce profil spoofé donne ensuite accès aux
 *   ressources protégées par isStoreMember(storeId).
 *
 * Règle update :
 *   firestore.rules:83-85 : seul le champ 'lastLogin' peut être modifié, et uniquement
 *   par l'utilisateur lui-même (request.auth.uid == userId).
 *
 * Risque couvert : MASTER-SEC-001.
 * Ne pas corriger en Lot 0. Correction prévue au Lot 3A.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
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

describe('TC-009 — Création et modification profil users (règles Firestore)', () => {
  it('[TC-009-01] uid-new-admin crée users/uid-new-admin avec role store_admin — allow (MASTER-SEC-001 : création libre de profil admin)', async () => {
    /**
     * COMPORTEMENT ACTUEL FIGÉ — MASTER-SEC-001
     *
     * La règle allow create sur users/{uid} (firestore.rules:87-92) vérifie :
     *   request.auth.uid == uid                       ← uid correspond au créateur
     *   request.resource.data.role == 'store_admin'   ← role autorisé
     *   request.resource.data.active == true          ← actif
     *   request.resource.data.storeId is string       ← storeId quelconque
     *   request.resource.data.storeName is string     ← storeName quelconque
     *
     * Un utilisateur authentifié peut créer son propre profil avec role 'store_admin'
     * et n'importe quel storeId, sans validation externe de l'appartenance à la boutique.
     *
     * Ce test fige ce comportement actuel. Ne pas corriger en Lot 0.
     * Correction prévue au Lot 3A.
     */
    const ctx = getAuthenticatedContext(testEnv, 'uid-new-admin')
    const ref = doc(ctx.firestore(), 'users', 'uid-new-admin')
    await assertSucceeds(setDoc(ref, {
      active: true,
      storeId: 'store-test-aaa',
      role: 'store_admin',
      storeName: 'Store A',
    }))
  })

  it('[TC-009-02] profil spoofé uid-spoofer (storeA, store_admin) — get globalClients/gclient-aaa — allow (MASTER-SEC-001 : exploitation du profil créé)', async () => {
    /**
     * COMPORTEMENT ACTUEL FIGÉ — MASTER-SEC-001 (exploitation)
     *
     * Après avoir créé un profil spoofé pointant vers store-test-aaa,
     * uid-spoofer peut accéder aux ressources protégées par isStoreMember('store-test-aaa').
     *
     * firestore.rules:98 — allow read: if hasProfile()
     * hasProfile() vérifie que le profil existe, active == true, storeId is string.
     * Le profil spoofé satisfait toutes ces conditions.
     *
     * Ce test valide l'impact concret de MASTER-SEC-001 :
     * la création libre d'un profil admin ouvre l'accès aux ressources de toute boutique.
     */
    await seedDocument(testEnv, 'globalClients', 'gclient-aaa', {
      nom: 'Alpha',
      prenom: 'Client',
      registeredStoreId: 'store-test-aaa',
      registeredStoreName: 'Store A',
    })

    const ctxSpoofer = getAuthenticatedContext(testEnv, 'uid-spoofer')

    // Étape 1 : créer le profil spoofé via les règles Firestore (pas withSecurityRulesDisabled)
    const profileRef = doc(ctxSpoofer.firestore(), 'users', 'uid-spoofer')
    await assertSucceeds(setDoc(profileRef, {
      active: true,
      storeId: 'store-test-aaa',
      role: 'store_admin',
      storeName: 'Store A',
    }))

    // Étape 2 : exploiter le profil pour accéder à globalClients
    const gcRef = doc(ctxSpoofer.firestore(), 'globalClients', 'gclient-aaa')
    const snap = await assertSucceeds(getDoc(gcRef))
    expect(snap.exists()).toBe(true)
    expect(snap.data().registeredStoreId).toBe('store-test-aaa')
  })

  it('[TC-009-03] uid-attacker tente de créer users/uid-victim — deny', async () => {
    /**
     * firestore.rules:88 : request.auth.uid == userId
     * uid-attacker != uid-victim → DENY.
     */
    const ctx = getAuthenticatedContext(testEnv, 'uid-attacker')
    const ref = doc(ctx.firestore(), 'users', 'uid-victim')
    await assertFails(setDoc(ref, {
      active: true,
      storeId: 'store-test-aaa',
      role: 'store_admin',
      storeName: 'Store A',
    }))
  })

  it('[TC-009-04] uid-new-member crée users/uid-new-member avec role member — deny', async () => {
    /**
     * COMPORTEMENT ACTUEL FIGÉ
     *
     * firestore.rules:89 : request.resource.data.role == 'store_admin'
     * La règle exige explicitement role == 'store_admin'.
     * Toute tentative de création avec role != 'store_admin' est refusée.
     *
     * Règle citée : firestore.rules lignes 87-92 :
     *   allow create: if signedIn() &&
     *     request.auth.uid == userId &&
     *     request.resource.data.role == 'store_admin' &&   ← exige store_admin
     *     request.resource.data.active == true &&
     *     request.resource.data.storeId is string &&
     *     request.resource.data.storeName is string;
     *
     * role: 'member' != 'store_admin' → DENY.
     */
    const ctx = getAuthenticatedContext(testEnv, 'uid-new-member')
    const ref = doc(ctx.firestore(), 'users', 'uid-new-member')
    await assertFails(setDoc(ref, {
      active: true,
      storeId: 'store-test-aaa',
      role: 'member',
      storeName: 'Store A',
    }))
  })

  it('[TC-009-05] uid-new-inactive crée users/uid-new-inactive avec active false — deny', async () => {
    /**
     * COMPORTEMENT ACTUEL FIGÉ
     *
     * firestore.rules:90 : request.resource.data.active == true
     * La règle exige explicitement active == true.
     * Toute tentative de création avec active != true est refusée.
     *
     * Règle citée : firestore.rules lignes 87-92 :
     *   allow create: if signedIn() &&
     *     request.auth.uid == userId &&
     *     request.resource.data.role == 'store_admin' &&
     *     request.resource.data.active == true &&           ← exige active true
     *     request.resource.data.storeId is string &&
     *     request.resource.data.storeName is string;
     *
     * active: false != true → DENY.
     */
    const ctx = getAuthenticatedContext(testEnv, 'uid-new-inactive')
    const ref = doc(ctx.firestore(), 'users', 'uid-new-inactive')
    await assertFails(setDoc(ref, {
      active: false,
      storeId: 'store-test-aaa',
      role: 'store_admin',
      storeName: 'Store A',
    }))
  })

  it('[TC-009-06] non authentifié — create users/uid-new — deny', async () => {
    /**
     * firestore.rules:87 : signedIn() exige request.auth != null.
     * Contexte non authentifié → DENY.
     */
    const ctx = getUnauthenticatedContext(testEnv)
    const ref = doc(ctx.firestore(), 'users', 'uid-new')
    await assertFails(setDoc(ref, {
      active: true,
      storeId: 'store-test-aaa',
      role: 'store_admin',
      storeName: 'Store A',
    }))
  })

  it('[TC-009-07] uid-existing-aaa — update role — deny', async () => {
    /**
     * firestore.rules:83-85 :
     *   allow update: if hasProfile() &&
     *     request.auth.uid == userId &&
     *     request.resource.data.diff(resource.data).affectedKeys().hasOnly(['lastLogin']);
     *
     * 'role' n'est pas dans la liste des champs modifiables → DENY.
     */
    await seedDocument(testEnv, 'users', 'uid-existing-aaa', {
      active: true,
      storeId: 'store-test-aaa',
      role: 'member',
      storeName: 'Store A',
    })
    const ctx = getAuthenticatedContext(testEnv, 'uid-existing-aaa')
    const ref = doc(ctx.firestore(), 'users', 'uid-existing-aaa')
    await assertFails(updateDoc(ref, { role: 'store_admin' }))
  })

  it('[TC-009-08] uid-existing-aaa — update storeId — deny', async () => {
    /**
     * firestore.rules:83-85 :
     *   allow update: if hasProfile() &&
     *     request.auth.uid == userId &&
     *     request.resource.data.diff(resource.data).affectedKeys().hasOnly(['lastLogin']);
     *
     * 'storeId' n'est pas dans la liste des champs modifiables → DENY.
     */
    await seedDocument(testEnv, 'users', 'uid-existing-aaa', {
      active: true,
      storeId: 'store-test-aaa',
      role: 'member',
      storeName: 'Store A',
    })
    const ctx = getAuthenticatedContext(testEnv, 'uid-existing-aaa')
    const ref = doc(ctx.firestore(), 'users', 'uid-existing-aaa')
    await assertFails(updateDoc(ref, { storeId: 'store-test-bbb' }))
  })
})
