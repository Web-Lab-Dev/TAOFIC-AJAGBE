/**
 * adminService.js — Requêtes Firestore en lecture seule pour system_manager.
 *
 * Toutes les écritures sensibles (création boutique, suspension utilisateur,
 * changement de rôle) doivent passer par des Cloud Functions Admin SDK.
 * Ce service ne fait jamais d'écriture directe (hors lastLogin qui est géré
 * par AuthContext).
 *
 * Collections lisibles par system_manager :
 *   stores                               (toutes, actives ou non)
 *   users                                (tous)
 *   globalClients                        (tous)
 *   dealerRequests                       (tous)
 *   /{path=**}/history/{docId}           (collectionGroup)
 *   /{path=**}/networkBalances/{docId}   (collectionGroup)
 *
 * Non lisibles (pas de règle pour system_manager) :
 *   clients/{storeId}/auditLogs          → read=storeMember uniquement
 *   clients/{storeId}/drafts             → collectionGroup lisible mais peu utile pour admin
 *   clients/{storeId}/sessions           → interne boutique
 */

import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getCountFromServer,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../config/firebase'

const PAGE = 25

function mapErr(err) {
  if (err?.code === 'permission-denied') return new Error('Accès refusé. Vérifiez vos permissions.')
  if (err?.code === 'unavailable') return new Error('Service indisponible. Réessayez.')
  if (err?.code === 'failed-precondition') return new Error('Index Firestore manquant — déployez firestore.indexes.json.')
  if (import.meta.env.DEV) console.error('[adminService]', err)
  return new Error('Une erreur inattendue s\'est produite.')
}

// ──────────────────────────────────────────────────────────────────────────────
// Boutiques
// ──────────────────────────────────────────────────────────────────────────────

export async function listAllStores({ lastDoc = null, activeFilter = null, search = '' } = {}) {
  try {
    const constraints = []
    if (activeFilter !== null) constraints.push(where('active', '==', activeFilter))
    constraints.push(orderBy('name'))
    constraints.push(limit(PAGE + 1))
    if (lastDoc) constraints.push(startAfter(lastDoc))

    const snap = await getDocs(query(collection(db, 'stores'), ...constraints))
    const hasMore = snap.docs.length > PAGE
    const docs = hasMore ? snap.docs.slice(0, PAGE) : snap.docs
    let stores = docs.map(d => ({ id: d.id, ...d.data() }))

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      stores = stores.filter(s => s.name?.toLowerCase().includes(q))
    }

    return { stores, lastDoc: docs.at(-1) ?? null, hasMore }
  } catch (err) {
    throw mapErr(err)
  }
}

