import { useState, useCallback, useEffect, useRef } from 'react'
import { listConsolidatedHistory } from '../../services/adminService'
import { formatCurrency } from '../../utils/formatCurrency'
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
  const [storeNameMap, setStoreNameMap] = useState(null)
  const [hasMore, setHasMore]         = useState(false)
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]             = useState(null)
  const [search, setSearch]           = useState('')

  const lastDocRef = useRef(null)

  const load = useCallback(async (reset, currentStoreMap = null) => {
    if (reset) {
      setLoading(true)
      setRecords([])
      lastDocRef.current = null
      setHasMore(false)
    } else {
      setLoadingMore(true)
    }
    setError(null)

    try {
      const result = await listConsolidatedHistory({
        lastDoc: reset ? null : lastDocRef.current,
        search,
        storeNameMap: currentStoreMap,
      })
      if (reset) {
        setRecords(result.records)
        if (result.storeNameMap) setStoreNameMap(result.storeNameMap)
      } else {
        setRecords(prev => {
          const combined = [...prev, ...result.records]
          combined.sort((a, b) => {
            const ta = a.createdAt?.toMillis?.() ?? (a.createdAt ? new Date(a.createdAt).getTime() : 0)
            const tb = b.createdAt?.toMillis?.() ?? (b.createdAt ? new Date(b.createdAt).getTime() : 0)
            return tb - ta
          })
          return combined
        })
      }
      lastDocRef.current = result.lastDoc
      setHasMore(result.hasMore)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [search])

  useEffect(() => {
    load(true, storeNameMap)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => {
    setStoreNameMap(null)
    load(true, null)
  }, [load])

  return (
    <div data-testid="admin-history" className="min-h-screen bg-gray-50/60">

      {/* ── Hero header ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-6 py-6 mb-6">
        <div className="flex items-start justify-between gap-4 max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Historique consolidé</h1>
            <p className="mt-0.5 text-sm text-gray-500">Transactions de toutes les boutiques — lecture seule</p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
          >
            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualiser
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-10 space-y-5">

        {/* ── Recherche ─────────────────────────────────────────────────────── */}
        <div>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher agent, boutique…"
            className="w-full max-w-md rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            aria-label="Rechercher dans la page courante"
          />
          <p className="mt-1 text-[11px] text-gray-400">Recherche dans la page courante (25 résultats max)</p>
        </div>

        {/* ── États ─────────────────────────────────────────────────────────── */}
        {loading && <SkeletonTable rows={8} cols={6} />}
        {error && <ErrorState message={error} onRetry={refresh} />}
        {!loading && !error && records.length === 0 && (
          <EmptyState title="Aucune transaction" message="Aucune transaction ne correspond aux critères sélectionnés." />
        )}

        {/* ── Tableau ───────────────────────────────────────────────────────── */}
        {!loading && !error && records.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50/80">
                  <tr className="text-left text-xs font-semibold uppercase tracking-widest text-gray-400">
                    <th className="px-5 py-3.5">Boutique</th>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5">Montant</th>
                    <th className="px-5 py-3.5">Statut</th>
                    <th className="px-5 py-3.5">Client</th>
                    <th className="px-5 py-3.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {records.map(r => (
                    <tr key={r.id + (r.storeId ?? '')} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <p className="text-sm font-semibold text-gray-800 truncate max-w-[140px]">{r.storeName ?? r.storeId ?? '—'}</p>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap text-xs">{r.type ?? '—'}</td>
                      <td className="px-5 py-3.5 font-semibold text-gray-900 whitespace-nowrap">
                        {r.montant != null ? formatCurrency(r.montant) : '—'}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {r.statut ? (
                          <StatusBadge status={statusVariant(r.statut)} label={r.statut} />
                        ) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap text-xs">{r.clientNom ?? r.clientId ?? '—'}</td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs whitespace-nowrap">{formatDate(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">{records.length} résultat{records.length > 1 ? 's' : ''} chargé{records.length > 1 ? 's' : ''}</p>
              {hasMore && (
                <button
                  type="button"
                  onClick={() => load(false, storeNameMap)}
                  disabled={loadingMore}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {loadingMore ? 'Chargement…' : 'Charger plus'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default AdminHistory
