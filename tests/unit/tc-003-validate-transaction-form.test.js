/**
 * TC-003 — Validation d'une transaction valide (payload)
 *
 * Comportement protégé :
 *   validateTransactionForm(selectedClient, amount, transactionType)
 *   retourne une valeur truthy quand les trois paramètres sont présents et
 *   que parseFloat(amount) > 0.
 *   Retourne une valeur falsy dès qu'un paramètre est absent, vide ou
 *   que le montant est <= 0.
 *
 * Source : src/utils/helpers.js ligne 203-205
 *   export const validateTransactionForm = (selectedClient, amount, transactionType) => {
 *     return selectedClient && amount && parseFloat(amount) > 0 && transactionType
 *   }
 *
 * helpers.js n'importe QUE src/utils/constants.js (pas de Firebase, pas de DOM).
 * Aucun mock requis.
 *
 * ATTENTION : cette fonction est un simple prédicat booléen ;
 * elle NE vérifie PAS le type parmi une liste — n'importe quelle
 * chaîne truthy pour transactionType est acceptée.
 * Ce comportement est figé tel quel (golden test).
 */

import { describe, it, expect } from 'vitest'
import { validateTransactionForm } from '../../src/utils/helpers.js'

// ---------------------------------------------------------------------------
// Fixtures locales — n'importent pas les fixtures globales car ce test
// se concentre sur la logique de la fonction, pas sur les données métier.
// ---------------------------------------------------------------------------

/** Client minimal valide (objet avec nom/prenom) */
const CLIENT_VALIDE = { nom: 'Alpha', prenom: 'Client' }

/** Client représenté par une chaîne (cas alternatif accepté par getClientName) */
const CLIENT_STRING = 'Alpha Client'

// ===========================================================================
// CAS VALIDES
// ===========================================================================

describe('TC-003 — validateTransactionForm : cas valides', () => {
  it('retourne truthy pour un formulaire complet (objet client, montant positif, type Dépôt)', () => {
    const result = validateTransactionForm(CLIENT_VALIDE, '500', 'Dépôt')
    expect(result).toBeTruthy()
  })

  it('retourne truthy pour un client string, montant entier positif, type Retrait', () => {
    const result = validateTransactionForm(CLIENT_STRING, '200', 'Retrait')
    expect(result).toBeTruthy()
  })

  it('retourne truthy pour un client string, montant décimal positif, type Crédit', () => {
    const result = validateTransactionForm(CLIENT_STRING, '0.01', 'Crédit')
    expect(result).toBeTruthy()
  })

  it('retourne truthy pour montant 1 (borne basse strictement positive)', () => {
    const result = validateTransactionForm(CLIENT_VALIDE, '1', 'Dépôt')
    expect(result).toBeTruthy()
  })

  it('retourne truthy pour montant très élevé (100 000 000)', () => {
    // La règle UI ne plafonne pas — seule firestore.rules le fait
    const result = validateTransactionForm(CLIENT_VALIDE, '100000000', 'Dépôt')
    expect(result).toBeTruthy()
  })

  it('retourne truthy pour un type inconnu non vide — la fonction UI ne vérifie pas la liste des types', () => {
    // Comportement actuel : toute chaîne truthy est acceptée comme transactionType
    const result = validateTransactionForm(CLIENT_VALIDE, '500', 'TypeInconnu')
    expect(result).toBeTruthy()
  })
})

// ===========================================================================
// CAS INVALIDES — CLIENT ABSENT OU FALSY
// ===========================================================================

describe('TC-003 — validateTransactionForm : client manquant ou falsy', () => {
  it('retourne falsy quand selectedClient est null', () => {
    const result = validateTransactionForm(null, '500', 'Dépôt')
    expect(result).toBeFalsy()
  })

  it('retourne falsy quand selectedClient est undefined', () => {
    const result = validateTransactionForm(undefined, '500', 'Dépôt')
    expect(result).toBeFalsy()
  })

  it('retourne falsy quand selectedClient est false', () => {
    const result = validateTransactionForm(false, '500', 'Dépôt')
    expect(result).toBeFalsy()
  })

  it('retourne falsy quand selectedClient est une chaîne vide', () => {
    // Une chaîne vide est falsy en JS
    const result = validateTransactionForm('', '500', 'Dépôt')
    expect(result).toBeFalsy()
  })
})

// ===========================================================================
// CAS INVALIDES — MONTANT
// ===========================================================================

