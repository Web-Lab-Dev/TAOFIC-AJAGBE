import { readFile } from 'node:fs/promises'

const emailArg = process.argv.find((arg) => arg.startsWith('--email='))
const email = String(emailArg?.slice('--email='.length) || process.env.npm_config_email || process.argv[2] || '').trim().toLowerCase()
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS

if (!email) {
  console.error('Usage: npm run account:reset-link -- --email=compte@example.com')
  process.exit(1)
}

if (!serviceAccountPath) {
  console.error('GOOGLE_APPLICATION_CREDENTIALS doit pointer vers le JSON du service account Firebase Admin.')
  process.exit(1)
}

const { initializeApp, cert } = await import('firebase-admin/app')
const { getAuth } = await import('firebase-admin/auth')

initializeApp({
  credential: cert(JSON.parse(await readFile(serviceAccountPath, 'utf8')))
})

const link = await getAuth().generatePasswordResetLink(email)
console.log(link)
