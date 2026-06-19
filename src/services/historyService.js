/**
 * historyService.js — Orchestration Firestore des transactions historique
 *
 * Ce module contient toute la logique Firestore spécifique à l'historique :
 * - Ajout d'une transaction à l'historique (addToHistory)
 * - Suppression (soft-delete) avec inversion des soldes (deleteFromHistory)
 * - Abonnement temps réel à l'historique (subscribeToHistory)
 * - Lecture de l'historique (getHistory)
 *
 * Ce service ne contient pas de logique métier pure : il délègue
 * aux modules financialImpact.js (via le contexte).
 *
 * Injection de dépendances :
 *   Le constructeur reçoit toutes ses dépendances explicitement afin
 *   d'éviter les imports circulaires et les singletons cachés.
 *
 * Méthodes attendues sur ctx :
 *   requireActiveStore()                        → activeStore | throws
 *   getNetworkBalanceDocRef()                   → DocumentReference
 *   docRef(name, id)                            → DocumentReference
 *   addDocument(name, data)                     → Promise<doc>
 *   getCollection(name, opts?)                  → Promise<docs[]>
 *   subscribeToCollection(name, cb, opts)       → unsubscribe fn
 *   normalizeTransactionLabel(value)            → string
 *   normalizeNetworkBalances(data)              → object
 *   reverseHistoryTransactionImpact(balances, historyData) → object
 *   _validateFcfaAmount(raw, context)           → number | throws
 */

import {
  runTransaction,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { getUserFriendlyMessage } from '../utils/errorHandler'
import { formatDateToFrench } from '../utils/helpers'
import { FIRESTORE_CONFIG } from '../constants/firestoreConstants'

export class HistoryService {
  /**
   * @param {object} deps - Dépendances injectées
   * @param {object} deps.ctx - Objet contexte portant les méthodes (FirestoreService ou mock).
   *   Les méthodes sont appelées via deps.ctx.method() afin que les spies posés sur le
   *   contexte après construction soient honorés (pas de bind anticipé).
   */
  constructor(deps) {
    // Stocker le contexte vivant (pas de bind anticipé) pour que les spies
    // posés sur le contexte après construction soient honorés.
    this._ctx = deps.ctx
  }

  _requireActiveStore() { return this._ctx.requireActiveStore() }
  _getNetworkBalanceDocRef() { return this._ctx.getNetworkBalanceDocRef() }
  _docRef(name, id) { return this._ctx.docRef(name, id) }
  async _addDocument(name, data) { return this._ctx.addDocument(name, data) }
  async _getCollection(name, opts) { return this._ctx.getCollection(name, opts) }
  _subscribeToCollection(name, cb, opts) { return this._ctx.subscribeToCollection(name, cb, opts) }
  _normalizeTransactionLabel(value) { return this._ctx.normalizeTransactionLabel(value) }
  _normalizeNetworkBalances(data) { return this._ctx.normalizeNetworkBalances(data) }
  _reverseHistoryTransactionImpact(balances, historyData) { return this._ctx.reverseHistoryTransactionImpact(balances, historyData) }
  _validateFcfaAmount(raw, context) { return this._ctx._validateFcfaAmount(raw, context) }

  // ---------------------------------------------------------------------------
  // getHistory
  // ---------------------------------------------------------------------------

  async getHistory() {
    return this._getCollection(FIRESTORE_CONFIG.COLLECTIONS.HISTORY)
  }

  // ---------------------------------------------------------------------------
  // addToHistory
  // ---------------------------------------------------------------------------

  async addToHistory(transactionData) {
    this._validateFcfaAmount(transactionData.montant, 'addToHistory')
    return this._addDocument(FIRESTORE_CONFIG.COLLECTIONS.HISTORY, {
      ...transactionData,
      date: formatDateToFrench()
    })
  }

  // ---------------------------------------------------------------------------
  // deleteFromHistory
  // ---------------------------------------------------------------------------

  async deleteFromHistory(historyId) {
    this._requireActiveStore()
    try {
      return await runTransaction(db, async (tx) => {
        const historyRef = this._docRef(FIRESTORE_CONFIG.COLLECTIONS.HISTORY, historyId)
        const historySnap = await tx.get(historyRef)

        if (!historySnap.exists()) {
          throw new Error(`Transaction ${historyId} introuvable`)
        }

        const historyData = historySnap.data()

        if (this._normalizeTransactionLabel(historyData.statut) === this._normalizeTransactionLabel(FIRESTORE_CONFIG.STATUS.CANCELLED)) {
          return false
        }

        const balanceRef = this._getNetworkBalanceDocRef()
        const balanceSnap = await tx.get(balanceRef)

        if (!balanceSnap.exists()) {
          throw new Error('Impossible de lire networkBalances/current : document absent. Le renversement est annulé.')
        }
        const rawBalances = balanceSnap.data()
        const currentBalances = this._normalizeNetworkBalances(rawBalances)
        if (!currentBalances || typeof currentBalances !== 'object' || Array.isArray(currentBalances) || Object.keys(currentBalances).length === 0) {
          throw new Error('Données de soldes invalides ou absentes. Le renversement est annulé.')
        }

        const nextBalances = this._reverseHistoryTransactionImpact(currentBalances, historyData)
        const now = serverTimestamp()

        tx.update(historyRef, {
          statut: FIRESTORE_CONFIG.STATUS.CANCELLED,
          updatedAt: now,
        })
        tx.set(balanceRef, {
          balances: nextBalances,
          updatedAt: now,
        }, { merge: true })

        return true
      })
    } catch (error) {
      const friendlyMessage = getUserFriendlyMessage(error)
      const enhancedError = new Error(friendlyMessage)
      enhancedError.originalError = error
      throw enhancedError
    }
  }

  // ---------------------------------------------------------------------------
  // subscribeToHistory
  // ---------------------------------------------------------------------------

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

    return this._subscribeToCollection(FIRESTORE_CONFIG.COLLECTIONS.HISTORY, callback, queryOptions)
  }
}
