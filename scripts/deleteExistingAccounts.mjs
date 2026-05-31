import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { readFile } from 'node:fs/promises'

const execute = process.argv.includes('--execute')
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS

initializeApp({
  credential: serviceAccountPath
    ? cert(JSON.parse(await readFile(serviceAccountPath, 'utf8')))
    : applicationDefault()
})

const auth = getAuth()
const db = getFirestore()
const users = []
let nextPageToken

do {
  const page = await auth.listUsers(1000, nextPageToken)
  users.push(...page.users)
  nextPageToken = page.pageToken
} while (nextPageToken)

console.log(`${execute ? 'EXECUTION' : 'DRY-RUN'}: ${users.length} comptes Firebase Auth ciblés`)

for (const user of users) {
  console.log(`${execute ? 'DELETE' : 'WOULD DELETE'} ${user.uid} ${user.email || ''}`)

  if (execute) {
    await auth.deleteUser(user.uid)
    await db.doc(`users/${user.uid}`).delete().catch(() => {})
  }
}

if (execute) {
  await db.collection('auditLogs').add({
    type: 'delete_existing_accounts',
    count: users.length,
    executedAt: FieldValue.serverTimestamp()
  }).catch(() => {})
}

if (!execute) {
  console.log('Relancez avec --execute pour supprimer réellement Auth + profils Firestore.')
}
