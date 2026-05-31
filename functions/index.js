import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

initializeApp()

const db = getFirestore()

const assertStoreAdmin = async (uid) => {
  const profileSnap = await db.doc(`users/${uid}`).get()

  if (!profileSnap.exists) {
    throw new HttpsError('permission-denied', 'Compte non rattaché à une boutique')
  }

  const profile = profileSnap.data()
  if (profile.role !== 'store_admin' || profile.active === false || !profile.storeId) {
    throw new HttpsError('permission-denied', 'Seul le compte boutique peut créer une caissière')
  }

  const storeSnap = await db.doc(`stores/${profile.storeId}`).get()
  if (!storeSnap.exists || storeSnap.data()?.active === false) {
    throw new HttpsError('failed-precondition', 'Boutique inactive ou introuvable')
  }

  return {
    storeId: profile.storeId,
    storeName: storeSnap.data()?.name || profile.storeName || 'Boutique'
  }
}

export const createCashierAccount = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Connexion requise')
  }

  const { storeId, storeName } = await assertStoreAdmin(request.auth.uid)
  const name = String(request.data?.name || '').trim()
  const email = String(request.data?.email || '').trim().toLowerCase()

  if (!name || !email) {
    throw new HttpsError('invalid-argument', 'Nom et email obligatoires')
  }

  if (request.data?.storeId && request.data.storeId !== storeId) {
    throw new HttpsError('permission-denied', 'Impossible de créer un compte hors boutique')
  }

  const userRecord = await getAuth().createUser({
    email,
    displayName: name,
    emailVerified: false,
    disabled: false
  })

  await db.doc(`users/${userRecord.uid}`).set({
    name,
    email,
    role: 'cashier',
    active: true,
    storeId,
    storeName,
    createdBy: request.auth.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  })

  const resetLink = await getAuth().generatePasswordResetLink(email)

  return {
    uid: userRecord.uid,
    email,
    resetLink
  }
})
