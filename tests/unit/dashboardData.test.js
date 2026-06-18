/**
 * TC-011A -- Caracterisation du hook useAllTransactions
 *
 * Comportement a capturer (golden test) :
 *   - useAllTransactions() fusionne pendingTransactions et completedTransactions
 *     via une Map indexee par transaction.id.
 *   - Les transactions completees ecrasent les transactions en attente de meme id
 *     (la valeur est remplacee, la position dans la Map -- donc dans le tableau
 *     resultat -- correspond a la premiere insertion, c'est-a-dire celle du pending).
 *   - Les transactions dont l'id est falsy (undefined, null, '') sont ignorees.
 *   - Si pendingTransactions ou completedTransactions est undefined/null, le
 *     fallback || [] produit un tableau vide sans erreur.
 *
 * Fichier source : src/hooks/useAllTransactions.js:8-33
 * Dependance mockee : src/context/transactions.jsx (useTransactions)
 *
 * Interdictions :
 *   - Aucun mock de useMemo ni de React.
 *   - Aucun vi.useFakeTimers (ce hook ne lit pas Date).
 *   - Aucun acces Firebase, aucun acces reseau.
 *   - Aucune modification de src/.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

import {
  pendingNominal,
  completedNominal,
  pendingShared,
  completedShared,
  pendingWithFalsyIds,
} from '../fixtures/dashboard.js'

// ---------------------------------------------------------------------------
// Mock du contexte transactions
// ---------------------------------------------------------------------------

vi.mock('../../src/context/transactions.jsx', () => ({
  useTransactions: vi.fn(),
}))

// Import apres mock
import { useTransactions } from '../../src/context/transactions.jsx'
import { useAllTransactions } from '../../src/hooks/useAllTransactions.js'

// ---------------------------------------------------------------------------

describe('TC-011A -- useAllTransactions', () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // Cas 1 -- Union nominale
  // 2 pending (IDs: p-alpha, p-beta) + 1 completed (ID: c-gamma) sans doublon.
  // Resultat attendu : [p-alpha, p-beta, c-gamma] dans cet ordre.
  //
  // Raison de l'ordre :
  //   La Map insere p-alpha puis p-beta (depuis pending).
  //   Puis c-gamma (depuis completed). Aucun doublon, aucune position modifiee.
  //   Array.from(map.values()) => [p-alpha, p-beta, c-gamma].
  // -------------------------------------------------------------------------

  it("[TC-011A-1] union nominale -- retourne les 3 transactions dans l'ordre d'insertion", () => {
    useTransactions.mockReturnValue({
      pendingTransactions: pendingNominal,
      completedTransactions: completedNominal,
    })

    const { result } = renderHook(() => useAllTransactions())

    expect(result.current).toEqual([
      pendingNominal[0],
      pendingNominal[1],
      completedNominal[0],
    ])
  })

  // -------------------------------------------------------------------------
  // Cas 2 -- Deduplication
  // pending: [{ id: 'shared-001', montant: 300, statut: 'Non Terminees' }]
  // completed: [{ id: 'shared-001', montant: 350, statut: 'Validee' }]
  //
  // Comportement Map JS :
  //   transactionMap.set('shared-001', pendingShared[0]) => position 0
  //   transactionMap.set('shared-001', completedShared[0]) => valeur ecrasee,
  //     POSITION INCHANGEE (comportement natif de Map en JavaScript)
  //
  // Resultat attendu :
  //   - 1 seul element dans le tableau
  //   - cet element est completedShared[0] (statut 'Validee', montant 350)
  //   - il se trouve a l'index 0 (position de la premiere insertion)
  // -------------------------------------------------------------------------

  it('[TC-011A-2a] deduplication -- un seul element dans le resultat', () => {
    useTransactions.mockReturnValue({
      pendingTransactions: pendingShared,
      completedTransactions: completedShared,
    })

    const { result } = renderHook(() => useAllTransactions())

    expect(result.current).toHaveLength(1)
  })

  it("[TC-011A-2b] deduplication -- l'element retenu est la version completed (pas pending)", () => {
    useTransactions.mockReturnValue({
      pendingTransactions: pendingShared,
      completedTransactions: completedShared,
    })

    const { result } = renderHook(() => useAllTransactions())

    expect(result.current[0]).toEqual(completedShared[0])
  })

  it('[TC-011A-2c] deduplication -- la version pending est absente du resultat', () => {
    useTransactions.mockReturnValue({
      pendingTransactions: pendingShared,
      completedTransactions: completedShared,
    })

    const { result } = renderHook(() => useAllTransactions())

    // La version pending a montant 300 ; la version completed a montant 350.
    // Aucun objet avec montant 300 ne doit apparaitre.
    const hasPendingVersion = result.current.some(t => t.montant === 300)
    expect(hasPendingVersion).toBe(false)
  })

  it("[TC-011A-2d] deduplication -- position de l'element : index 0 (position d'insertion initiale)", () => {
    useTransactions.mockReturnValue({
      pendingTransactions: pendingShared,
      completedTransactions: completedShared,
    })

    const { result } = renderHook(() => useAllTransactions())

    // La cle a ete inseree en premier lors du parcours de pending => position 0 dans la Map.
    expect(result.current[0].id).toBe('shared-001')
    expect(result.current[0].statut).toBe('Validée')
  })

  // -------------------------------------------------------------------------
  // Cas 3 -- Transactions sans id (falsy : undefined, null, '')
  //
  // pendingWithFalsyIds contient :
  //   { id: undefined, ... }  => exclue car !undefined === true => condition if(false)
  //   { id: null, ... }       => exclue car !null === true
  //   { id: '', ... }         => exclue car !'' === true (chaine vide est falsy)
  //   { id: 'valid-id-001' }  => incluse car 'valid-id-001' est truthy
  //
  // completedTransactions: []
  // Resultat attendu : [{ id: 'valid-id-001', ... }] -- 1 seul element.
  // -------------------------------------------------------------------------

  it('[TC-011A-3a] id undefined -- ignore (non insere dans la Map)', () => {
    useTransactions.mockReturnValue({
      pendingTransactions: pendingWithFalsyIds,
      completedTransactions: [],
    })

    const { result } = renderHook(() => useAllTransactions())

    const hasUndefinedId = result.current.some(t => t.id === undefined)
    expect(hasUndefinedId).toBe(false)
  })

  it('[TC-011A-3b] id null -- ignore (non insere dans la Map)', () => {
    useTransactions.mockReturnValue({
      pendingTransactions: pendingWithFalsyIds,
      completedTransactions: [],
    })

    const { result } = renderHook(() => useAllTransactions())

    const hasNullId = result.current.some(t => t.id === null)
    expect(hasNullId).toBe(false)
  })

  it('[TC-011A-3c] id chaine vide -- ignore (non insere dans la Map)', () => {
    useTransactions.mockReturnValue({
      pendingTransactions: pendingWithFalsyIds,
      completedTransactions: [],
    })

    const { result } = renderHook(() => useAllTransactions())

    const hasEmptyId = result.current.some(t => t.id === '')
    expect(hasEmptyId).toBe(false)
  })

  it('[TC-011A-3d] transaction avec id valide -- presente dans le resultat', () => {
    useTransactions.mockReturnValue({
      pendingTransactions: pendingWithFalsyIds,
      completedTransactions: [],
    })

    const { result } = renderHook(() => useAllTransactions())

    expect(result.current).toHaveLength(1)
    expect(result.current[0]).toEqual({
      id: 'valid-id-001',
      type: 'Dépôt',
      montant: 400,
      statut: 'Non Terminées',
      storeId: 'store-a',
      reseau: 'Orange',
      createdAt: '2026-06-17T06:00:00.000Z',
    })
  })

  // -------------------------------------------------------------------------
  // Cas 4 -- Tableaux undefined
  //
  // Le hook contient :
  //   const pending = pendingTransactions || []
  //   const completed = completedTransactions || []
  //
  // Si useTransactions() retourne { pendingTransactions: undefined,
  //   completedTransactions: undefined }, le fallback produit [] dans les deux cas.
  // Resultat attendu : [] sans erreur.
  // -------------------------------------------------------------------------

  it('[TC-011A-4a] pendingTransactions et completedTransactions undefined -- retourne [] sans erreur', () => {
    useTransactions.mockReturnValue({
      pendingTransactions: undefined,
      completedTransactions: undefined,
    })

    const { result } = renderHook(() => useAllTransactions())

    expect(result.current).toEqual([])
  })

  it('[TC-011A-4b] pendingTransactions null et completedTransactions null -- retourne [] sans erreur', () => {
    useTransactions.mockReturnValue({
      pendingTransactions: null,
      completedTransactions: null,
    })

    const { result } = renderHook(() => useAllTransactions())

    expect(result.current).toEqual([])
  })

  // -------------------------------------------------------------------------
  // Cas 5 -- Entrees vides
  // pendingTransactions: [], completedTransactions: []
  // Resultat attendu : []
  // -------------------------------------------------------------------------

  it('[TC-011A-5] tableaux vides -- retourne []', () => {
    useTransactions.mockReturnValue({
      pendingTransactions: [],
      completedTransactions: [],
    })

    const { result } = renderHook(() => useAllTransactions())

    expect(result.current).toEqual([])
  })

})
