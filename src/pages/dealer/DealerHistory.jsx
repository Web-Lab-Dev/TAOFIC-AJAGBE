import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { listDealerRequests } from '../../services/dealerService'
import { formatCurrency } from '../../utils/formatCurrency'
import {
  DEALER_REQUEST_STATUS_LABELS,
  DEALER_REQUEST_TYPE_LABELS,
  DEALER_REQUEST_STATUSES,
} from '../../constants/dealerConstants'
import PageHeader from '../../components/ui/PageHeader'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import StatusBadge from '../../components/ui/StatusBadge'
import { SkeletonTable } from '../../components/ui/SkeletonList'
import RejectionRemarkButton from '../../components/ui/RejectionRemarkButton'

function formatDate(ts) {
  if (!ts) return '—'
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  if (!Number.isFinite(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: DEALER_REQUEST_STATUSES.PENDING, label: DEALER_REQUEST_STATUS_LABELS.pending },
  { value: DEALER_REQUEST_STATUSES.CONFIRMED, label: DEALER_REQUEST_STATUS_LABELS.confirmed },
  { value: DEALER_REQUEST_STATUSES.REJECTED, label: DEALER_REQUEST_STATUS_LABELS.rejected },
]

function DealerHistory() {
  const { currentUser, userProfile } = useAuth()

  const [requests, setRequests]       = useState([])
  const [lastDoc, setLastDoc]         = useState(null)
  const [hasMore, setHasMore]         = useState(false)
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]             = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [storeSearch, setStoreSearch]   = useState('')

  const load = useCallback(async (reset = true) => {
    if (!currentUser || !userProfile) return
    if (reset) {
      setLoading(true)
      setRequests([])
      setLastDoc(null)
      setHasMore(false)
    } else {
      setLoadingMore(true)
    }
    setError(null)

    try {
      const result = await listDealerRequests({
        currentUser,
        userProfile,
        statusFilter: statusFilter || null,
        lastDoc: reset ? null : lastDoc,
      })
      if (reset) setRequests(result.requests)
      else setRequests(prev => [...prev, ...result.requests])
      setLastDoc(result.lastDoc)
      setHasMore(result.hasMore)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [currentUser, userProfile, statusFilter, lastDoc])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(true) }, [statusFilter, currentUser, userProfile])

  const filtered = storeSearch.trim()
    ? requests.filter(r => r.targetStoreName?.toLowerCase().includes(storeSearch.toLowerCase()))
    : requests

  return (
    <div data-testid="dealer-history">
      <PageHeader
        title="Historique"
        subtitle="Toutes mes demandes — ouvertures, ravitaillements, clôtures"
        actions={
          <button
            type="button"
            onClick={() => load(true)}
            disabled={loading}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          >
            {loading ? 'Chargement…' : 'Actualiser'}
          </button>
        }
      />

      {/* Filtres */}
      <div className="mb-5 flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
          aria-label="Filtrer par statut"
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input
          type="search"
          value={storeSearch}
          onChange={e => setStoreSearch(e.target.value)}
          placeholder="Filtrer par boutique…"
          className="flex-1 min-w-40 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
          aria-label="Rechercher par boutique"
        />
      </div>

      {loading && <SkeletonTable rows={6} cols={6} />}
      {error && <ErrorState message={error} onRetry={() => load(true)} />}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState title="Aucune demande" message="Aucune demande ne correspond aux critères sélectionnés." />
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-green-50/70">
                <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Boutique</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Montant</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Remarque</th>
                  <th className="px-4 py-3">Solde après</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{r.targetStoreName}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{DEALER_REQUEST_TYPE_LABELS[r.requestType] ?? r.requestType}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{formatCurrency(r.amount)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={r.status} label={DEALER_REQUEST_STATUS_LABELS[r.status] ?? r.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <RejectionRemarkButton
                        storeName={r.targetStoreName}
                        reason={r.status === DEALER_REQUEST_STATUSES.REJECTED ? r.rejectionReason : null}
                        testId={`remark-btn-${r.id}`}
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {r.newBalance != null ? formatCurrency(r.newBalance) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => load(false)}
                disabled={loadingMore}
                className="rounded-lg border border-gray-200 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                {loadingMore ? 'Chargement…' : 'Charger plus'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default DealerHistory
