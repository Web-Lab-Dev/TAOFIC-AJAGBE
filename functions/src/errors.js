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
}

export class DealerRequestError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'DealerRequestError'
    this.code = code
    this.httpCode = HTTP_CODES[code] ?? 'internal'
  }
}
