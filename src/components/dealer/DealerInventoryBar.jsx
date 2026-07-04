import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../hooks/useToast'
import { subscribeDealerBalance, replenishDealerInventory } from '../../services/storeTransferService'
import { formatCurrency } from '../../utils/formatCurrency'
import Toast from '../Toast'

/**
 * Bandeau d'inventaire dealer — persistant en haut de chaque page (comme le
 * bandeau des cartes réseau de l'espace boutique). Toujours visible : Stock +
 * Liquidité (Orange), avec approvisionnement (+ Stock / + Liquidité).
 */
function DealerInventoryBar() {
  const { currentUser, userProfile } = useAuth()
  const { toasts, showToast, removeToast } = useToast()

  const [inventory, setInventory] = useState({ stock: 0, liquidite: 0 })
  const [replenish, setReplenish] = useState(null) // { resource } | null
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const dealerUid = currentUser?.uid
  const isDealer = userProfile?.role === 'dealer'

  useEffect(() => {
    if (!isDealer || !dealerUid) { setInventory({ stock: 0, liquidite: 0 }); return undefined }
    return subscribeDealerBalance({ dealerUid, onUpdate: setInventory })
  }, [dealerUid, isDealer])

  const submit = useCallback(async () => {
    if (!replenish) return
    setSubmitting(true)
    try {
      await replenishDealerInventory({ resource: replenish.resource, amount })
      showToast('Inventaire approvisionné.', 'success')
      setReplenish(null)
      setAmount('')
    } catch (err) {
      showToast(err?.message || "Échec de l'approvisionnement", 'error')
    } finally {
      setSubmitting(false)
    }
  }, [replenish, amount, showToast])

  if (!isDealer) return null

  const Card = ({ label, value, icon, tint }) => (
    <div className={`flex-1 min-w-40 rounded-xl border border-gray-100 bg-gradient-to-br ${tint} to-white px-4 py-2.5`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</span>
        <span className="text-lg" aria-hidden="true">{icon}</span>
      </div>
      <p className="mt-0.5 text-xl font-bold text-gray-900">{formatCurrency(value)}</p>
    </div>
  )

  return (
    <div className="mb-6 rounded-2xl bg-white ring-1 ring-gray-100 shadow-sm">
      <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center">
        <div className="flex shrink-0 items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Mon inventaire (Orange)</span>
        </div>
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <Card label="Stock" value={inventory.stock} icon="📦" tint="from-blue-50" />
          <Card label="Liquidité" value={inventory.liquidite} icon="💵" tint="from-teal-50" />
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => { setReplenish({ resource: 'stock' }); setAmount('') }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          >
            + Stock
          </button>
          <button
            type="button"
            onClick={() => { setReplenish({ resource: 'liquidite' }); setAmount('') }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          >
            + Liquidité
          </button>
        </div>
      </div>

      {/* Modale d'approvisionnement */}
      {replenish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">
              Approvisionner : {replenish.resource === 'stock' ? 'Stock' : 'Liquidité'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">Ajoute au montant que tu as acquis (ex. achat chez Orange).</p>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Montant (FCFA)"
              className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setReplenish(null); setAmount('') }}
                disabled={submitting}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting || !/^[0-9]+$/.test(amount.trim())}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? 'Ajout…' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed top-0 right-0 z-50 space-y-2 p-4">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} duration={toast.duration} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </div>
  )
}

export default DealerInventoryBar
