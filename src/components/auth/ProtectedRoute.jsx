import { useAuth } from '../../context/AuthContext'
import AuthPage from './AuthPage'

function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth()

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

  // Si l'utilisateur est connecté, afficher le contenu protégé
  return children
}

export default ProtectedRoute