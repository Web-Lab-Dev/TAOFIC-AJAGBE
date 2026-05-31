import { useAuth } from '../../context/AuthContext'
import AuthPage from './AuthPage'

function ProtectedRoute({ children }) {
  const { currentUser, userProfile, activeStore, loading, error, logout } = useAuth()

  // Afficher un loader pendant la vérification
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

  // Si l'utilisateur n'est pas connecté, afficher la page d'authentification
  if (!currentUser) {
    return <AuthPage />
  }

  if (!userProfile || !activeStore) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="max-w-md rounded-lg bg-white p-6 text-center shadow-md">
          <h1 className="mb-3 text-xl font-bold text-gray-800">Accès bloqué</h1>
          <p className="mb-6 text-gray-600">
            {error || 'Ce compte n’est pas rattaché à une boutique active.'}
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

  // Si l'utilisateur est connecté, afficher le contenu protégé
  return children
}

export default ProtectedRoute
