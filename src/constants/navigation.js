export const NAV_ITEMS = [
  { name: 'Tableau de bord', path: '/' },
  { name: 'Clients', path: '/clients' },
  { name: 'Transactions', path: '/transactions' },
  { name: 'Historique', path: '/historique' },
  { name: 'Formulaire', path: '/formulaire' },
  { name: 'Demandes Dealer', path: '/dealer-requests' },
  { name: 'Profil', path: '/profil' }
]

/** Alias sémantique pour l'espace Boutique (store_admin) — utilisé dans NavBar. */
export const STORE_NAV_ITEMS = NAV_ITEMS

export const ADMIN_NAV_ITEMS = [
  { name: 'Vue générale', path: '/admin', section: 'main' },
  { name: 'Boutiques', path: '/admin/stores', section: 'supervision' },
  { name: 'Utilisateurs', path: '/admin/users', section: 'supervision' },
  { name: 'Dealer', path: '/admin/dealer', section: 'supervision' },
  { name: 'Clients', path: '/admin/clients', section: 'supervision' },
  { name: 'Historique', path: '/admin/history', section: 'supervision' },
  { name: 'Rapports', path: '/admin/reports', section: 'supervision' },
  { name: 'Alertes', path: '/admin/alerts', section: 'admin' },
  { name: 'Profil', path: '/admin/profile', section: 'admin' },
]

export const DEALER_NAV_ITEMS = [
  { name: 'Vue générale', path: '/dealer' },
  { name: 'Boutiques', path: '/dealer/stores' },
  { name: 'Ouverture du jour', path: '/dealer/open-day' },
  { name: 'Ravitaillements', path: '/dealer/requests' },
  { name: 'Clôtures', path: '/dealer/closures' },
  { name: 'Historique', path: '/dealer/history' },
  { name: 'Alertes', path: '/dealer/alerts' },
  { name: 'Profil', path: '/dealer/profile' },
]
