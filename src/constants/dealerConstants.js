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
