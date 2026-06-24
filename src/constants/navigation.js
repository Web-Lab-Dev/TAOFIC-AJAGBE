export const NAV_ITEMS = [
  { name: 'Tableau de bord', path: '/' },
  { name: 'Clients', path: '/clients' },
  { name: 'Transactions', path: '/transactions' },
  { name: 'Historique', path: '/historique' },
  { name: 'Formulaire', path: '/formulaire' },
  { name: 'Profil', path: '/profil' }
]

/** Alias sémantique pour l'espace Boutique (store_admin) — utilisé dans NavBar. */
export const STORE_NAV_ITEMS = NAV_ITEMS

export const ADMIN_NAV_ITEMS = [
  { name: 'Tableau de bord', path: '/admin' },
  { name: 'Boutiques', path: '/admin/stores' },
  { name: 'Profil', path: '/admin/profile' }
]

export const DEALER_NAV_ITEMS = [
  { name: 'Tableau de bord', path: '/dealer' },
  { name: 'Boutiques', path: '/dealer/stores' },
  { name: 'Demandes', path: '/dealer/requests' },
  { name: 'Profil', path: '/dealer/profile' }
]
