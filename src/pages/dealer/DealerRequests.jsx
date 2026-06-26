import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { listDealerRequests } from '../../services/dealerService'
import { formatCurrency } from '../../utils/formatCurrency'
import {
  DEALER_REQUEST_STATUS_LABELS,
  DEALER_REQUEST_TYPE_LABELS,
  DEALER_REQUEST_STATUSES,
  DEALER_NETWORK,
} from '../../constants/dealerConstants'

// ---------------------------------------------------------------------------
// Statut badge
// ---------------------------------------------------------------------------

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

function StatusBadge({ status }) {
  const label = DEALER_REQUEST_STATUS_LABELS[status] ?? status
  const style = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}
      aria-label={`Statut : ${label}`}
      data-testid={`status-badge-${status}`}
    >
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Formatage date — Firestore Timestamp ou Date
// ---------------------------------------------------------------------------

function formatDate(ts) {
  if (!ts) return '—'
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  if (!Number.isFinite(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// DealerRequests
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: DEALER_REQUEST_STATUSES.PENDING, label: DEALER_REQUEST_STATUS_LABELS.pending },
  { value: DEALER_REQUEST_STATUSES.CONFIRMED, label: DEALER_REQUEST_STATUS_LABELS.confirmed },
  { value: DEALER_REQUEST_STATUSES.REJECTED, label: DEALER_REQUEST_STATUS_LABELS.rejected },
]

function DealerRequests() {
  const { currentUser, userProfile } = useAuth()
  const navigate = useNavigate()

  const [requests, setRequests] = useState([])
  const [lastDoc, setLastDoc] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  // Filtres
  const [statusFilter, setStatusFilter] = useState('')
  const [storeSearch, setStoreSearch] = useState('')

  // ---------------------------------------------------------------------------
  // Chargement initial / rechargement
  // ---------------------------------------------------------------------------

  const loadRequests = useCallback(async (status) => {
    setLoading(true)
    setError(null)
    setRequests([])
    setLastDoc(null)
    setHasMore(false)
    try {
      const result = await listDealerRequests({
        currentUser,
        userProfile,
        statusFilter: status || null,
        lastDoc: null,
      })
      setRequests(result.requests)
      setLastDoc(result.lastDoc)
      setHasMore(result.hasMore)
      setHasLoaded(true)
    } catch (err) {
      setError(err.message)
      setHasLoaded(true)
    } finally {
      setLoading(false)
    }
  }, [currentUser, userProfile])

  // ---------------------------------------------------------------------------
  // Page suivante
  // ---------------------------------------------------------------------------

  const loadMore = useCallback(async () => {
    if (!lastDoc || loadingMore) return
    setLoadingMore(true)
    try {
      const result = await listDealerRequests({
        currentUser,
        userProfile,
        statusFilter: statusFilter || null,
        lastDoc,
      })
      setRequests(prev => [...prev, ...result.requests])
      setLastDoc(result.lastDoc)
      setHasMore(result.hasMore)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingMore(false)
    }
  }, [currentUser, userProfile, statusFilter, lastDoc, loadingMore])

  // Chargement automatique au montage
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadRequests('') }, [])

  // ---------------------------------------------------------------------------
  // Filtre statut change → recharge
  // ---------------------------------------------------------------------------

  function handleStatusChange(value) {
    setStatusFilter(value)
    loadRequests(value)
  }

  // ---------------------------------------------------------------------------
  // Filtre côté client sur le nom de boutique
  // ---------------------------------------------------------------------------

  const filtered = storeSearch.trim()
    ? requests.filter(r =>
        r.targetStoreName?.toLowerCase().includes(storeSearch.toLowerCase())
      )
    : requests

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-5xl mx-auto" data-testid="dealer-requests">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-bold text-gray-800">Mes demandes</h1>
        <button
          type="button"
          onClick={() => navigate('/dealer/requests/new')}
          className="rounded bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 transition-colors"
          data-testid="btn-new-request"
        >
          Nouvelle demande
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow p-4 mb-5 flex flex-wrap gap-4 items-end">
        {/* Statut */}
        <div className="flex-1 min-w-40">
          <label htmlFor="status-filter" className="block text-xs font-medium text-gray-600 mb-1">
            Statut
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={e => handleStatusChange(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
            aria-label="Filtrer par statut"
            data-testid="filter-status"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Recherche boutique */}
        <div className="flex-1 min-w-40">
          <label htmlFor="store-filter" className="block text-xs font-medium text-gray-600 mb-1">
            Boutique
          </label>
          <input
            id="store-filter"
            type="search"
            value={storeSearch}
            onChange={e => setStoreSearch(e.target.value)}
            placeholder="Nom de la boutique…"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
            aria-label="Filtrer par nom de boutique"
            data-testid="filter-store"
          />
        </div>

        {/* Actualiser */}
        <button
          type="button"
          onClick={() => loadRequests(statusFilter)}
          disabled={loading}
          className="rounded bg-gray-100 border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 transition-colors"
          aria-label="Actualiser la liste"
        >
          {loading ? 'Chargement…' : 'Actualiser'}
        </button>
      </div>

      {/* États */}
      {!hasLoaded && !loading && (
        <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500">
          Appuyez sur <strong>Actualiser</strong> pour charger vos demandes.
        </div>
      )}

      {loading && (
        <div className="space-y-3" aria-busy="true" aria-label="Chargement des demandes">
          {[1, 2, 3].map(n => (
            <div key={n} className="bg-white rounded-lg shadow p-4 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-5 w-20 bg-gray-200 rounded-full" />
              </div>
              <div className="mt-3 flex gap-6">
                <div className="h-4 w-24 bg-gray-200 rounded" />
                <div className="h-4 w-20 bg-gray-200 rounded" />
                <div className="h-4 w-28 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-5 text-red-700">
          <p className="font-medium mb-1">Erreur</p>
          <p className="text-sm">{error}</p>
          <button
            type="button"
            onClick={() => loadRequests(statusFilter)}
            className="mt-3 rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      )}

      {hasLoaded && !loading && !error && requests.length === 0 && (
        <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500" data-testid="empty-state">
          {statusFilter
            ? `Aucune demande avec le statut « ${DEALER_REQUEST_STATUS_LABELS[statusFilter] ?? statusFilter} ».`
            : 'Vous n\'avez pas encore de demande.'}
        </div>
      )}

      {/* Liste */}
      {!loading && !error && filtered.length > 0 && (
        <>
          {/* Tableau — scroll horizontal sur mobile */}
          <div className="bg-white rounded-lg shadow overflow-x-auto" data-testid="requests-table">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Boutique
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Réseau
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filtered.map(req => (
                  <tr key={req.id} data-testid={`request-row-${req.id}`}>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-800">
                      {req.targetStoreName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {DEALER_REQUEST_TYPE_LABELS[req.requestType] ?? req.requestType}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-800 font-medium">
                      {formatCurrency(req.amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {req.network ?? DEALER_NETWORK}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">
                      {formatDate(req.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Motif de rejet si présent */}
          {filtered.some(r => r.rejectionReason) && (
            <div className="mt-4 space-y-2">
              {filtered
                .filter(r => r.rejectionReason)
                .map(r => (
                  <div
                    key={r.id}
                    className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700"
                    data-testid={`rejection-${r.id}`}
                  >
                    <span className="font-medium">{r.targetStoreName}</span> : {r.rejectionReason}
                  </div>
                ))}
            </div>
          )}

          {/* Pagination Firestore */}
          {hasMore && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded bg-gray-100 border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 transition-colors"
                data-testid="btn-load-more"
              >
                {loadingMore ? 'Chargement…' : 'Voir plus'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default DealerRequests
