import { useAuth } from '../../context/AuthContext'
import { AUTH_ROLES } from '../../constants/authMessages'
import AuthPage from './AuthPage'

function ProtectedRoute({ children }) {
  const { currentUser, userProfile, activeStore, loading, authError, logout, role } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return <AuthPage />
  }

  // Profil manquant ou invalide (rôle inconnu, compte inactif, profil introuvable)
  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="max-w-md rounded-lg bg-white p-6 text-center shadow-md">
          <h1 className="mb-3 text-xl font-bold text-gray-800">Accès bloqué</h1>
          <p className="mb-6 text-gray-600">
            {authError || 'Ce compte n’est pas autorisé à accéder à l’application.'}
          </p>
          <button
            onClick={logout}
            className="rounded bg-red-600 px-5 py-2 font-medium text-white hover:bg-red-700"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    )
  }

  // Rôle absent du registre connu (ne devrait pas survenir en pratique)
  if (!role || !Object.values(AUTH_ROLES).includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="max-w-md rounded-lg bg-white p-6 text-center shadow-md">
          <h1 className="mb-3 text-xl font-bold text-gray-800">Accès bloqué</h1>
          <p className="mb-6 text-gray-600">Ce compte possède un rôle non reconnu.</p>
          <button
            onClick={logout}
            className="rounded bg-red-600 px-5 py-2 font-medium text-white hover:bg-red-700"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    )
  }

  // store_admin sans boutique active (boutique inactive, introuvable, storeId manquant)
  if (role === AUTH_ROLES.STORE_ADMIN && !activeStore) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="max-w-md rounded-lg bg-white p-6 text-center shadow-md">
          <h1 className="mb-3 text-xl font-bold text-gray-800">Accès bloqué</h1>
          <p className="mb-6 text-gray-600">
            {authError || 'Ce compte n’est pas rattaché à une boutique active.'}
          </p>
          <button
            onClick={logout}
            className="rounded bg-red-600 px-5 py-2 font-medium text-white hover:bg-red-700"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    )
  }

  // Rôles globaux (system_manager, dealer) : espace en attente de déploiement V2
  if (role === AUTH_ROLES.SYSTEM_MANAGER || role === AUTH_ROLES.DEALER) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="max-w-md rounded-lg bg-white p-6 text-center shadow-md">
          <h1 className="mb-3 text-xl font-bold text-gray-800">
            {role === AUTH_ROLES.SYSTEM_MANAGER ? 'Espace Gérant global' : 'Espace Dealer'}
          </h1>
          <p className="mb-6 text-gray-600">
            Votre espace est en cours de déploiement. Revenez bientôt.
          </p>
          <button
            onClick={logout}
            className="rounded bg-gray-600 px-5 py-2 font-medium text-white hover:bg-gray-700"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    )
  }

  return children
}

export default ProtectedRoute