export async function getStoreById(storeId) {
  try {
    const snap = await getDoc(doc(db, 'stores', storeId))
    if (!snap.exists()) throw new Error('Boutique introuvable.')
    return { id: snap.id, ...snap.data() }
  } catch (err) {
    if (err.message && !err.code) throw err
    throw mapErr(err)
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Compteurs globaux (dashboard)
// ──────────────────────────────────────────────────────────────────────────────

export async function getAdminDashboardCounts() {
  try {
    const [
      allStores,
      activeStores,
      allUsers,
      allClients,
      pendingRequests,
    ] = await Promise.all([
      getCountFromServer(query(collection(db, 'stores'))),
      getCountFromServer(query(collection(db, 'stores'), where('active', '==', true))),
      getCountFromServer(query(collection(db, 'users'))),
      getCountFromServer(query(collection(db, 'globalClients'))),
      getCountFromServer(query(collection(db, 'dealerRequests'), where('status', '==', 'pending'))),
    ])

    return {
      totalStores: allStores.data().count,
      activeStores: activeStores.data().count,
      inactiveStores: allStores.data().count - activeStores.data().count,
      totalUsers: allUsers.data().count,
      totalClients: allClients.data().count,
      pendingRequests: pendingRequests.data().count,
    }
  } catch (err) {
    throw mapErr(err)
  }
}

export async function getDealerRequestCounts() {
  try {
    const [confirmed, rejected] = await Promise.all([
      getCountFromServer(query(collection(db, 'dealerRequests'), where('status', '==', 'confirmed'))),
      getCountFromServer(query(collection(db, 'dealerRequests'), where('status', '==', 'rejected'))),
    ])
    return {
      confirmed: confirmed.data().count,
      rejected: rejected.data().count,
    }
  } catch (err) {
    throw mapErr(err)
  }
}

export async function getUserCountsByRole() {
  try {
    const snap = await getDocs(query(collection(db, 'users')))
    const counts = { store_admin: 0, dealer: 0, system_manager: 0, member: 0, other: 0 }
    snap.docs.forEach(d => {
      const role = d.data().role
      if (role in counts) counts[role]++
      else counts.other++
    })
    return counts
  } catch (err) {
    throw mapErr(err)
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Demandes Dealer (supervision)
// ──────────────────────────────────────────────────────────────────────────────

export async function listAllDealerRequests({
  lastDoc = null,
  statusFilter = null,
  dealerSearch = '',
  storeSearch = '',
} = {}) {
  try {
    const constraints = []
    if (statusFilter) constraints.push(where('status', '==', statusFilter))
    constraints.push(orderBy('createdAt', 'desc'))
    constraints.push(limit(PAGE + 1))
    if (lastDoc) constraints.push(startAfter(lastDoc))

    const snap = await getDocs(query(collection(db, 'dealerRequests'), ...constraints))
    const hasMore = snap.docs.length > PAGE
    const docs = hasMore ? snap.docs.slice(0, PAGE) : snap.docs
    let requests = docs.map(d => ({ id: d.id, ...d.data() }))

    if (dealerSearch.trim()) {
      const q = dealerSearch.trim().toLowerCase()
      requests = requests.filter(r =>
        r.dealerName?.toLowerCase().includes(q) ||
        r.dealerEmail?.toLowerCase().includes(q)
      )
    }
    if (storeSearch.trim()) {
      const q = storeSearch.trim().toLowerCase()
      requests = requests.filter(r => r.targetStoreName?.toLowerCase().includes(q))
    }

    return { requests, lastDoc: docs.at(-1) ?? null, hasMore }
  } catch (err) {
    throw mapErr(err)
  }
}

export async function getRecentDealerRequests(count = 5) {
  try {
    const snap = await getDocs(
      query(collection(db, 'dealerRequests'), orderBy('createdAt', 'desc'), limit(count))
    )
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (err) {
    throw mapErr(err)
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Utilisateurs
// ──────────────────────────────────────────────────────────────────────────────

export async function listAllUsers({
  lastDoc = null,
  roleFilter = null,
  activeFilter = null,
  search = '',
} = {}) {
  try {
    const constraints = []
    if (roleFilter) constraints.push(where('role', '==', roleFilter))
    if (activeFilter !== null) constraints.push(where('active', '==', activeFilter))
    constraints.push(orderBy('name'))
    constraints.push(limit(PAGE + 1))
    if (lastDoc) constraints.push(startAfter(lastDoc))

    const snap = await getDocs(query(collection(db, 'users'), ...constraints))
    const hasMore = snap.docs.length > PAGE
    const docs = hasMore ? snap.docs.slice(0, PAGE) : snap.docs
    let users = docs.map(d => ({ id: d.id, ...d.data() }))

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      users = users.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      )
    }

    return { users, lastDoc: docs.at(-1) ?? null, hasMore }
  } catch (err) {
    throw mapErr(err)
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Clients globaux
// ──────────────────────────────────────────────────────────────────────────────

export async function listAllClients({ lastDoc = null, search = '', storeId = '' } = {}) {
  try {
    const constraints = []
    if (storeId) constraints.push(where('registeredStoreId', '==', storeId))
    constraints.push(orderBy('nom'))
    constraints.push(limit(PAGE + 1))
    if (lastDoc) constraints.push(startAfter(lastDoc))

    const snap = await getDocs(query(collection(db, 'globalClients'), ...constraints))
    const hasMore = snap.docs.length > PAGE
    const docs = hasMore ? snap.docs.slice(0, PAGE) : snap.docs
    let clients = docs.map(d => ({ id: d.id, ...d.data() }))

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      clients = clients.filter(c =>
        c.nom?.toLowerCase().includes(q) ||
        c.prenom?.toLowerCase().includes(q) ||
        c.numeroPersonnel?.toLowerCase().includes(q)
      )
    }

    return { clients, lastDoc: docs.at(-1) ?? null, hasMore }
  } catch (err) {
    throw mapErr(err)
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Historique consolidé (collectionGroup)
// ──────────────────────────────────────────────────────────────────────────────

export async function listConsolidatedHistory({ lastDoc = null, search = '', storeNameMap = null } = {}) {
  try {
    // Pas d'orderBy sur collectionGroup : Firestore n'auto-crée pas d'index COLLECTION_GROUP
    // pour un champ simple. On trie côté client après chaque page.
    const constraints = [limit(PAGE + 1)]
    if (lastDoc) constraints.splice(0, 0, startAfter(lastDoc))

    const fetches = [getDocs(query(collectionGroup(db, 'history'), ...constraints))]
    if (!storeNameMap) fetches.push(getDocs(query(collection(db, 'stores'), limit(200))))

    const [snap, storesSnap] = await Promise.all(fetches)

    const resolvedMap = storeNameMap ?? (() => {
      const m = {}
      storesSnap.docs.forEach(d => { m[d.id] = d.data().name ?? d.id })
      return m
    })()

    const hasMore = snap.docs.length > PAGE
    const rawDocs = hasMore ? snap.docs.slice(0, PAGE) : snap.docs

    let records = rawDocs
      .map(d => {
        const parts = d.ref.path.split('/')
        const storeId = parts[1] ?? null
        const storeName = storeId ? (resolvedMap[storeId] ?? storeId) : '—'
        return { id: d.id, storeId, storeName, ...d.data() }
      })
      .sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? (a.createdAt ? new Date(a.createdAt).getTime() : 0)
        const tb = b.createdAt?.toMillis?.() ?? (b.createdAt ? new Date(b.createdAt).getTime() : 0)
        return tb - ta
      })

    const lastRawDoc = rawDocs.at(-1) ?? null

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      records = records.filter(r =>
        r.clientId?.toLowerCase().includes(q) ||
        r.clientNom?.toLowerCase().includes(q) ||
        r.storeName?.toLowerCase().includes(q) ||
        r.storeId?.toLowerCase().includes(q) ||
        r.nom?.toLowerCase().includes(q)
      )
    }

    return { records, lastDoc: lastRawDoc, hasMore, storeNameMap: resolvedMap }
  } catch (err) {
    throw mapErr(err)
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Soldes réseau par boutique (collectionGroup networkBalances)
// ──────────────────────────────────────────────────────────────────────────────

export async function listAllNetworkBalances() {
  try {
    const snap = await getDocs(
      query(collectionGroup(db, 'networkBalances'), where('__name__', '>=', ''), limit(100))
    )
    return snap.docs.map(d => {
      const parts = d.ref.path.split('/')
      const storeId = parts[1] ?? null
      return { storeId, ...d.data() }
    })
  } catch (err) {
    // Non critique — renvoie tableau vide en cas d'échec partiel
    if (import.meta.env.DEV) console.warn('[adminService] listAllNetworkBalances:', err)
    return []
  }
}

export async function getStoreNetworkBalances(storeId) {
  try {
    const snap = await getDoc(doc(db, 'clients', storeId, 'networkBalances', 'current'))
    if (!snap.exists()) return null
    return snap.data()
  } catch {
    return null
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Rapports — agrégation des demandes Dealer sur une période
// ──────────────────────────────────────────────────────────────────────────────

export async function getRequestsForReport({ dateFrom = null, dateTo = null, statusFilter = null } = {}) {
  try {
    const constraints = []
    if (statusFilter) constraints.push(where('status', '==', statusFilter))
    if (dateFrom) constraints.push(where('createdAt', '>=', Timestamp.fromDate(new Date(dateFrom))))
    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      constraints.push(where('createdAt', '<=', Timestamp.fromDate(end)))
    }
    constraints.push(orderBy('createdAt', 'desc'))
    constraints.push(limit(500))

    const snap = await getDocs(query(collection(db, 'dealerRequests'), ...constraints))
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (err) {
    throw mapErr(err)
  }
}
