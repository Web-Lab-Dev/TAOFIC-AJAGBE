import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { listActiveStores, createDealerRequest, parseDealerAmount } from '../../services/dealerService'
import { formatCurrency } from '../../utils/formatCurrency'
import { DEALER_REQUEST_TYPES, DEALER_NETWORK } from '../../constants/dealerConstants'
import PageHeader from '../../components/ui/PageHeader'
import ErrorState from '../../components/ui/ErrorState'

// ──────────────────────────────────────────────────────────────────────────────
// Validation montant
// ──────────────────────────────────────────────────────────────────────────────

function validateAmount(raw, label) {
  const s = String(raw ?? '').trim()
  if (s === '') return `${label} obligatoire.`
  if (!/^[0-9]+$/.test(s)) return 'Entier uniquement (pas de virgule).'
  const n = Number(s)
  if (!Number.isSafeInteger(n) || n <= 0) return 'Entier strictement positif requis.'
  return null
}

// ──────────────────────────────────────────────────────────────────────────────
// DealerDayOpen — Ouverture du jour
// ──────────────────────────────────────────────────────────────────────────────

function DealerDayOpen() {
  const { currentUser, userProfile } = useAuth()
  const navigate = useNavigate()

  const [stores, setStores]           = useState([])
  const [storesLoading, setStoresLoading] = useState(true)
  const [storesError, setStoresError]     = useState(null)

  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [stockRaw, setStockRaw]               = useState('')
  const [liquidityRaw, setLiquidityRaw]       = useState('')
  const [stockError, setStockError]           = useState(null)
  const [liquidityError, setLiquidityError]   = useState(null)

  const [step, setStep]           = useState('form') // 'form' | 'confirm'
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError]   = useState(null)
  const [success, setSuccess]           = useState(false)

  const submitLockRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    listActiveStores()
      .then(r => { if (!cancelled) { setStores(r.stores); setStoresLoading(false) } })
      .catch(e => { if (!cancelled) { setStoresError(e.message); setStoresLoading(false) } })
    return () => { cancelled = true }
  }, [])

  const selectedStore = stores.find(s => s.id === selectedStoreId) ?? null

  const handleReview = useCallback(() => {
    const sErr = validateAmount(stockRaw, 'Montant stock')
    const lErr = validateAmount(liquidityRaw, 'Montant liquidité')
    setStockError(sErr)
    setLiquidityError(lErr)
    if (!selectedStoreId || sErr || lErr) return
    setSubmitError(null)
    setStep('confirm')
  }, [selectedStoreId, stockRaw, liquidityRaw])

  const handleSubmit = useCallback(async () => {
    if (submitLockRef.current || isSubmitting) return
    submitLockRef.current = true
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await createDealerRequest({
        currentUser,
        userProfile,
        targetStoreId: selectedStoreId,
        requestType: DEALER_REQUEST_TYPES.OPEN_DAY,
        amount: parseDealerAmount(stockRaw),
        liquidityAmount: parseDealerAmount(liquidityRaw),
      })
      setSuccess(true)
    } catch (err) {
      setSubmitError(err.message)
      setStep('form')
    } finally {
      submitLockRef.current = false
      setIsSubmitting(false)
    }
  }, [currentUser, userProfile, selectedStoreId, stockRaw, liquidityRaw, isSubmitting])

  if (storesLoading) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center animate-pulse text-gray-400">
          Chargement des boutiques…
        </div>
      </div>
    )
  }

  if (storesError) return <ErrorState message={storesError} />

  // Succès
  if (success) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
          <p className="text-lg font-bold text-green-700">Ouverture envoyée</p>
          <p className="mt-2 text-sm text-green-600">
            La boutique <strong>{selectedStore?.name}</strong> doit confirmer la réception.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate('/dealer/requests')}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Voir mes demandes
            </button>
            <button
              type="button"
              onClick={() => { setSuccess(false); setStep('form'); setSelectedStoreId(''); setStockRaw(''); setLiquidityRaw('') }}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 transition-colors"
            >
              Nouvelle ouverture
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Écran de confirmation
  if (step === 'confirm') {
    return (
      <div className="max-w-xl mx-auto">
        <PageHeader title="Ouverture du jour" subtitle="Confirmer l'envoi à la boutique" />
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-5">Confirmer l'ouverture</h2>

          <dl className="divide-y divide-gray-100 mb-6 text-sm">
            {[
              ['Boutique', selectedStore?.name ?? selectedStoreId],
              ['Réseau', DEALER_NETWORK],
              ['Montant stock (FCFA)', formatCurrency(parseDealerAmount(stockRaw))],
              ['Montant liquidité (FCFA)', formatCurrency(parseDealerAmount(liquidityRaw))],
            ].map(([label, value]) => (
              <div key={label} className="flex py-2.5">
                <dt className="w-40 flex-shrink-0 text-gray-500">{label}</dt>
                <dd className="font-medium text-gray-800">{value}</dd>
              </div>
            ))}
          </dl>

          {submitError && (
            <div role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setStep('form'); setSubmitError(null) }}
              disabled={isSubmitting}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            >
              Modifier
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
              aria-busy={isSubmitting}
            >
              {isSubmitting ? 'Envoi…' : 'Confirmer l\'ouverture'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Formulaire
  const canReview = selectedStoreId && stockRaw.trim() && liquidityRaw.trim()

  return (
    <div className="max-w-xl mx-auto" data-testid="dealer-day-open">
      <PageHeader
        title="Ouverture du jour"
        subtitle="Déclarez les montants de départ stock et liquidité pour une boutique"
      />

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {submitError && (
          <div role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <form onSubmit={e => { e.preventDefault(); handleReview() }} noValidate>
          {/* Boutique */}
          <div className="mb-5">
            <label htmlFor="store-select" className="block text-sm font-medium text-gray-700 mb-1">
              Boutique <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <select
              id="store-select"
              value={selectedStoreId}
              onChange={e => setSelectedStoreId(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              aria-required="true"
            >
              <option value="">— Sélectionner une boutique —</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Réseau */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Réseau</label>
            <input
              type="text"
              value={DEALER_NETWORK}
              readOnly
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
            />
          </div>

          {/* Montant stock */}
          <div className="mb-5">
            <label htmlFor="stock-input" className="block text-sm font-medium text-gray-700 mb-1">
              Montant stock (FCFA) <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <input
              id="stock-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={stockRaw}
              onChange={e => { setStockRaw(e.target.value); if (stockError) setStockError(null) }}
              placeholder="Ex : 100000"
              required
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                stockError ? 'border-red-400 focus:border-red-500 focus:ring-red-400' : 'border-gray-300 focus:border-green-500 focus:ring-green-500'
              }`}
              aria-invalid={stockError ? 'true' : undefined}
            />
            {stockError && <p role="alert" className="mt-1 text-xs text-red-600">{stockError}</p>}
          </div>

          {/* Montant liquidité */}
          <div className="mb-6">
            <label htmlFor="liquidity-input" className="block text-sm font-medium text-gray-700 mb-1">
              Montant liquidité (FCFA) <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <input
              id="liquidity-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={liquidityRaw}
              onChange={e => { setLiquidityRaw(e.target.value); if (liquidityError) setLiquidityError(null) }}
              placeholder="Ex : 50000"
              required
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                liquidityError ? 'border-red-400 focus:border-red-500 focus:ring-red-400' : 'border-gray-300 focus:border-green-500 focus:ring-green-500'
              }`}
              aria-invalid={liquidityError ? 'true' : undefined}
            />
            {liquidityError && <p role="alert" className="mt-1 text-xs text-red-600">{liquidityError}</p>}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/dealer')}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!canReview}
              className="flex-1 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
            >
              Vérifier
            </button>
          </div>
        </form>

        <div className="mt-5 rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
          La boutique doit confirmer la réception avant que les soldes ne soient mis à jour.
          La confirmation est effectuée via la Cloud Function <code>confirmDealerRequest</code>.
        </div>
      </div>
    </div>
  )
}

export default DealerDayOpen