describe('TC-003 — validateTransactionForm : montant invalide', () => {
  it('retourne falsy quand amount est une chaîne vide', () => {
    // '' est falsy — le court-circuit s'arrête avant parseFloat
    const result = validateTransactionForm(CLIENT_VALIDE, '', 'Dépôt')
    expect(result).toBeFalsy()
  })

  it('retourne falsy quand amount est null', () => {
    const result = validateTransactionForm(CLIENT_VALIDE, null, 'Dépôt')
    expect(result).toBeFalsy()
  })

  it('retourne falsy quand amount est undefined', () => {
    const result = validateTransactionForm(CLIENT_VALIDE, undefined, 'Dépôt')
    expect(result).toBeFalsy()
  })

  it('retourne falsy quand amount vaut "0" (montant nul)', () => {
    // parseFloat('0') === 0, donc 0 > 0 est false
    const result = validateTransactionForm(CLIENT_VALIDE, '0', 'Dépôt')
    expect(result).toBeFalsy()
  })

  it('retourne falsy quand amount vaut 0 (nombre, pas chaîne)', () => {
    // 0 est falsy — court-circuit avant parseFloat
    const result = validateTransactionForm(CLIENT_VALIDE, 0, 'Dépôt')
    expect(result).toBeFalsy()
  })

  it('retourne falsy quand amount est négatif ("-300")', () => {
    // parseFloat('-300') === -300 ; -300 > 0 est false
    const result = validateTransactionForm(CLIENT_VALIDE, '-300', 'Dépôt')
    expect(result).toBeFalsy()
  })

  it('retourne falsy quand amount est une string non numérique ("abc")', () => {
    // parseFloat('abc') === NaN ; NaN > 0 est false
    const result = validateTransactionForm(CLIENT_VALIDE, 'abc', 'Dépôt')
    expect(result).toBeFalsy()
  })

  it('retourne falsy quand amount est NaN explicite', () => {
    // NaN est falsy — court-circuit avant parseFloat
    const result = validateTransactionForm(CLIENT_VALIDE, NaN, 'Dépôt')
    expect(result).toBeFalsy()
  })

  it('comportement observé — amount "0.00" : retourne falsy (parseFloat("0.00") === 0)', () => {
    // "0.00" est truthy (chaîne non vide) mais parseFloat("0.00") === 0
    const result = validateTransactionForm(CLIENT_VALIDE, '0.00', 'Dépôt')
    expect(result).toBeFalsy()
  })
})

// ===========================================================================
// CAS INVALIDES — TYPE DE TRANSACTION
// ===========================================================================

describe('TC-003 — validateTransactionForm : type de transaction manquant', () => {
  it('retourne falsy quand transactionType est une chaîne vide', () => {
    const result = validateTransactionForm(CLIENT_VALIDE, '500', '')
    expect(result).toBeFalsy()
  })

  it('retourne falsy quand transactionType est null', () => {
    const result = validateTransactionForm(CLIENT_VALIDE, '500', null)
    expect(result).toBeFalsy()
  })

  it('retourne falsy quand transactionType est undefined', () => {
    const result = validateTransactionForm(CLIENT_VALIDE, '500', undefined)
    expect(result).toBeFalsy()
  })

  it('retourne falsy quand transactionType est false', () => {
    const result = validateTransactionForm(CLIENT_VALIDE, '500', false)
    expect(result).toBeFalsy()
  })
})

// ===========================================================================
// CAS LIMITES — COMBINAISONS MULTI-CHAMPS INVALIDES
// ===========================================================================

describe('TC-003 — validateTransactionForm : combinaisons multi-champs invalides', () => {
  it('retourne falsy quand client ET montant sont absents', () => {
    const result = validateTransactionForm(null, '', 'Dépôt')
    expect(result).toBeFalsy()
  })

  it('retourne falsy quand tous les champs sont falsy', () => {
    const result = validateTransactionForm(null, null, null)
    expect(result).toBeFalsy()
  })

  it('retourne falsy quand montant ET type sont absents (client présent)', () => {
    const result = validateTransactionForm(CLIENT_VALIDE, '', '')
    expect(result).toBeFalsy()
  })
})

// ===========================================================================
// DOCUMENTATION — Limite connue : la fonction UI n'accepte pas le type corrompu
// ===========================================================================

describe('TC-003 — validateTransactionForm : comportement documentaire (types UTF-8)', () => {
  it('retourne truthy pour le type corrompu "DÃ©pÃ´t" — la fonction UI ne filtre pas les types', () => {
    // La fonction UI est permissive : toute chaîne non vide est acceptée.
    // La restriction des types valides est portée par firestore.rules (validTransaction),
    // couverte dans TC-004.
    // Ce test fige le comportement ACTUEL — ne pas corriger en Lot 0.
    const result = validateTransactionForm(CLIENT_VALIDE, '500', 'DÃ©pÃ´t')
    expect(result).toBeTruthy()
  })

  it('retourne truthy pour le type corrompu "CrÃ©dit" — même comportement permissif', () => {
    const result = validateTransactionForm(CLIENT_VALIDE, '500', 'CrÃ©dit')
    expect(result).toBeTruthy()
  })

  it('retourne truthy pour le type "Depot" (sans accent) — la fonction UI ne filtre pas les types', () => {
    // firestore.rules accepte "Depot" dans la liste ; la fonction UI l'accepte aussi
    // car toute chaîne truthy passe.
    const result = validateTransactionForm(CLIENT_VALIDE, '500', 'Depot')
    expect(result).toBeTruthy()
  })
})
