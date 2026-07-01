import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getAdminDashboardCounts,
  listAllDealerRequests,
  listAllStores,
} from '../../services/adminService'
import PageHeader from '../../components/ui/PageHeader'
import ErrorState from '../../components/ui/ErrorState'

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const MS_HOUR = 60 * 60 * 1000
const MS_DAY  = 24 * MS_HOUR

function tsToDate(ts) {
  if (!ts) return null
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  return Number.isFinite(d.getTime()) ? d : null
}

function buildAlerts({ counts, pendingRequests }) {
  const alerts = []

  // Demandes en attente globales
  if (counts?.pendingRequests > 0) {
    alerts.push({
      id: 'pending-requests',
      severity: counts.pendingRequests >= 5 ? 'high' : 'medium',
      title: `${counts.pendingRequests} demande${counts.pendingRequests > 1 ? 's' : ''} Dealer en attente`,
      message: "Des boutiques n'ont pas encore traité toutes leurs demandes.",
      link: '/admin/dealer',
      linkLabel: 'Voir les demandes',
    })
  }

  // Demandes très anciennes (> 48h)
  const now = Date.now()
  const anciennesDemandes = pendingRequests.filter(r => {
    const d = tsToDate(r.createdAt)
    return d && now - d.getTime() > 48 * MS_HOUR
  })
  if (anciennesDemandes.length > 0) {
    alerts.push({
      id: 'old-pending',
      severity: 'high',
      title: `${anciennesDemandes.length} demande${anciennesDemandes.length > 1 ? 's' : ''} en attente depuis plus de 48h`,
      message: "Ces demandes risquent d'impacter le fonctionnement des boutiques concernées.",
      link: '/admin/dealer',
      linkLabel: 'Voir les demandes',
    })
  }

  // Boutiques inactives
  if (counts?.inactiveStores > 0) {
    alerts.push({
      id: 'inactive-stores',
      severity: 'low',
      title: `${counts.inactiveStores} boutique${counts.inactiveStores > 1 ? 's' : ''} inactive${counts.inactiveStores > 1 ? 's' : ''}`,
      message: 'Des boutiques sont marquées inactives sur la plateforme.',
      link: '/admin/stores',
      linkLabel: 'Voir les boutiques',
    })
  }

  return alerts
}

const SEVERITY_STYLES = {
  high:   { container: 'border-red-200 bg-red-50', dot: 'bg-red-500', label: 'Critique', labelCls: 'text-red-700' },
  medium: { container: 'border-amber-200 bg-amber-50', dot: 'bg-amber-400', label: 'Attention', labelCls: 'text-amber-700' },
  low:    { container: 'border-blue-200 bg-blue-50', dot: 'bg-blue-400', label: 'Info', labelCls: 'text-blue-700' },
}

function AlertCard({ alert, navigate }) {
  const s = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.low
  return (
    <div className={`rounded-xl border p-4 ${s.container}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 flex-shrink-0 h-2.5 w-2.5 rounded-full ${s.dot}`} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <p className={`text-sm font-semibold ${s.labelCls}`}>{alert.title}</p>
            <span className={`text-[10px] font-bold uppercase tracking-wide ${s.labelCls} opacity-70`}>{s.label}</span>
          </div>
          <p className="text-sm text-gray-600">{alert.message}</p>
          {alert.link && (
            <button
              type="button"
              onClick={() => navigate(alert.link)}
              className={`mt-2 text-xs font-medium underline focus:outline-none ${s.labelCls}`}
            >
              {alert.linkLabel} →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// AdminAlerts
// ──────────────────────────────────────────────────────────────────────────────

function AdminAlerts() {
  const navigate = useNavigate()
  const [alerts, setAlerts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [counts, pendingResult, inactiveResult] = await Promise.all([
        getAdminDashboardCounts(),
        listAllDealerRequests({ statusFilter: 'pending' }),
        listAllStores({ activeFilter: false }),
      ])
      setAlerts(buildAlerts({
        counts,
        pendingRequests: pendingResult.requests,
        inactiveStores: inactiveResult.stores,
      }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div data-testid="admin-alerts">
      <PageHeader
        title="Alertes"
        subtitle="Signaux déterministes basés sur les données en temps réel"
        actions={
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {loading ? 'Chargement…' : 'Actualiser'}
          </button>
        }
      />

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && alerts.length === 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
          <p className="text-base font-medium text-green-700">Aucune alerte active</p>
          <p className="mt-1 text-sm text-green-600">La plateforme fonctionne normalement.</p>
        </div>
      )}

      {!loading && !error && alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map(a => <AlertCard key={a.id} alert={a} navigate={navigate} />)}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <h2 className="text-sm font-semibold text-gray-600 mb-2">Règles d'alerte actives</h2>
        <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
          <li>Demandes Dealer en attente {">"} 0</li>
          <li>Demandes Dealer en attente depuis {">"} 48h</li>
          <li>Boutiques inactives {">"} 0</li>
        </ul>
        <p className="mt-3 text-xs text-gray-400">
          Alertes calculées à partir des données Firestore lisibles par system_manager.
          Scores de crédit, alertes d'agents et alertes de clôture reportés en V2.1
          (calcul backend requis).
        </p>
      </div>
    </div>
  )
}

export default AdminAlerts
