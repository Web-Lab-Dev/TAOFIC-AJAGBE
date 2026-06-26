import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getStoreAdminDealerRequestById } from '../../services/storeAdminDealerService'
import { formatStoredAmount } from '../../utils/formatCurrency'
import { formatFirestoreDate } from '../../utils/formatFirestoreDate'
import {
  DEALER_REQUEST_STATUS_LABELS,
  DEALER_REQUEST_TYPE_LABELS,
} from '../../constants/dealerConstants'

// ---------------------------------------------------------------------------
// Badges statut
// ---------------------------------------------------------------------------

const STATUS_STYLES = {
  pending:   'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  rejected:  'bg-red-100 text-red-800',
}

function StatusBadge({ status }) {
  const label = DEALER_REQUEST_STATUS_LABELS[status] ?? 'Statut inconnu'
  const style = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}
      aria-label={`Statut : ${label}`}
    >
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Helper d'affichage d'un champ (null/undefined → '—')
// ---------------------------------------------------------------------------

function Field({ label, value }) {
  return (
    <div className="flex py-3 border-b border-gray-100 last:border-0">
      <dt className="w-44 flex-shrink-0 text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-800 break-all">{value ?? '—'}</dd>
    </div>
  )
}

// ---------------------------------------------------------------------------
// StoreAdminDealerRequestDetails
// ---------------------------------------------------------------------------

function StoreAdminDealerRequestDetails() {
  const { currentUser, userProfile } = useAuth()
  const navigate = useNavigate()
  const { requestId } = useParams()

  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadRequest = useCallback(async (signal) => {
    setLoading(true)
    setError(null)
    setRequest(null)
    try {
      const data = await getStoreAdminDealerRequestById({ currentUser, userProfile, requestId })
      if (!signal.cancelled) { setRequest(data); setLoading(false) }
    } catch (err) {
      if (!signal.cancelled) { setError(err.message); setLoading(false) }
    }
  }, [currentUser, userProfile, requestId])

  useEffect(() => {
    const signal = { cancelled: false }
    loadRequest(signal)
    return () => { signal.cancelled = true }
  }, [loadRequest])

  // ---------------------------------------------------------------------------
  // Render — chargement
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto" data-testid="store-dealer-request-details">
        <div className="bg-white rounded-lg shadow p-8 animate-pulse">
          <div className="h-6 w-48 bg-gray-200 rounded mb-6" />
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="flex py-3 border-b border-gray-100">
              <div className="w-44 h-4 bg-gray-200 rounded mr-4" />
              <div className="flex-1 h-4 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render — erreur
  // ---------------------------------------------------------------------------

  if (error) {
    return (
      <div className="max-w-2xl mx-auto" data-testid="store-dealer-request-details">
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-5 text-red-700">
          <p className="font-medium mb-1">Erreur</p>
          <p className="text-sm">{error}</p>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/dealer-requests')}
              className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              data-testid="btn-back-error"
            >
              Retour à la liste
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render — détail
  // ---------------------------------------------------------------------------

  const typeLabel   = DEALER_REQUEST_TYPE_LABELS[request.requestType] ?? 'Type inconnu'
  const amountDisplay = formatStoredAmount(request.amount)

  return (
    <div className="max-w-2xl mx-auto" data-testid="store-dealer-request-details">
      {/* Retour */}
      <div className="mb-5">
        <button
          type="button"
          onClick={() => navigate('/dealer-requests')}
          className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          data-testid="btn-back"
        >
          ← Retour à la liste
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-800">Détail de la demande</h1>
            <p className="text-xs text-gray-400 mt-0.5 break-all">{request.id}</p>
          </div>
          <StatusBadge status={request.status} />
        </div>

        {/* Champs */}
        <dl>
          <Field label="Dealer" value={request.dealerName ?? 'Dealer inconnu'} />
          <Field label="Email Dealer" value={request.dealerEmail ?? 'Email indisponible'} />
          <Field label="Boutique ciblée" value={request.targetStoreName ?? 'Boutique inconnue'} />
          <Field label="Type" value={typeLabel} />
          <Field label="Montant" value={amountDisplay} />
          <Field label="Réseau" value={request.network ?? '—'} />
          <Field label="Statut" value={<StatusBadge status={request.status} />} />
          <Field label="Créée le" value={formatFirestoreDate(request.createdAt)} />
          <Field label="Mise à jour le" value={formatFirestoreDate(request.updatedAt)} />
          <Field label="Ancien solde" value={request.previousBalance != null ? formatStoredAmount(request.previousBalance) : '—'} />
          <Field label="Nouveau solde" value={request.newBalance != null ? formatStoredAmount(request.newBalance) : '—'} />
          <Field label="Confirmé par" value={request.confirmedBy ?? '—'} />
          <Field label="Confirmé le" value={request.confirmedAt ? formatFirestoreDate(request.confirmedAt) : '—'} />
          <Field label="Rejeté par" value={request.rejectedBy ?? '—'} />
          <Field label="Rejeté le" value={request.rejectedAt ? formatFirestoreDate(request.rejectedAt) : '—'} />
          <Field label="Motif du rejet" value={request.rejectionReason ?? '—'} />
        </dl>
      </div>
    </div>
  )
}

export default StoreAdminDealerRequestDetails
