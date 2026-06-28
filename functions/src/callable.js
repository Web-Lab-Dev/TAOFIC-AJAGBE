import { HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'
import { DealerRequestError } from './errors.js'

export { HttpsError }

export function wrapCallable(handler, dependencies) {
  return async (request) => {
    try {
      return await handler(request, dependencies)
    } catch (err) {
      if (err instanceof DealerRequestError) {
        throw new HttpsError(err.httpCode, err.message, { code: err.code })
      }
      logger.error('Erreur inattendue dans callable', {
        error: err.message,
        stack: err.stack,
      })
      throw new HttpsError('internal', "Une erreur interne s'est produite.")
    }
  }
}
