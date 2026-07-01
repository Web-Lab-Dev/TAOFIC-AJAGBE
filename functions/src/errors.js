/**
 * Codes d'erreur métier et leur correspondance HttpsError.
 * Les handlers lancent DealerRequestError ; index.js les convertit en HttpsError.
 */

export const HTTP_CODES = {
  UNAUTHENTICATED:          'unauthenticated',
  PROFILE_NOT_FOUND:        'permission-denied',
  PROFILE_INACTIVE:         'permission-denied',
  ROLE_FORBIDDEN:           'permission-denied',
  STORE_ID_REQUIRED:        'permission-denied',
  INVALID_REQUEST_ID:       'invalid-argument',
  REQUEST_NOT_FOUND:        'not-found',
  REQUEST_NOT_PENDING:      'failed-precondition',
  REQUEST_STORE_MISMATCH:   'permission-denied',
  INVALID_REQUEST_DATA:     'failed-precondition',
  INVALID_REJECTION_REASON: 'invalid-argument',
  BALANCE_NOT_FOUND:        'failed-precondition',
  INVALID_BALANCE_DATA:     'internal',
  BALANCE_OVERFLOW:         'failed-precondition',
  TRANSACTION_FAILED:       'internal',
  // Clôtures Dealer
  STORE_NOT_FOUND:          'not-found',
  STORE_INACTIVE:           'failed-precondition',
  INVALID_CLOSURE_DATA:     'invalid-argument',
  INVALID_CLOSURE_ID:       'invalid-argument',
  REASON_REQUIRED:          'invalid-argument',
  CLOSURE_ALREADY_EXISTS:   'failed-precondition',
  CLOSURE_NOT_FOUND:        'not-found',
  CLOSURE_STORE_MISMATCH:   'permission-denied',
  CLOSURE_NOT_PENDING:      'failed-precondition',
}

export class DealerRequestError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'DealerRequestError'
    this.code = code
    this.httpCode = HTTP_CODES[code] ?? 'internal'
  }
}
