import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { listActiveStores, createDealerRequest, parseDealerAmount } from '../../services/dealerService'
import { formatCurrency } from '../../utils/formatCurrency'
import {
  DEALER_REQUEST_TYPES,
  DEALER_REQUEST_TYPE_LABELS,
  DEALER_NETWORK,
} from '../../constants/dealerConstants'

// ---------------------------------------------------------------------------
// Validation montant côté formulaire (messages utilisateur)
// ---------------------------------------------------------------------------

function validateAmount(raw) {
  const s = String(raw ?? '').trim()
  if (s === '') return 'Le montant est obligatoire.'
  if (!/^[0-9]+$/.test(s)) return 'Entier uniquement (pas de virgule, de point ni de notation scientifique).'
  const n = Number(s)
  if (!Number.isSafeInteger(n) || n <= 0) return 'Le montant doit être un entier strictement positif.'
  return null
}

// ---------------------------------------------------------------------------
// NewDealerRequest
// ---------------------------------------------------------------------------

function NewDealerRequest() {
  const { currentUser, userProfile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Pré-remplissage depuis les query params
  const preStoreId = searchParams.get('storeId') || ''
  const preType = searchParams.get('type') || ''

  const [stores, setStores] = useState([])
  const [storesLoading, setStoresLoading] = useState(true)
  const [storesError, setStoresError] = useState(null)

  const [selectedStoreId, setSelectedStoreId] = useState(preStoreId)
  const [requestType, setRequestType] = useState(
    Object.values(DEALER_REQUEST_TYPES).includes(preType) ? preType : ''
  )
  const [amountRaw, setAmountRaw] = useState('')
  const [amountError, setAmountError] = useState(null)

  const [step, setStep] = useState('form') // 'form' | 'confirm'
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // Verrou anti-double-clic (en complément du isSubmitting)
  const submitLockRef = useRef(false)

  // Chargement des boutiques (première page seulement, pas de pagination dans le formulaire)
  useEffect(() => {
    let cancelled = false
    listActiveStores()
      .then(result => { if (!cancelled) { setStores(result.stores); setStoresLoading(false) } })
      .catch(err => { if (!cancelled) { setStoresError(err.message); setStoresLoading(false) } })
    return () => { cancelled = true }
  }, [])

  // Mettre à jour le storeId sélectionné si les stores arrivent après le pré-remplissage
  useEffect(() => {
    if (preStoreId && stores.length > 0) {
      const exists = stores.some(s => s.id === preStoreId)
      if (!exists) setSelectedStoreId('')
    }
  }, [stores, preStoreId])

  const selectedStore = stores.find(s => s.id === selectedStoreId) || null

  // ---------------------------------------------------------------------------
  // Validation du formulaire et passage à l'écran de confirmation
  // ---------------------------------------------------------------------------

  const handleReview = useCallback(() => {
    // Boutique
    if (!selectedStoreId) return
    // Type
    if (!requestType) return
    // Montant
    const err = validateAmount(amountRaw)
    if (err) { setAmountError(err); return }
    setAmountError(null)
    setSubmitError(null)
    setStep('confirm')
  }, [selectedStoreId, requestType, amountRaw])

  // ---------------------------------------------------------------------------
  // Soumission finale
  // ---------------------------------------------------------------------------

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
        requestType,
        amount: parseDealerAmount(amountRaw),
      })
      navigate('/dealer/requests', { replace: true })
    } catch (err) {
      setSubmitError(err.message)
      setStep('form')
    } finally {
      submitLockRef.current = false
      setIsSubmitting(false)
    }
  }, [currentUser, userProfile, selectedStoreId, requestType, amountRaw, navigate, isSubmitting])

  // ---------------------------------------------------------------------------
  // Render — état chargement boutiques
  // ---------------------------------------------------------------------------

  if (storesLoading) {
    return (
      <div className="max-w-xl mx-auto" data-testid="new-dealer-request">
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500 animate-pulse">
          Chargement des boutiques…
        </div>
      </div>
    )
  }

  if (storesError) {
    return (
      <div className="max-w-xl mx-auto" data-testid="new-dealer-request">
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-5 text-red-700">
          <p className="font-medium">Impossible de charger les boutiques</p>
          <p className="text-sm mt-1">{storesError}</p>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render — écran de confirmation
  // ---------------------------------------------------------------------------

  if (step === 'confirm') {
    const parsedAmt = parseDealerAmount(amountRaw)
    return (
      <div className="max-w-xl mx-auto" data-testid="new-dealer-request">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-lg font-bold text-gray-800 mb-5">Confirmer la demande</h1>

          <dl className="divide-y divide-gray-100 mb-6">
            <div className="flex py-3">
              <dt className="w-36 flex-shrink-0 text-sm text-gray-500">Boutique</dt>
              <dd className="text-sm font-medium text-gray-800" data-testid="confirm-store">
                {selectedStore?.name ?? selectedStoreId}
              </dd>
            </div>
            <div className="flex py-3">
              <dt className="w-36 flex-shrink-0 text-sm text-gray-500">Type</dt>
              <dd className="text-sm font-medium text-gray-800" data-testid="confirm-type">
                {DEALER_REQUEST_TYPE_LABELS[requestType]}
              </dd>
            </div>
            <div className="flex py-3">
              <dt className="w-36 flex-shrink-0 text-sm text-gray-500">Montant</dt>
              <dd className="text-sm font-semibold text-gray-800" data-testid="confirm-amount">
                {formatCurrency(parsedAmt)}
              </dd>
            </div>
            <div className="flex py-3">
              <dt className="w-36 flex-shrink-0 text-sm text-gray-500">Réseau</dt>
              <dd className="text-sm font-medium text-gray-800">{DEALER_NETWORK}</dd>
            </div>
          </dl>

          {submitError && (
            <div role="alert" className="mb-4 rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setStep('form'); setSubmitError(null) }}
              disabled={isSubmitting}
              className="flex-1 rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 transition-colors"
              data-testid="btn-cancel-confirm"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 rounded bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 transition-colors"
              aria-busy={isSubmitting}
              data-testid="btn-submit-confirm"
            >
              {isSubmitting ? 'Envoi en cours…' : 'Confirmer'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render — formulaire
  // ---------------------------------------------------------------------------

  const canReview = selectedStoreId && requestType && amountRaw.trim() !== ''

  return (
    <div className="max-w-xl mx-auto" data-testid="new-dealer-request">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-lg font-bold text-gray-800 mb-5">Nouvelle demande</h1>

        {submitError && (
          <div role="alert" className="mb-4 rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <form
          onSubmit={e => { e.preventDefault(); handleReview() }}
          noValidate
        >
          {/* Boutique */}
          <div className="mb-4">
            <label
              htmlFor="store-select"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Boutique <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <select
              id="store-select"
              value={selectedStoreId}
              onChange={e => setSelectedStoreId(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              aria-required="true"
              data-testid="select-store"
            >
              <option value="">— Sélectionner une boutique —</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {!selectedStoreId && (
              <p id="store-hint" className="mt-1 text-xs text-gray-500">
                Seules les boutiques actives sont listées.
              </p>
            )}
          </div>

          {/* Type */}
          <div className="mb-4">
            <fieldset>
              <legend className="block text-sm font-medium text-gray-700 mb-2">
                Type de demande <span aria-hidden="true" className="text-red-500">*</span>
              </legend>
              <div className="flex gap-4">
                {Object.entries(DEALER_REQUEST_TYPE_LABELS).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 cursor-pointer text-sm"
                    data-testid={`radio-type-${value}`}
                  >
                    <input
                      type="radio"
                      name="requestType"
                      value={value}
                      checked={requestType === value}
                      onChange={() => setRequestType(value)}
                      className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {/* Réseau (lecture seule) */}
          <div className="mb-4">
            <label
              htmlFor="network-display"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Réseau
            </label>
            <input
              id="network-display"
              type="text"
              value={DEALER_NETWORK}
              readOnly
              className="w-full rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
              aria-readonly="true"
              data-testid="network-display"
            />
          </div>

          {/* Montant */}
          <div className="mb-6">
            <label
              htmlFor="amount-input"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Montant (FCFA) <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <input
              id="amount-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={amountRaw}
              onChange={e => {
                setAmountRaw(e.target.value)
                if (amountError) setAmountError(null)
              }}
              placeholder="Ex : 50000"
              required
              className={`w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                amountError
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-400'
                  : 'border-gray-300 focus:border-green-500 focus:ring-green-500'
              }`}
              aria-required="true"
              aria-describedby={amountError ? 'amount-error' : 'amount-hint'}
              aria-invalid={amountError ? 'true' : undefined}
              data-testid="input-amount"
            />
            {amountError ? (
              <p id="amount-error" role="alert" className="mt-1 text-xs text-red-600">
                {amountError}
              </p>
            ) : (
              <p id="amount-hint" className="mt-1 text-xs text-gray-500">
                Entier positif uniquement, sans virgule ni point.
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/dealer/requests')}
              className="flex-1 rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 transition-colors"
              data-testid="btn-cancel-form"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!canReview}
              className="flex-1 rounded bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 transition-colors"
              data-testid="btn-review"
            >
              Vérifier
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NewDealerRequest
