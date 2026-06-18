/**
 * Fixtures pour TC-011A — useAllTransactions
 *
 * Dataset figé, déterministe :
 *   - aucun Date.now()
 *   - aucun Math.random()
 *   - aucune date relative
 *
 * Règles de nommage :
 *   - pendingTransactions : objets présents dans les drafts Firestore
 *   - completedTransactions : objets présents dans l'historique Firestore
 *   - Les IDs sont des chaînes littérales, préfixées par leur provenance (p- ou c-)
 *     sauf pour les cas de doublon (shared-001).
 */

// ---------------------------------------------------------------------------
// Cas 1 — Union nominale (3 IDs distincts, aucun doublon)
// ---------------------------------------------------------------------------

/** Deux transactions en attente avec des IDs distincts */
export const pendingNominal = [
  {
    id: 'p-alpha',
    type: 'Dépôt',
    montant: 1000,
    statut: 'Non Terminées',
    storeId: 'store-a',
    reseau: 'Orange',
    createdAt: '2026-06-17T08:00:00.000Z',
  },
  {
    id: 'p-beta',
    type: 'Retrait',
    montant: 500,
    statut: 'Non Terminées',
    storeId: 'store-a',
    reseau: 'Moov',
    createdAt: '2026-06-17T09:00:00.000Z',
  },
]

/** Une transaction complétée avec un ID différent des pending */
export const completedNominal = [
  {
    id: 'c-gamma',
    type: 'Dépôt',
    montant: 2000,
    statut: 'Validée',
    storeId: 'store-a',
    reseau: 'Telecel',
    createdAt: '2026-06-17T07:00:00.000Z',
  },
]

// ---------------------------------------------------------------------------
// Cas 2 — Déduplication (id: 'shared-001' présent dans pending ET completed)
//
// Comportement attendu (algorithme Map) :
//   La clé 'shared-001' est insérée lors du parcours de pending (position 0).
//   Lors du parcours de completed, transactionMap.set('shared-001', ...) écrase
//   la VALEUR mais conserve la POSITION d'insertion originale.
//   => dans Array.from(transactionMap.values()), 'shared-001' reste en position 0,
//      avec la valeur de completedShared (pas pendingShared).
// ---------------------------------------------------------------------------

/** Version pending du doublon — statut Non Terminées, montant 300 */
export const pendingShared = [
  {
    id: 'shared-001',
    type: 'Dépôt',
    montant: 300,
    statut: 'Non Terminées',
    storeId: 'store-a',
    reseau: 'Orange',
    createdAt: '2026-06-16T10:00:00.000Z',
  },
]

/** Version completed du doublon — statut Validée, montant 350 (différent pour vérifier l'écrasement) */
export const completedShared = [
  {
    id: 'shared-001',
    type: 'Dépôt',
    montant: 350,
    statut: 'Validée',
    storeId: 'store-a',
    reseau: 'Orange',
    createdAt: '2026-06-16T11:00:00.000Z',
  },
]

// ---------------------------------------------------------------------------
// Cas 3 — Transactions sans id (falsy) : undefined, null, ''
//
// La condition `if (transaction.id)` exclut toutes les valeurs falsy JS :
//   undefined, null, '' (chaîne vide), 0, false, NaN.
// ---------------------------------------------------------------------------

/** Tableau de pending contenant 3 transactions sans id (falsy) + 1 avec id valide */
export const pendingWithFalsyIds = [
  {
    id: undefined,
    type: 'Dépôt',
    montant: 100,
    statut: 'Non Terminées',
    storeId: 'store-a',
  },
  {
    id: null,
    type: 'Retrait',
    montant: 200,
    statut: 'Non Terminées',
    storeId: 'store-a',
  },
  {
    id: '',
    type: 'Crédit',
    montant: 300,
    statut: 'Non Terminées',
    storeId: 'store-a',
  },
  {
    id: 'valid-id-001',
    type: 'Dépôt',
    montant: 400,
    statut: 'Non Terminées',
    storeId: 'store-a',
    reseau: 'Orange',
    createdAt: '2026-06-17T06:00:00.000Z',
  },
]
