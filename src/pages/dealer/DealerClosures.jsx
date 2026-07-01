import { useState, useCallback, useEffect, useRef } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { getDocs, query, collection, where, orderBy } from 'firebase/firestore'
import { useAuth } from '../../context/AuthContext.jsx'
import PageHeader from '../../components/ui/PageHeader'
import ErrorState from '../../components/ui/ErrorState'
import { listDealerOwnClosures } from '../../services/closureService'
import { db } from '../../config/firebase'

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function tsToDate(ts) {
  if (!ts) return null
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  return Number.isFinite(d.getTime()) ? d : null
}

function fmtDate(ts) {
  const d = tsToDate(ts)
  if (!d) return '—'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtAmount(n) {
  if (typeof n !== 'number') return '—'
  return n.toLocaleString('fr-FR') + ' FCFA'
}

function diffClass(v) {
  if (v === 0) return 'text-gray-500'
  return v > 0 ? 'text-green-600' : 'text-red-600'
}

const STATUS_LABELS = {
  pending:   { label: 'En attente',  cls: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmée',   cls: 'bg-green-100 text-green-700' },
  rejected:  { label: 'Rejetée',     cls: 'bg-red-100   text-red-700'  },
}

// ──────────────────────────────────────────────────────────────────────────────
// Formulaire de création
// ──────────────────────────────────────────────────────────────────────────────

function ClosureForm({ stores, onSuccess, onCancel }) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    targetStoreId: '',
    businessDate: today,
    declaredStockBalance: '',
    declaredLiquidityBalance: '',
    reason: '',
    network: 'Orange',
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState(null)

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)

    const stock    = parseInt(form.declaredStockBalance, 10)
    const liquidity = parseInt(form.declaredLiquidityBalance, 10)

    if (!form.targetStoreId) { setFormError('Sélectionnez une boutique.'); return }
    if (Number.isNaN(stock) || stock < 0) { setFormError('Solde stock invalide (entier ≥ 0).'); return }
    if (Number.isNaN(liquidity) || liquidity < 0) { setFormError('Solde liquidité invalide (entier ≥ 0).'); return }
    if (!form.businessDate) { setFormError('Date de clôture requise.'); return }
    if (form.businessDate > today) { setFormError('La date ne peut pas être dans le futur.'); return }

    setSubmitting(true)
    try {
      const fn = httpsCallable(getFunctions(undefined, 'europe-west1'), 'createDealerClosure')
      await fn({
        targetStoreId:            form.targetStoreId,
        businessDate:             form.businessDate,
        declaredStockBalance:     stock,
        declaredLiquidityBalance: liquidity,
        reason:                   form.reason,
        network:                  form.network,
      })
      onSuccess()
    } catch (err) {
      const msg = err?.details?.message ?? err?.message ?? 'Erreur inattendue.'
      setFormError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="closure-form">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Boutique ciblée</label>
        <select
          value={form.targetStoreId}
          onChange={e => set('targetStoreId', e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          required
          data-testid="closure-form-store"
        >
          <option value="">— Sélectionner une boutique —</option>
          {stores.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date de clôture</label>
        <input
          type="date"
          value={form.businessDate}
          max={today}
          onChange={e => set('businessDate', e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          required
          data-testid="closure-form-date"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Solde stock déclaré (FCFA)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={form.declaredStockBalance}
            onChange={e => set('declaredStockBalance', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            required
            placeholder="0"
            data-testid="closure-form-stock"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Solde liquidité déclaré (FCFA)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={form.declaredLiquidityBalance}
            onChange={e => set('declaredLiquidityBalance', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            required
            placeholder="0"
            data-testid="closure-form-liquidity"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Motif <span className="text-gray-400 font-normal">(obligatoire si écart constaté)</span>
        </label>
        <textarea
          value={form.reason}
          onChange={e => set('reason', e.target.value)}
          rows={3}
          maxLength={500}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 resize-none"
          placeholder="Expliquez l'écart éventuel…"
          data-testid="closure-form-reason"
        />
        <p className="text-xs text-gray-400 mt-0.5">{form.reason.length}/500</p>
      </div>

      {formError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" data-testid="closure-form-error">
          {formError}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          data-testid="closure-form-submit"
        >
          {submitting ? 'Envoi…' : 'Soumettre la clôture'}
        </button>
      </div>
    </form>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// DealerClosures
// ──────────────────────────────────────────────────────────────────────────────

function DealerClosures() {
  const { currentUser } = useAuth()
  const [closures, setClosures]         = useState([])
  const [loading,  setLoading]          = useState(true)
  const [error,    setError]            = useState(null)
  const [hasMore,  setHasMore]          = useState(false)
  const [showForm, setShowForm]         = useState(false)
  const [stores,   setStores]           = useState([])
  const lastDocRef = useRef(null)

  // Utilise listDealerOwnClosures — dealer lit ses clôtures via la règle dealerUid == uid
  const loadClosures = useCallback(async (reset = true) => {
    if (!currentUser?.uid) return
    setLoading(true)
    setError(null)
    try {
      const cursor = reset ? null : lastDocRef.current
      const result = await listDealerOwnClosures({ dealerUid: currentUser.uid, lastDoc: cursor })
      setClosures(prev => reset ? result.closures : [...prev, ...result.closures])
      setHasMore(result.hasMore)
      lastDocRef.current = result.lastDoc
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [currentUser?.uid])

  // Charge la liste des boutiques pour le formulaire
  const loadStores = useCallback(async () => {
    try {
      const snap = await getDocs(query(
        collection(db, 'stores'),
        where('active', '==', true),
        orderBy('name')
      ))
      setStores(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch {
      // non bloquant
    }
  }, [])

  useEffect(() => {
    loadClosures(true)
    loadStores()
  }, [loadClosures, loadStores])

  function handleFormSuccess() {
    setShowForm(false)
    loadClosures(true)
  }

  return (
    <div data-testid="dealer-closures">
      <PageHeader
        title="Clôtures"
        subtitle="Déclarez et suivez vos clôtures de session"
        actions={
          !showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              data-testid="closure-new-btn"
            >
              Nouvelle clôture
            </button>
          )
        }
      />

      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Déclarer une clôture</h2>
          <ClosureForm
            stores={stores}
            onSuccess={handleFormSuccess}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {loading && closures.length === 0 && (
        <div className="space-y-3">
          {[1,2,3].map(n => <div key={n} className="h-20 animate-pulse rounded-xl bg-gray-100" />)}
        </div>
      )}

      {error && <ErrorState message={error} onRetry={() => loadClosures(true)} />}

      {!loading && !error && closures.length === 0 && !showForm && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-12 text-center">
          <p className="text-base font-medium text-gray-600">Aucune clôture enregistrée</p>
          <p className="mt-1 text-sm text-gray-400">Cliquez sur "Nouvelle clôture" pour déclarer votre première clôture.</p>
        </div>
      )}

      {closures.length > 0 && (
        <div className="space-y-3" data-testid="closure-list">
          {closures.map(c => {
            const st = STATUS_LABELS[c.status] ?? { label: c.status, cls: 'bg-gray-100 text-gray-700' }
            return (
              <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{c.targetStoreName ?? c.targetStoreId}</p>
                    <p className="text-xs text-gray-500">Date : {c.businessDate} · Déclarée le {fmtDate(c.createdAt)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Stock déclaré</p>
                    <p className="font-medium text-gray-800">{fmtAmount(c.declaredStockBalance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Stock enregistré</p>
                    <p className="font-medium text-gray-800">{fmtAmount(c.recordedStockBalance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Liquidité déclarée</p>
                    <p className="font-medium text-gray-800">{fmtAmount(c.declaredLiquidityBalance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Liquidité enregistrée</p>
                    <p className="font-medium text-gray-800">{fmtAmount(c.recordedLiquidityBalance)}</p>
                  </div>
                </div>

                {(c.stockDifference !== 0 || c.liquidityDifference !== 0) && (
                  <div className="mt-3 flex flex-wrap gap-4 text-sm border-t border-gray-100 pt-3">
                    <div>
                      <span className="text-xs text-gray-400">Écart stock : </span>
                      <span className={`font-semibold ${diffClass(c.stockDifference)}`}>
                        {c.stockDifference > 0 ? '+' : ''}{fmtAmount(c.stockDifference)}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">Écart liquidité : </span>
                      <span className={`font-semibold ${diffClass(c.liquidityDifference)}`}>
                        {c.liquidityDifference > 0 ? '+' : ''}{fmtAmount(c.liquidityDifference)}
                      </span>
                    </div>
                  </div>
                )}

                {c.reason && (
                  <p className="mt-2 text-xs text-gray-500 italic">Motif : {c.reason}</p>
                )}
                {c.status === 'rejected' && c.rejectionReason && (
                  <p className="mt-2 text-xs text-red-600">Rejet : {c.rejectionReason}</p>
                )}
              </div>
            )
          })}

          {hasMore && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => loadClosures(false)}
                disabled={loading}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {loading ? 'Chargement…' : 'Charger plus'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DealerClosures
