import { useState, useCallback, useEffect } from 'react'
import { listConsolidatedHistory } from '../../services/adminService'
import { formatCurrency } from '../../utils/formatCurrency'
import PageHeader from '../../components/ui/PageHeader'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import StatusBadge from '../../components/ui/StatusBadge'
import { SkeletonTable } from '../../components/ui/SkeletonList'

function formatDate(ts) {
  if (!ts) return '—'
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  if (!Number.isFinite(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function statusVariant(statut) {
  if (!statut) return 'inactive'
  const s = String(statut).toLowerCase()
  if (s.includes('validée') || s.includes('validee') || s.includes('payé') || s.includes('encaissé')) return 'confirmed'
  if (s.includes('non terminée') || s.includes('non terminee')) return 'pending'
  if (s.includes('remboursée') || s.includes('remboursee') || s.includes('annulée') || s.includes('annulee')) return 'rejected'
  return 'inactive'
}

function AdminHistory() {
  const [records, setRecords]         = useState([])
  const [lastDoc, setLastDoc]         = useState(null)
  const [hasMore, setHasMore]         = useState(false)
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]             = useState(null)
  const [search, setSearch]           = useState('')

  const load = useCallback(async (reset = true) => {
    if (reset) {
      setLoading(true)
      setRecords([])
      setLastDoc(null)
      setHasMore(false)
    } else {
      setLoadingMore(true)
    }
    setError(null)

    try {
      const result = await listConsolidatedHistory({
        lastDoc: reset ? null : lastDoc,
        search,
      })
      if (reset) setRecords(result.records)
      else setRecords(prev => [...prev, ...result.records])
      setLastDoc(result.lastDoc)
      setHasMore(result.hasMore)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [search, lastDoc])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(true) }, [search])

  return (
    <div data-testid="admin-history">
      <PageHeader
        title="Historique consolidé"
        subtitle="Transactions de toutes les boutiques — lecture seule"
        actions={
          <button
            type="button"
            onClick={() => load(true)}
            disabled={loading}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {loading ? 'Chargement…' : 'Actualiser'}
          </button>
        }
      />

      <div className="mb-5">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher agent, boutique…"
          className="w-full max-w-md rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
          aria-label="Rechercher dans la page courante"
          title="Recherche dans la page courante (25 résultats max)"
        />
        <p className="mt-0.5 text-[11px] text-gray-400">Recherche dans la page courante</p>
      </div>

      {loading && <SkeletonTable rows={8} cols={6} />}
      {error && <ErrorState message={error} onRetry={() => load(true)} />}
      {!loading && !error && records.length === 0 && (
        <EmptyState title="Aucune transaction" message="Aucune transaction ne correspond aux critères sélectionnés." />
      )}

      {!loading && !error && records.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Boutique</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Montant</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map(r => (
                  <tr key={r.id + (r.storeId ?? '')} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">{r.storeId ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{r.type ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{r.montant != null ? formatCurrency(r.montant) : '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.statut ? (
                        <StatusBadge status={statusVariant(r.statut)} label={r.statut} />
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.clientNom ?? r.clientId ?? '—'}</td>
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
                className="rounded-lg border border-gray-200 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {loadingMore ? 'Chargement…' : 'Charger plus'}
              </button>
            </div>
          )}

          <p className="mt-3 text-xs text-gray-400">
            Données en lecture seule. La modification d'une transaction validée est interdite depuis cette interface.
          </p>
        </>
      )}
    </div>
  )
}

export default AdminHistory
