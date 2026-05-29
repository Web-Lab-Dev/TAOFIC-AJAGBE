import {
  collection,
  doc,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  getDocs,
  limit,
  startAfter,
  writeBatch,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { withErrorHandling } from '../utils/errorHandler'
import cacheManager, { cacheUtils } from '../utils/cacheManager'
import { FIRESTORE_CONFIG } from '../constants/firestoreConstants'

// Service Firestore modulaire avec cache, gestion d'erreurs et optimisations

const CURRENT_BALANCE_DOC_ID = 'current'
const DEFAULT_NETWORK_BALANCES = {
  Orange: { stock: 0, liquidite: 0 },
  Moov: { stock: 0, liquidite: 0 },
  Telecel: { stock: 0, liquidite: 0 },
  Coris: { stock: 0, liquidite: 0 },
  Sank: { stock: 0, liquidite: 0 }
}

export class FirestoreService {
  constructor() {
    this.listeners = new Map()
    this.connectionPool = new Map() // Pool de connexions pour optimiser les listeners
    this.metrics = {
      operations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0
    }

    // Configurer la fonction de fetch pour le cache
    cacheManager.setFetchFunction(this.fetchFromFirestore.bind(this))
  }

  // ====================
  // MÉTHODES UTILITAIRES
  // ====================

  // Fetch pour le cache manager
  async fetchFromFirestore(collectionName, queryOptions = {}) {

    const q = this.buildQuery(collectionName, queryOptions)
    const snapshot = await getDocs(q)
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    return data
  }

  // Construire une query optimisée
  buildQuery(collectionName, options = {}) {
    let q = collection(db, collectionName)

    if (options.where) {
      options.where.forEach(whereClause => {
        q = query(q, where(whereClause.field, whereClause.operator, whereClause.value))
      })
    }

    if (options.orderByField) {
      q = query(q, orderBy(options.orderByField, options.orderDirection || 'desc'))
    }

    if (options.limitCount) {
      q = query(q, limit(options.limitCount))
    }

    if (options.startAfterDoc) {
      q = query(q, startAfter(options.startAfterDoc))
    }

    return q
  }

  // Validation des données
  validateData(collectionName, data) {
    const rules = FIRESTORE_CONFIG.VALIDATION

    switch (collectionName) {
      case FIRESTORE_CONFIG.COLLECTIONS.CLIENTS:
        return this.validateClientData(data, rules.CLIENT)
      case FIRESTORE_CONFIG.COLLECTIONS.DRAFTS:
      case FIRESTORE_CONFIG.COLLECTIONS.HISTORY:
        return this.validateTransactionData(data, rules.TRANSACTION)
      default:
        return { isValid: true }
    }
  }

  validateClientData(data, rules) {
    const errors = []

    if (!data.nom || data.nom.length < rules.NAME_MIN_LENGTH) {
      errors.push(`Le nom doit contenir au moins ${rules.NAME_MIN_LENGTH} caractères`)
    }

    if (data.nom && data.nom.length > rules.NAME_MAX_LENGTH) {
      errors.push(`Le nom ne peut pas dépasser ${rules.NAME_MAX_LENGTH} caractères`)
    }

    rules.REQUIRED_FIELDS.forEach(field => {
      if (!data[field]) {
        errors.push(`Le champ ${field} est requis`)
      }
    })

    return { isValid: errors.length === 0, errors }
  }

  validateTransactionData(data, rules) {
    const errors = []

    if (!data.montant || data.montant < rules.AMOUNT_MIN || data.montant > rules.AMOUNT_MAX) {
      errors.push(`Le montant doit être entre ${rules.AMOUNT_MIN} et ${rules.AMOUNT_MAX}`)
    }

    rules.REQUIRED_FIELDS.forEach(field => {
      if (!data[field]) {
        errors.push(`Le champ ${field} est requis`)
      }
    })

    return { isValid: errors.length === 0, errors }
  }

  // ====================
  // FONCTIONS CRUD AVEC CACHE ET GESTION D'ERREURS
  // ====================

  /**
   * Ajouter un document à une collection
   */
  async addDocument(collectionName, data) {
    return await withErrorHandling(async () => {
      // Valider les données
      const validation = this.validateData(collectionName, data)
      if (!validation.isValid) {
        throw new Error(`Données invalides: ${validation.errors.join(', ')}`)
      }

      const enrichedData = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, collectionName), enrichedData)
      const result = { id: docRef.id, ...enrichedData }

      // Invalider le cache
      cacheUtils.invalidateRelated('create', collectionName)

      // Incrémenter les métriques
      this.metrics.operations++

      return result
    }, `addDocument(${collectionName})`)
  }

  /**
   * Mettre à jour un document
   */
  async updateDocument(collectionName, docId, updates) {
    return await withErrorHandling(async () => {
      // Vérifier d'abord que le document existe
      const docRef = doc(db, collectionName, docId)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        console.warn(`Document ${docId} n'existe pas dans ${collectionName}, création d'un nouveau document`)
        // Créer le document au lieu de le mettre à jour
        return await this.addDocument(collectionName, { ...updates, id: docId })
      }

      const enrichedUpdates = {
        ...updates,
        updatedAt: serverTimestamp()
      }

      await updateDoc(docRef, enrichedUpdates)

      // Invalider le cache
      cacheUtils.invalidateRelated('update', collectionName, docId)

      // Incrémenter les métriques
      this.metrics.operations++

      return true
    }, `updateDocument(${collectionName}, ${docId})`)
  }

  /**
   * Supprimer un document
   */
  async deleteDocument(collectionName, docId) {
    return await withErrorHandling(async () => {
      await deleteDoc(doc(db, collectionName, docId))

      // Invalider le cache
      cacheUtils.invalidateRelated('delete', collectionName, docId)

      // Incrémenter les métriques
      this.metrics.operations++

      return true
    }, `deleteDocument(${collectionName}, ${docId})`)
  }

  /**
   * Lire un document avec cache
   */
  async getDocument(collectionName, docId, useCache = true) {
    return await withErrorHandling(async () => {
      const cacheKey = cacheManager.generateKey(collectionName, { docId })

      if (useCache) {
        const cached = cacheManager.get(cacheKey)
        if (cached) {
          this.metrics.cacheHits++
          return cached
        }
        this.metrics.cacheMisses++
      }

      const docRef = doc(db, collectionName, docId)
      const docSnap = await getDocs(query(collection(db, collectionName), where('__name__', '==', docRef)))

      if (docSnap.empty) {
        return null
      }

      const document = { id: docSnap.docs[0].id, ...docSnap.docs[0].data() }

      if (useCache) {
        cacheManager.set(cacheKey, document)
      }

      this.metrics.operations++
      return document
    }, `getDocument(${collectionName}, ${docId})`)
  }

  /**
   * Lire une collection avec cache et pagination
   */
  async getCollection(collectionName, options = {}, useCache = true) {
    return await withErrorHandling(async () => {
      const cacheKey = cacheManager.generateKey(collectionName, options)

      if (useCache) {
        const cached = cacheManager.get(cacheKey)
        if (cached) {
          this.metrics.cacheHits++
          return cached
        }
        this.metrics.cacheMisses++
      }

      const q = this.buildQuery(collectionName, options)
      const snapshot = await getDocs(q)
      const documents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      if (useCache) {
        cacheManager.set(cacheKey, documents)
      }

      this.metrics.operations++
      return documents
    }, `getCollection(${collectionName})`)
  }

  /**
   * Opérations en batch pour de meilleures performances
   */
  async batchWrite(operations) {
    return await withErrorHandling(async () => {
      const batch = writeBatch(db)
      let operationCount = 0

      for (const operation of operations) {
        if (operationCount >= FIRESTORE_CONFIG.LIMITS.MAX_BATCH_SIZE) {
          throw new Error(`Batch size limit exceeded (${FIRESTORE_CONFIG.LIMITS.MAX_BATCH_SIZE})`)
        }

        const { type, collection: collectionName, id, data } = operation

        switch (type) {
          case 'create': {
            const newDocRef = doc(collection(db, collectionName))
            batch.set(newDocRef, {
              ...data,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            })
            break
          }

          case 'update': {
            const updateDocRef = doc(db, collectionName, id)
            batch.update(updateDocRef, {
              ...data,
              updatedAt: serverTimestamp()
            })
            break
          }

          case 'delete': {
            const deleteDocRef = doc(db, collectionName, id)
            batch.delete(deleteDocRef)
            break
          }

          default:
            throw new Error(`Unknown operation type: ${type}`)
        }

        operationCount++
      }

      await batch.commit()

      // Invalider le cache pour toutes les collections affectées
      const affectedCollections = [...new Set(operations.map(op => op.collection))]
      affectedCollections.forEach(collectionName => {
        cacheManager.invalidateCollection(collectionName)
      })

      this.metrics.operations += operationCount

      return { success: true, operationsCount: operationCount }
    }, 'batchWrite')
  }

  // ====================
  // SYNCHRONISATION TEMPS RÉEL OPTIMISÉE
  // ====================

  /**
   * Écouter les changements d'une collection en temps réel avec optimisations
   */
  subscribeToCollection(collectionName, callback, queryOptions = {}) {
    return withErrorHandling(async () => {
      const subscriptionKey = `${collectionName}_${JSON.stringify(queryOptions)}`

      // Vérifier si on a déjà un listener pour cette requête exacte
      if (this.connectionPool.has(subscriptionKey)) {
        const existingListener = this.connectionPool.get(subscriptionKey)
        existingListener.callbacks.add(callback)
        return () => this.unsubscribeCallback(subscriptionKey, callback)
      }

      // Construire la query optimisée
      const q = this.buildQuery(collectionName, {
        ...queryOptions
        // Pas de limite par défaut - uniquement si explicitement demandée
      })

      // Timeout pour éviter les listeners bloqués
      const timeoutId = setTimeout(() => {
        console.warn('Firestore listener timeout for subscription:', subscriptionKey)
        this.unsubscribeFromCollection(subscriptionKey)
      }, FIRESTORE_CONFIG.LIMITS.LISTENER_TIMEOUT)

      const unsubscribe = onSnapshot(q,
        (snapshot) => {
          try {
            clearTimeout(timeoutId)

            // Obtenir tous les documents du snapshot
            const changes = snapshot.docChanges()
            // Traiter même s'il n'y a pas de changements (important pour chargement initial)

            const documents = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }))

            // Mettre à jour le cache automatiquement
            const cacheKey = cacheManager.generateKey(collectionName, queryOptions)
            cacheManager.set(cacheKey, documents, FIRESTORE_CONFIG.CACHE.TTL * 2) // TTL plus long pour real-time

            // Notifier tous les callbacks enregistrés
            const listenerInfo = this.connectionPool.get(subscriptionKey)
            if (listenerInfo) {
              listenerInfo.callbacks.forEach(cb => {
                try {
                  cb(documents, changes) // Passer aussi les changements pour optimisation
                } catch (error) {
                  console.error('Firestore subscription callback error:', error)
                }
              })
            }

          } catch (error) {
            console.error('Firestore snapshot processing error:', error)
          }
        },
        (error) => {
          clearTimeout(timeoutId)
          this.metrics.errors++
          console.error('Firestore listener error:', error)

          // Notifier les callbacks de l'erreur
          const listenerInfo = this.connectionPool.get(subscriptionKey)
          if (listenerInfo) {
            listenerInfo.callbacks.forEach(cb => {
              if (cb.onError) {
                cb.onError(error)
              }
            })
          }
        }
      )

      // Enregistrer dans le pool de connexions
      this.connectionPool.set(subscriptionKey, {
        unsubscribe,
        callbacks: new Set([callback]),
        createdAt: Date.now(),
        collection: collectionName
      })

      // Retourner une fonction pour se désabonner
      return () => this.unsubscribeCallback(subscriptionKey, callback)
    }, `subscribeToCollection(${collectionName})`)
  }

  /**
   * Désabonner un callback spécifique
   */
  unsubscribeCallback(subscriptionKey, callback) {
    const listenerInfo = this.connectionPool.get(subscriptionKey)
    if (!listenerInfo) return

    listenerInfo.callbacks.delete(callback)

    // Si plus de callbacks, fermer le listener
    if (listenerInfo.callbacks.size === 0) {
      listenerInfo.unsubscribe()
      this.connectionPool.delete(subscriptionKey)
    }
  }

  /**
   * Optimiser les listeners inactifs
   */
  optimizeListeners() {
    const now = Date.now()
    const maxAge = 30 * 60 * 1000 // 30 minutes

    for (const [key, listenerInfo] of this.connectionPool.entries()) {
      if (now - listenerInfo.createdAt > maxAge && listenerInfo.callbacks.size === 0) {
        listenerInfo.unsubscribe()
        this.connectionPool.delete(key)
      }
    }
  }

  /**
   * Désabonner tous les listeners
   */
  unsubscribeAll() {
    // Anciens listeners (compatibilité)
    this.listeners.forEach((unsubscribe, _collectionName) => {
      unsubscribe()
    })
    this.listeners.clear()

    // Nouveaux listeners optimisés
    this.connectionPool.forEach((listenerInfo, _subscriptionKey) => {
      listenerInfo.unsubscribe()
    })
    this.connectionPool.clear()

    // Nettoyer le cache
    cacheManager.clear()
  }

  /**
   * Désabonner un listener spécifique
   */
  unsubscribeFromCollection(collectionName) {
    // Legacy support
    const unsubscribe = this.listeners.get(collectionName)
    if (unsubscribe) {
      unsubscribe()
      this.listeners.delete(collectionName)
    }

    // Optimized listeners
    const keysToRemove = []
    this.connectionPool.forEach((listenerInfo, key) => {
      if (listenerInfo.collection === collectionName) {
        listenerInfo.unsubscribe()
        keysToRemove.push(key)
      }
    })

    keysToRemove.forEach(key => {
      this.connectionPool.delete(key)
    })

    // Invalider le cache pour cette collection
    cacheManager.invalidateCollection(collectionName)
  }

  // ====================
  // MÉTRIQUES ET MONITORING
  // ====================

  /**
   * Obtenir les métriques de performance
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheStats: cacheManager.getStats(),
      activeListeners: this.connectionPool.size + this.listeners.size,
      connectionPoolSize: this.connectionPool.size,
      legacyListenersSize: this.listeners.size,
      cacheHitRatio: this.metrics.cacheHits > 0
        ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses))
        : 0
    }
  }

  getNetworkBalanceDocRef() {
    return doc(db, FIRESTORE_CONFIG.COLLECTIONS.NETWORK_BALANCES, CURRENT_BALANCE_DOC_ID)
  }

  normalizeNetworkBalances(data = {}) {
    const source = data.balances || data
    const normalized = { ...DEFAULT_NETWORK_BALANCES }

    Object.entries(source || {}).forEach(([network, value]) => {
      if (!value || typeof value !== 'object') return

      normalized[network] = {
        stock: Math.max(0, Number(value.stock) || 0),
        liquidite: Math.max(0, Number(value.liquidite) || 0)
      }
    })

    return normalized
  }

  adjustBalanceValue(balances, network, field, delta) {
    const next = { ...balances }
    const current = next[network] || { stock: 0, liquidite: 0 }
    const currentValue = Number(current[field]) || 0

    if (delta < 0 && currentValue + delta < 0) {
      throw new Error(`${field === 'stock' ? 'Stock' : 'Liquidite'} insuffisant pour ${network}`)
    }

    next[network] = {
      ...current,
      [field]: currentValue + delta
    }

    return next
  }

  applyLiquidityDelta(balances, delta) {
    const networks = Object.keys(balances)
    const firstNetwork = networks[0] || 'Orange'

    if (delta >= 0) {
      return this.adjustBalanceValue(balances, firstNetwork, 'liquidite', delta)
    }

    let remaining = Math.abs(delta)
    let next = { ...balances }

    for (const network of networks) {
      if (remaining <= 0) break

      const currentLiquidity = Number(next[network]?.liquidite) || 0
      const amountToRemove = Math.min(currentLiquidity, remaining)
      next = this.adjustBalanceValue(next, network, 'liquidite', -amountToRemove)
      remaining -= amountToRemove
    }

    if (remaining > 0) {
      throw new Error('Liquidite insuffisante pour cette operation')
    }

    return next
  }

  applyInitialTransactionImpact(balances, transactionData) {
    const amount = Number(transactionData.montant) || 0
    const network = transactionData.reseau

    if (transactionData.statut === FIRESTORE_CONFIG.STATUS.PENDING) {
      if (transactionData.type === 'Depot' || transactionData.type === 'Dépôt' || transactionData.type === 'Crédit') {
        return this.adjustBalanceValue(balances, network, 'stock', -amount)
      }

      if (transactionData.type === 'Retrait') {
        return this.adjustBalanceValue(balances, network, 'stock', amount)
      }
    }

    if (transactionData.statut === FIRESTORE_CONFIG.STATUS.VALIDATED) {
      if (transactionData.type === 'Depot' || transactionData.type === 'Dépôt') {
        return this.applyLiquidityDelta(
          this.adjustBalanceValue(balances, network, 'stock', -amount),
          amount
        )
      }

      if (transactionData.type === 'Retrait') {
        return this.applyLiquidityDelta(
          this.adjustBalanceValue(balances, network, 'stock', amount),
          -amount
        )
      }
    }

    return balances
  }

  applySettlementImpact(balances, amount, paymentMethod) {
    const targetNetwork = this.mapPaymentMethodToNetwork(paymentMethod)

    if (targetNetwork === 'Liquidite') {
      return this.applyLiquidityDelta(balances, amount)
    }

    return this.adjustBalanceValue(balances, targetNetwork, 'stock', amount)
  }

  async setNetworkBalances(balances) {
    const normalizedBalances = this.normalizeNetworkBalances(balances)

    await setDoc(this.getNetworkBalanceDocRef(), {
      balances: normalizedBalances,
      updatedAt: serverTimestamp()
    }, { merge: true })

    return normalizedBalances
  }

  async ensureNetworkBalances(initialBalances) {
    return runTransaction(db, async (tx) => {
      const balanceRef = this.getNetworkBalanceDocRef()
      const balanceSnap = await tx.get(balanceRef)

      if (balanceSnap.exists()) {
        return this.normalizeNetworkBalances(balanceSnap.data())
      }

      const normalizedBalances = this.normalizeNetworkBalances(initialBalances)
      tx.set(balanceRef, {
        balances: normalizedBalances,
        updatedAt: serverTimestamp()
      })

      return normalizedBalances
    })
  }

  async setNetworkBalance(network, type, amount) {
    return runTransaction(db, async (tx) => {
      const balanceRef = this.getNetworkBalanceDocRef()
      const balanceSnap = await tx.get(balanceRef)
      const currentBalances = this.normalizeNetworkBalances(balanceSnap.exists() ? balanceSnap.data() : {})
      const nextBalances = {
        ...currentBalances,
        [network]: {
          ...(currentBalances[network] || { stock: 0, liquidite: 0 }),
          [type]: Math.max(0, Number(amount) || 0)
        }
      }

      tx.set(balanceRef, {
        balances: nextBalances,
        updatedAt: serverTimestamp()
      }, { merge: true })

      return nextBalances
    })
  }

  subscribeToNetworkBalances(callback) {
    return onSnapshot(this.getNetworkBalanceDocRef(),
      (snapshot) => {
        callback(this.normalizeNetworkBalances(snapshot.exists() ? snapshot.data() : {}))
      },
      (error) => {
        console.error('Network balances subscription error:', error)
      }
    )
  }

  /**
   * Reset des métriques
   */
  resetMetrics() {
    this.metrics = {
      operations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0
    }
  }

  /**
   * Health check du service
   */
  async healthCheck() {
    try {
      // Test basique de connexion
      const testQuery = query(collection(db, 'test'), limit(1))
      await getDocs(testQuery)

      const metrics = this.getMetrics()

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        metrics,
        connectionPool: {
          size: this.connectionPool.size,
          connections: Array.from(this.connectionPool.keys())
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
        metrics: this.getMetrics()
      }
    }
  }

  // ====================
  // FONCTIONS SPÉCIALISÉES POUR CHAQUE COLLECTION
  // ====================

  // CLIENTS
  async getClients() {
    return this.getCollection(FIRESTORE_CONFIG.COLLECTIONS.CLIENTS)
  }

  async addClient(clientData) {
    return this.addDocument(FIRESTORE_CONFIG.COLLECTIONS.CLIENTS, {
      ...clientData,
      dateAjout: new Date().toLocaleDateString('fr-FR')
    })
  }

  async updateClient(clientId, updates) {
    return this.updateDocument(FIRESTORE_CONFIG.COLLECTIONS.CLIENTS, clientId, updates)
  }

  async deleteClient(clientId) {
    return this.deleteDocument(FIRESTORE_CONFIG.COLLECTIONS.CLIENTS, clientId)
  }

  subscribeToClients(callback) {
    // Version simplifiée qui bypasse le système complexe
    const collectionRef = collection(db, FIRESTORE_CONFIG.COLLECTIONS.CLIENTS)

    return onSnapshot(collectionRef,
      (snapshot) => {
        try {
          const documents = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))

          callback(documents)
        } catch (error) {
          console.error('Clients snapshot processing error:', error)
        }
      },
      (error) => {
        console.error('Clients subscription error:', error)
      }
    )
  }

  // DRAFTS (Transactions non terminées)
  async getDrafts() {
    return this.getCollection(FIRESTORE_CONFIG.COLLECTIONS.DRAFTS)
  }

  async addDraft(transactionData) {
    return this.addDocument(FIRESTORE_CONFIG.COLLECTIONS.DRAFTS, {
      ...transactionData,
      statut: FIRESTORE_CONFIG.STATUS.PENDING,
      date: new Date().toLocaleDateString('fr-FR')
    })
  }

  async updateDraft(draftId, updates) {
    return this.updateDocument(FIRESTORE_CONFIG.COLLECTIONS.DRAFTS, draftId, updates)
  }

  async deleteDraft(draftId) {
    return this.deleteDocument(FIRESTORE_CONFIG.COLLECTIONS.DRAFTS, draftId)
  }

  subscribeToDrafts(callback) {
    const collectionRef = collection(db, FIRESTORE_CONFIG.COLLECTIONS.DRAFTS)

    return onSnapshot(collectionRef,
      (snapshot) => {
        try {
          const documents = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          callback(documents)
        } catch (error) {
          console.error('Drafts snapshot processing error:', error)
        }
      },
      (error) => {
        console.error('Drafts subscription error:', error)
      }
    )
  }

  // HISTORY (Transactions terminées)
  async getHistory() {
    return this.getCollection(FIRESTORE_CONFIG.COLLECTIONS.HISTORY)
  }

  async addToHistory(transactionData) {
    return this.addDocument(FIRESTORE_CONFIG.COLLECTIONS.HISTORY, {
      ...transactionData,
      date: new Date().toLocaleDateString('fr-FR')
    })
  }

  async addTransaction(transactionData) {
    return runTransaction(db, async (tx) => {
      const balanceRef = this.getNetworkBalanceDocRef()
      const balanceSnap = await tx.get(balanceRef)
      const currentBalances = this.normalizeNetworkBalances(balanceSnap.exists() ? balanceSnap.data() : {})
      const nextBalances = this.applyInitialTransactionImpact(currentBalances, transactionData)
      const targetCollection = transactionData.statut === FIRESTORE_CONFIG.STATUS.PENDING
        ? FIRESTORE_CONFIG.COLLECTIONS.DRAFTS
        : FIRESTORE_CONFIG.COLLECTIONS.HISTORY
      const transactionRef = doc(collection(db, targetCollection))
      const now = serverTimestamp()
      const transactionPayload = {
        ...transactionData,
        date: new Date().toLocaleDateString('fr-FR'),
        createdAt: now,
        updatedAt: now
      }

      tx.set(transactionRef, transactionPayload)
      tx.set(balanceRef, {
        balances: nextBalances,
        updatedAt: now
      }, { merge: true })

      return { id: transactionRef.id, ...transactionPayload }
    })
  }

  async deleteFromHistory(historyId) {
    return this.deleteDocument(FIRESTORE_CONFIG.COLLECTIONS.HISTORY, historyId)
  }

  subscribeToHistory(callback, filters = {}) {
    let queryOptions = {
      // ⚠️ Pas de orderByField pour inclure TOUS les éléments d'historique, même sans createdAt
      // orderByField: 'createdAt',
      // orderDirection: 'desc'
    }

    // Ajouter des filtres si spécifiés
    if (filters.clientId || filters.dateRange) {
      queryOptions.where = []

      if (filters.clientId) {
        queryOptions.where.push({
          field: 'clientId',
          operator: '==',
          value: filters.clientId
        })
      }

      if (filters.dateRange) {
        if (filters.dateRange.start) {
          queryOptions.where.push({
            field: 'createdAt',
            operator: '>=',
            value: filters.dateRange.start
          })
        }
        if (filters.dateRange.end) {
          queryOptions.where.push({
            field: 'createdAt',
            operator: '<=',
            value: filters.dateRange.end
          })
        }
      }
    }

    return this.subscribeToCollection(FIRESTORE_CONFIG.COLLECTIONS.HISTORY, callback, queryOptions)
  }

  // Helper pour mapper les méthodes de paiement aux réseaux
  mapPaymentMethodToNetwork(paymentMethod) {
    const mapping = {
      'Orange Money': 'Orange',
      'Moov Money': 'Moov',
      'Sank Money': 'Sank',
      'Coris Money': 'Coris',
      'Telecel Money': 'Telecel',
      'Cash': 'Liquidite'
    }
    return mapping[paymentMethod] || paymentMethod
  }

  // VALIDATION DE TRANSACTION (Drafts → History)
  async validateTransaction(draftId, customStatus = 'Validée', selectedPaymentMethod = null) {
    try {
      // 1. Récupérer la transaction draft directement par ID
      const draftDocRef = doc(db, FIRESTORE_CONFIG.COLLECTIONS.DRAFTS, draftId)
      const draftDoc = await getDoc(draftDocRef)

      if (!draftDoc.exists()) {
        console.warn(`Transaction draft ${draftId} n'existe pas ou a déjà été supprimée`)
        return false
      }

      const transactionData = draftDoc.data()

      // 2. Vérifier que les données sont valides avant de les ajouter à l'historique
      if (!transactionData.clientId || !transactionData.type || !transactionData.montant) {
        console.warn(`Transaction draft ${draftId} a des données incomplètes:`, transactionData)
        return false
      }

      // 3. Extraire la méthode de paiement du statut si pas fournie explicitement
      let effectivePaymentMethod = selectedPaymentMethod
      if (!effectivePaymentMethod && customStatus !== 'Validée') {
        // Extraire de "Payé par Orange Money" => "Orange Money"
        const match = customStatus.match(/(?:Payé|Remboursé|Encaissé) par (.+)$/)
        if (match) {
          effectivePaymentMethod = match[1]
        }
      }

      const effectiveNetworkMapped = effectivePaymentMethod ? this.mapPaymentMethodToNetwork(effectivePaymentMethod) : transactionData.reseau
      return await runTransaction(db, async (tx) => {
        const lockedDraftDoc = await tx.get(draftDocRef)

        if (!lockedDraftDoc.exists()) {
          return false
        }

        const lockedTransactionData = lockedDraftDoc.data()
        const balanceRef = this.getNetworkBalanceDocRef()
        const balanceSnap = await tx.get(balanceRef)
        const currentBalances = this.normalizeNetworkBalances(balanceSnap.exists() ? balanceSnap.data() : {})
        const nextBalances = effectivePaymentMethod
          ? this.applySettlementImpact(currentBalances, Number(lockedTransactionData.montant) || 0, effectivePaymentMethod)
          : currentBalances
        const now = serverTimestamp()
        const historyData = {
          ...lockedTransactionData,
          statut: customStatus,
          paymentMethod: effectivePaymentMethod,
          effectiveNetwork: effectiveNetworkMapped,
          validatedAt: now,
          updatedAt: now
        }

        const historyRef = doc(collection(db, FIRESTORE_CONFIG.COLLECTIONS.HISTORY))
        tx.set(historyRef, historyData)
        tx.delete(draftDocRef)
        tx.set(balanceRef, {
          balances: nextBalances,
          updatedAt: now
        }, { merge: true })

        return true
      })
    } catch (error) {
      console.error('Transaction validation error:', error)
      throw error
    }
  }

  // MIGRATION DES DONNÉES LOCALSTORAGE
  async migrateLocalStorageData(localStorageData) {
    try {
      const { clients = [], pendingTransactions = [], completedTransactions = [] } = localStorageData

      // Migrer les clients d'abord
      const migratedClients = []
      for (const client of clients) {
        const addedClient = await this.addClient(client)
        migratedClients.push(addedClient)
      }

      // Helper pour corriger les transactions sans clientId
      const fixTransactionClientId = (transaction) => {
        // Si la transaction a déjà un clientId valide, on la garde
        if (transaction.clientId) {
          return transaction
        }

        // Sinon, essayer de trouver le client par nom/prénom
        if (transaction.client) {
          const matchingClient = migratedClients.find(c =>
            c.nom === transaction.client.nom &&
            c.prenom === transaction.client.prenom
          )

          if (matchingClient) {
            return {
              ...transaction,
              clientId: matchingClient.id,
              client: matchingClient
            }
          }
        }

        // Si on ne peut pas associer un clientId, on ignore cette transaction
        console.warn('Transaction ignorée - impossible de déterminer clientId:', transaction)
        return null
      }

      // Migrer les transactions en attente vers drafts
      for (const transaction of pendingTransactions) {
        const fixedTransaction = fixTransactionClientId(transaction)
        if (fixedTransaction) {
          await this.addDraft(fixedTransaction)
        }
      }

      // Migrer les transactions terminées vers history
      for (const transaction of completedTransactions) {
        const fixedTransaction = fixTransactionClientId(transaction)
        if (fixedTransaction) {
          await this.addToHistory(fixedTransaction)
        }
      }

      return true
    } catch (error) {
      console.error('Data migration failed:', error.message)
      throw error
    }
  }
}

// Instance singleton du service
export const firestoreService = new FirestoreService()

// Exports de fonctions spécialisées pour faciliter l'utilisation
export const {
  getClients,
  addClient,
  updateClient,
  deleteClient,
  subscribeToClients,
  getDrafts,
  addDraft,
  updateDraft,
  deleteDraft,
  subscribeToDrafts,
  getHistory,
  addToHistory,
  deleteFromHistory,
  subscribeToHistory,
  validateTransaction,
  migrateLocalStorageData,
  unsubscribeAll,
  unsubscribeFromCollection
} = firestoreService
