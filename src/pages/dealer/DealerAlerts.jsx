import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { listDealerRequests, listActiveStores, getStoreBalances } from '../../services/dealerService'
import PageHeader from '../../components/ui/PageHeader'
import ErrorState from '../../components/ui/ErrorState'
import { formatCurrency } from '../../utils/formatCurrency'

// ──────────────────────────────────────────────────────────────────────────────
// Seuils d'alerte (ajustables)
// ──────────────────────────────────────────────────────────────────────────────

const LOW_STOCK_THRESHOLD     = 50_000   // FCFA
const LOW_LIQUIDITY_THRESHOLD = 30_000   // FCFA
const OLD_REQUEST_HOURS       = 24       // Demande ancienne

const MS_HOUR = 60 * 60 * 1000

function tsToDate(ts) {
  if (!ts) return null
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  return Number.isFinite(d.getTime()) ? d : null
}

async function buildDealerAlerts({ currentUser, userProfile }) {
  const alerts = []

  // Demandes en attente
  const reqResult = await listDealerRequests({ currentUser, userProfile, statusFilter: 'pending' })
  const pending = reqResult.requests

  if (pending.length > 0) {
    alerts.push({
      id: 'pending-requests',
      severity: 'medium',
      title: `${pending.length} demande${pending.length > 1 ? 's' : ''} en attente`,
      message: 'Des boutiques n\'ont pas encore traité vos demandes.',
      link: '/dealer/requests',
      linkLabel: 'Voir les demandes',
    })
  }

  // Demandes très anciennes
  const now = Date.now()
  const old = pending.filter(r => {
    const d = tsToDate(r.createdAt)
    return d && now - d.getTime() > OLD_REQUEST_HOURS * MS_HOUR
  })
  if (old.length > 0) {
    alerts.push({
      id: 'old-pending',
      severity: 'high',
      title: `${old.length} demande${old.length > 1 ? 's' : ''} en attente depuis plus de ${OLD_REQUEST_HOURS}h`,
      message: 'Ces demandes méritent un suivi auprès des boutiques concernées.',
      link: '/dealer/requests',
      linkLabel: 'Voir les demandes',
    })
  }

  // Boutiques à faible stock / liquidité
  const storesResult = await listActiveStores()
  const balanceResults = await Promise.allSettled(
    storesResult.stores.map(s => getStoreBalances(s.id).then(b => ({ store: s, balances: b?.balances?.Orange })))
  )

  balanceResults.forEach(r => {
    if (r.status !== 'fulfilled') return
    const { store, balances } = r.value
    if (!balances) return
    if (typeof balances.stock === 'number' && balances.stock < LOW_STOCK_THRESHOLD) {
      alerts.push({
        id: `low-stock-${store.id}`,
        severity: 'medium',
        title: `Stock faible — ${store.name}`,
        message: `Stock Orange : ${formatCurrency(balances.stock)} (seuil : ${formatCurrency(LOW_STOCK_THRESHOLD)})`,
        link: '/dealer/stores',
        linkLabel: 'Voir les boutiques',
      })
    }
    if (typeof balances.liquidite === 'number' && balances.liquidite < LOW_LIQUIDITY_THRESHOLD) {
      alerts.push({
        id: `low-liq-${store.id}`,
        severity: 'low',
        title: `Liquidité faible — ${store.name}`,
        message: `Liquidité Orange : ${formatCurrency(balances.liquidite)} (seuil : ${formatCurrency(LOW_LIQUIDITY_THRESHOLD)})`,
        link: '/dealer/stores',
        linkLabel: 'Voir les boutiques',
      })
    }
  })

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

function DealerAlerts() {
  const { currentUser, userProfile } = useAuth()
  const navigate = useNavigate()
  const [alerts, setAlerts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    if (!currentUser || !userProfile) return
    setLoading(true)
    setError(null)
    try {
      const a = await buildDealerAlerts({ currentUser, userProfile })
      setAlerts(a)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [currentUser, userProfile])

  useEffect(() => { load() }, [load])

  return (
    <div data-testid="dealer-alerts">
      <PageHeader
        title="Alertes"
        subtitle="Signaux calculés à partir de vos données en temps réel"
        actions={
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          >
            {loading ? 'Chargement…' : 'Actualiser'}
          </button>
        }
      />

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(n => <div key={n} className="h-20 animate-pulse rounded-xl bg-gray-100" />)}
        </div>
      )}

      {error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && alerts.length === 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
          <p className="text-base font-medium text-green-700">Aucune alerte active</p>
          <p className="mt-1 text-sm text-green-600">Toutes vos boutiques partenaires semblent en bon état.</p>
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
          <li>Demandes en attente {">"} 0</li>
          <li>Demandes en attente depuis {">"} {OLD_REQUEST_HOURS}h</li>
          <li>Stock Orange {"<"} {formatCurrency(LOW_STOCK_THRESHOLD)}</li>
          <li>Liquidité Orange {"<"} {formatCurrency(LOW_LIQUIDITY_THRESHOLD)}</li>
        </ul>
        <p className="mt-2 text-xs text-gray-400">
          Alertes de clôture et écarts de clôture reportés en V2.1.
        </p>
      </div>
    </div>
  )
}

export default DealerAlerts
