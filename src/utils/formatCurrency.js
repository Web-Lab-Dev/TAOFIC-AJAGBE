const formatter = new Intl.NumberFormat('fr-FR', {
  style: 'decimal',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/**
 * Formate un montant entier en FCFA.
 * Retourne '—' pour toute valeur non numérique finie.
 *
 * Exemples : formatCurrency(5000000) → '5 000 000 FCFA'
 *            formatCurrency(0)       → '0 FCFA'
 *            formatCurrency(null)    → '—'
 */
export function formatCurrency(amount) {
  if (amount == null || !Number.isFinite(Number(amount))) return '—'
  return formatter.format(Number(amount)) + ' FCFA'
}
