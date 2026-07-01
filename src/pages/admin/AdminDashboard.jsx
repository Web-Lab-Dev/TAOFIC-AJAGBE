import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getAdminDashboardCounts,
  getDealerRequestCounts,
  getUserCountsByRole,
  getRecentDealerRequests,
} from '../../services/adminService'
import { formatCurrency } from '../../utils/formatCurrency'
import StatCard from '../../components/ui/StatCard'
import PageHeader from '../../components/ui/PageHeader'
import ErrorState from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import StatusBadge from '../../components/ui/StatusBadge'
import { SkeletonCards } from '../../components/ui/SkeletonList'

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function formatDate(ts) {
  if (!ts) return '—'
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  if (!Number.isFinite(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_LABELS = { pending: 'En attente', confirmed: 'Confirmée', rejected: 'Rejetée' }
const TYPE_LABELS   = { stock_add: 'Ajout stock', liquidity_add: 'Ajout liquidité', open_day: 'Ouverture' }

// ──────────────────────────────────────────────────────────────────────────────
// Section KPI
// ──────────────────────────────────────────────────────────────────────────────

function KpiSection({ counts, reqCounts, roleCounts, loading, error, onRetry }) {
  if (error) return <ErrorState message={error} onRetry={onRetry} />

  if (loading) return <SkeletonCards count={6} />

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
      <StatCard label="Boutiques totales" value={counts?.totalStores} color="blue" icon="🏪" />
      <StatCard label="Boutiques actives" value={counts?.activeStores} color="green" icon="✅" />
      <StatCard label="Boutiques inactives" value={counts?.inactiveStores} color="red" icon="⚠️" />
      <StatCard label="Utilisateurs" value={counts?.totalUsers} color="indigo"
        sub={`Dealer: ${roleCounts?.dealer ?? '…'}  Admin: ${roleCounts?.store_admin ?? '…'}`} icon="👤" />
      <StatCard label="Agents/Clients" value={counts?.totalClients} color="teal" icon="👥" />
      <StatCard label="Demandes en attente" value={counts?.pendingRequests} color="amber"
        sub={`Confirmées: ${reqCounts?.confirmed ?? '…'}  Rejetées: ${reqCounts?.rejected ?? '…'}`} icon="📋" />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Section demandes récentes
// ──────────────────────────────────────────────────────────────────────────────

function RecentRequests({ requests, loading, error }) {
  if (error) return <ErrorState message={error} />
  if (loading) return (
    <div className="space-y-2">
      {[1, 2, 3].map(n => (
        <div key={n} className="h-12 animate-pulse rounded-lg bg-gray-100" />
      ))}
    </div>
  )
  if (!requests?.length) return <EmptyState title="Aucune demande récente" />

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-100 text-sm">
        <thead>
          <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="pb-2 pr-4">Boutique</th>
            <th className="pb-2 pr-4">Dealer</th>
            <th className="pb-2 pr-4">Type</th>
            <th className="pb-2 pr-4">Montant</th>
            <th className="pb-2 pr-4">Statut</th>
            <th className="pb-2">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {requests.map(r => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="py-2 pr-4 font-medium text-gray-800 whitespace-nowrap">{r.targetStoreName}</td>
              <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{r.dealerName}</td>
              <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{TYPE_LABELS[r.requestType] ?? r.requestType}</td>
              <td className="py-2 pr-4 font-medium text-gray-800 whitespace-nowrap">{formatCurrency(r.amount)}</td>
              <td className="py-2 pr-4 whitespace-nowrap">
                <StatusBadge status={r.status} label={STATUS_LABELS[r.status] ?? r.status} />
              </td>
              <td className="py-2 text-gray-500 whitespace-nowrap text-xs">{formatDate(r.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// AdminDashboard
// ──────────────────────────────────────────────────────────────────────────────

function AdminDashboard() {
  const navigate = useNavigate()

  const [counts, setCounts]         = useState(null)
  const [reqCounts, setReqCounts]   = useState(null)
  const [roleCounts, setRoleCounts] = useState(null)
  const [recentReqs, setRecentReqs] = useState([])

  const [kpiLoading, setKpiLoading]     = useState(true)
  const [kpiError, setKpiError]         = useState(null)
  const [reqsLoading, setReqsLoading]   = useState(true)
  const [reqsError, setReqsError]       = useState(null)

  const loadKpi = useCallback(async () => {
    setKpiLoading(true)
    setKpiError(null)
    try {
      const [c, rc, rolec] = await Promise.all([
        getAdminDashboardCounts(),
        getDealerRequestCounts(),
        getUserCountsByRole(),
      ])
      setCounts(c)
      setReqCounts(rc)
      setRoleCounts(rolec)
    } catch (err) {
      setKpiError(err.message)
    } finally {
      setKpiLoading(false)
    }
  }, [])

  const loadRecentReqs = useCallback(async () => {
    setReqsLoading(true)
    setReqsError(null)
    try {
      const reqs = await getRecentDealerRequests(8)
      setRecentReqs(reqs)
    } catch (err) {
      setReqsError(err.message)
    } finally {
      setReqsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadKpi()
    loadRecentReqs()
  }, [loadKpi, loadRecentReqs])

  return (
    <div data-testid="admin-home">
      <PageHeader
        title="Vue générale"
        subtitle="Tableau de bord global de la plateforme AKAYIS"
        actions={
          <button
            type="button"
            onClick={() => { loadKpi(); loadRecentReqs() }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Actualiser
          </button>
        }
      />

      {/* KPI */}
      <section aria-labelledby="kpi-heading" className="mb-8">
        <h2 id="kpi-heading" className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
          Indicateurs clés
        </h2>
        <KpiSection
          counts={counts}
          reqCounts={reqCounts}
          roleCounts={roleCounts}
          loading={kpiLoading}
          error={kpiError}
          onRetry={loadKpi}
        />
      </section>

      {/* Raccourcis */}
      <section aria-labelledby="shortcuts-heading" className="mb-8">
        <h2 id="shortcuts-heading" className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
          Raccourcis
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Gérer les boutiques', path: '/admin/stores', color: 'bg-blue-600' },
            { label: 'Voir les utilisateurs', path: '/admin/users', color: 'bg-indigo-600' },
            { label: 'Supervision Dealer', path: '/admin/dealer', color: 'bg-green-600' },
            { label: 'Alertes réseau', path: '/admin/alerts', color: 'bg-amber-600' },
          ].map(s => (
            <button
              key={s.path}
              type="button"
              onClick={() => navigate(s.path)}
              className={`${s.color} rounded-xl px-4 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 text-left`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {/* Demandes récentes */}
      <section aria-labelledby="recent-heading">
        <div className="flex items-center justify-between mb-4">
          <h2 id="recent-heading" className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Dernières demandes Dealer
          </h2>
          <button
            type="button"
            onClick={() => navigate('/admin/dealer')}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 focus:outline-none focus-visible:underline"
          >
            Voir tout →
          </button>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <RecentRequests
            requests={recentReqs}
            loading={reqsLoading}
            error={reqsError}
          />
        </div>
      </section>
    </div>
  )
}

export default AdminDashboard
