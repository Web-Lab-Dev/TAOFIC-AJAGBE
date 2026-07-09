export const DEALER_REQUEST_TYPES = Object.freeze({
  STOCK_ADD: 'stock_add',
  LIQUIDITY_ADD: 'liquidity_add',
})

export const DEALER_REQUEST_TYPE_LABELS = Object.freeze({
  stock_add: 'Ajout de stock',
  liquidity_add: 'Ajout de liquidité',
})

export const DEALER_REQUEST_STATUSES = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
})

export const DEALER_REQUEST_STATUS_LABELS = Object.freeze({
  pending: 'En attente',
  confirmed: 'Confirmée',
  rejected: 'Rejetée',
})

export const DEALER_NETWORK = 'Orange'

export const DEALER_REQUESTS_PAGE_SIZE = 20
export const DEALER_STORES_PAGE_SIZE = 20
export const STORE_DEALER_REQUESTS_PAGE_SIZE = 20

// ── Transferts boutique → dealer (retours de stock / liquidité) ──────────────
export const STORE_TRANSFER_TYPES = Object.freeze({
  RETURN_STOCK: 'return_stock',
  RETURN_LIQUIDITY: 'return_liquidity',
})

export const STORE_TRANSFER_TYPE_LABELS = Object.freeze({
  return_stock: 'Retour de stock',
  return_liquidity: 'Envoi de liquidité',
})

export const STORE_TRANSFERS_PAGE_SIZE = 20
