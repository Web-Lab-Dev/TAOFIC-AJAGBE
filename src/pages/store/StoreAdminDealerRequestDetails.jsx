import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getStoreAdminDealerRequestById } from '../../services/storeAdminDealerService'
import {
  confirmDealerRequestCommand,
  rejectDealerRequestCommand,
} from '../../services/storeDealerRequestCommandService'
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
// ConfirmModal — confirmation renforcée avec checkbox
// ---------------------------------------------------------------------------

function ConfirmModal({ request, processing, onConfirm, onClose }) {
  const [checked, setChecked] = useState(false)
  const firstRef = useRef(null)

  useEffect(() => {
    firstRef.current?.focus()
  }, [])

  const typeLabel    = DEALER_REQUEST_TYPE_LABELS[request.requestType] ?? 'Type inconnu'
  const amountDisplay = formatStoredAmount(request.amount)
  const canSubmit    = checked && !processing

  function handleKeyDown(e) {
    if (e.key === 'Escape' && !processing) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      onKeyDown={handleKeyDown}
      data-testid="confirm-modal-overlay"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 id="confirm-modal-title" className="text-lg font-bold text-gray-800 mb-4">
          Confirmer la demande
        </h2>

        {/* Récapitulatif */}
        <dl className="text-sm space-y-2 mb-5">
          <div className="flex justify-between">
            <dt className="text-gray-500">Dealer</dt>
            <dd className="font-medium text-gray-800">{request.dealerName ?? 'Dealer inconnu'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Type</dt>
            <dd className="font-medium text-gray-800">{typeLabel}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Réseau</dt>
            <dd className="font-medium text-gray-800">{request.network ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Montant</dt>
            <dd className="font-bold text-gray-900">{amountDisplay}</dd>
          </div>
        </dl>

        {/* Avertissement */}
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 mb-5 text-sm text-amber-800" role="note">
          Cette action modifiera immédiatement le solde de la boutique et ne pourra pas être annulée.
        </div>

        {/* Checkbox de confirmation */}
        <label className="flex items-start gap-3 cursor-pointer mb-6" data-testid="confirm-checkbox-label">
          <input
            ref={firstRef}
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            disabled={processing}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            aria-label="Je confirme avoir vérifié le montant et le type de demande"
            data-testid="confirm-checkbox"
          />
          <span className="text-sm text-gray-700">
            Je confirme avoir vérifié le montant et le type de demande
          </span>
        </label>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 transition-colors"
            data-testid="confirm-modal-cancel"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canSubmit}
            aria-disabled={!canSubmit}
            className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 transition-colors"
            data-testid="confirm-modal-submit"
          >
            {processing ? 'Confirmation…' : 'Confirmer la demande'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// RejectModal — rejet avec motif obligatoire (3–500 chars)
// ---------------------------------------------------------------------------

function RejectModal({ processing, onReject, onClose }) {
  const [reason, setReason]     = useState('')
  const [localError, setLocalError] = useState(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const trimmed    = reason.trim()
  const charCount  = trimmed.length
  const isValid    = charCount >= 3 && charCount <= 500
  const canSubmit  = isValid && !processing

  function handleKeyDown(e) {
    if (e.key === 'Escape' && !processing) onClose()
  }

  function handleSubmit() {
    if (charCount < 3)   { setLocalError('Le motif doit comporter au moins 3 caractères.'); return }
    if (charCount > 500) { setLocalError('Le motif ne peut pas dépasser 500 caractères.'); return }
    setLocalError(null)
    onReject(trimmed)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-modal-title"
      onKeyDown={handleKeyDown}
      data-testid="reject-modal-overlay"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 id="reject-modal-title" className="text-lg font-bold text-gray-800 mb-4">
          Rejeter la demande
        </h2>

        <div className="mb-4">
          <label htmlFor="rejection-reason" className="block text-sm font-medium text-gray-700 mb-1">
            Motif du rejet <span aria-hidden="true">*</span>
          </label>
          <textarea
            id="rejection-reason"
            ref={textareaRef}
            value={reason}
            onChange={e => { setReason(e.target.value); setLocalError(null) }}
            disabled={processing}
            rows={4}
            maxLength={510}
            placeholder="Décrivez le motif du rejet (3 à 500 caractères)…"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            aria-describedby={localError ? 'reject-reason-error' : 'reject-reason-hint'}
            data-testid="reject-reason-textarea"
          />
          <div className="flex justify-between items-center mt-1">
            <span
              id="reject-reason-hint"
              className={`text-xs ${charCount > 500 ? 'text-red-600' : 'text-gray-400'}`}
              aria-live="polite"
              data-testid="reject-char-counter"
            >
              {charCount} / 500 caractères
            </span>
          </div>
          {localError && (
            <p
              id="reject-reason-error"
              role="alert"
              className="mt-1 text-xs text-red-600"
              data-testid="reject-local-error"
            >
              {localError}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 transition-colors"
            data-testid="reject-modal-cancel"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            aria-disabled={!canSubmit}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-colors"
            data-testid="reject-modal-submit"
          >
            {processing ? 'Rejet en cours…' : 'Confirmer le rejet'}
          </button>
        </div>
      </div>
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

  const [request, setRequest]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  const [processingAction, setProcessingAction] = useState(null)  // 'confirm' | 'reject' | null
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [rejectModalOpen, setRejectModalOpen]   = useState(false)
  const [actionError, setActionError]           = useState(null)
  const [actionSuccess, setActionSuccess]       = useState(null)

  // Chargement initial (réinitialise tout)
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

  // Rechargement silencieux après action (ne vide pas le détail affiché)
  const reloadRequest = useCallback(async () => {
    try {
      const data = await getStoreAdminDealerRequestById({ currentUser, userProfile, requestId })
      setRequest(data)
    } catch {
      // Conserver l'état courant si le rechargement échoue
    }
  }, [currentUser, userProfile, requestId])

  useEffect(() => {
    const signal = { cancelled: false }
    loadRequest(signal)
    return () => { signal.cancelled = true }
  }, [loadRequest])

  // ---------------------------------------------------------------------------
  // Confirmation
  // ---------------------------------------------------------------------------

  async function handleConfirm() {
    if (processingAction) return
    setProcessingAction('confirm')
    setActionError(null)
    setActionSuccess(null)
    try {
      await confirmDealerRequestCommand(request.id)
      setConfirmModalOpen(false)
      setActionSuccess('La demande a été confirmée avec succès.')
      await reloadRequest()
    } catch (err) {
      setActionError(err.message)
      if (err.code === 'REQUEST_NOT_PENDING') {
        setConfirmModalOpen(false)
        await reloadRequest()
      }
    } finally {
      setProcessingAction(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Rejet
  // ---------------------------------------------------------------------------

  async function handleReject(trimmedReason) {
    if (processingAction) return
    setProcessingAction('reject')
    setActionError(null)
    setActionSuccess(null)
    try {
      await rejectDealerRequestCommand(request.id, trimmedReason)
      setRejectModalOpen(false)
      setActionSuccess('La demande a été rejetée.')
      await reloadRequest()
    } catch (err) {
      setActionError(err.message)
      if (err.code === 'REQUEST_NOT_PENDING') {
        setRejectModalOpen(false)
        await reloadRequest()
      }
    } finally {
      setProcessingAction(null)
    }
  }

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

  const isPending    = request.status === 'pending'
  const typeLabel    = DEALER_REQUEST_TYPE_LABELS[request.requestType] ?? 'Type inconnu'
  const amountDisplay = formatStoredAmount(request.amount)

  return (
    <div className="max-w-2xl mx-auto" data-testid="store-dealer-request-details">
      {/* Modales */}
      {confirmModalOpen && (
        <ConfirmModal
          request={request}
          processing={processingAction === 'confirm'}
          onConfirm={handleConfirm}
          onClose={() => { if (!processingAction) setConfirmModalOpen(false) }}
        />
      )}
      {rejectModalOpen && (
        <RejectModal
          processing={processingAction === 'reject'}
          onReject={handleReject}
          onClose={() => { if (!processingAction) setRejectModalOpen(false) }}
        />
      )}

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

      {/* Bannière de succès */}
      {actionSuccess && (
        <div
          role="status"
          className="mb-4 rounded-lg bg-green-50 border border-green-200 p-4 text-green-800 text-sm"
          data-testid="action-success"
        >
          {actionSuccess}
        </div>
      )}

      {/* Bannière d'erreur */}
      {actionError && (
        <div
          role="alert"
          className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm"
          data-testid="action-error"
        >
          {actionError}
        </div>
      )}

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

        {/* Actions — uniquement pour les demandes en attente */}
        {isPending && (
          <div className="mt-6 pt-5 border-t border-gray-100 flex flex-wrap gap-3" data-testid="action-buttons">
            <button
              type="button"
              onClick={() => { setActionError(null); setActionSuccess(null); setConfirmModalOpen(true) }}
              disabled={!!processingAction}
              className="rounded bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 transition-colors"
              aria-label="Confirmer cette demande Dealer"
              data-testid="btn-confirm"
            >
              {processingAction === 'confirm' ? 'Confirmation…' : 'Confirmer la demande'}
            </button>
            <button
              type="button"
              onClick={() => { setActionError(null); setActionSuccess(null); setRejectModalOpen(true) }}
              disabled={!!processingAction}
              className="rounded bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-colors"
              aria-label="Rejeter cette demande Dealer"
              data-testid="btn-reject"
            >
              {processingAction === 'reject' ? 'Rejet en cours…' : 'Rejeter la demande'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default StoreAdminDealerRequestDetails
