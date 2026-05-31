import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { firestoreService } from '../services/firestore'
import { AUTH_ROLE_LABELS, AUTH_ROLES } from '../constants/authMessages'

function Users() {
  const { userProfile, activeStore, isStoreAdmin, createCashierAccount } = useAuth()
  const [users, setUsers] = useState([])
  const [formData, setFormData] = useState({ name: '', email: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    if (!userProfile?.storeId) return undefined

    return firestoreService.subscribeToStoreUsers(userProfile.storeId, setUsers)
  }, [userProfile?.storeId])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage({ type: '', text: '' })

    if (!formData.name.trim() || !formData.email.trim()) {
      setMessage({ type: 'error', text: 'Nom et email obligatoires' })
      return
    }

    try {
      setIsSubmitting(true)
      const result = await createCashierAccount({
        name: formData.name.trim(),
        email: formData.email.trim()
      })
      setFormData({ name: '', email: '' })
      setMessage({
        type: 'success',
        text: result?.resetLink
          ? `Compte caissière créé. Lien de réinitialisation: ${result.resetLink}`
          : 'Compte caissière créé.'
      })
    } catch (error) {
      setMessage({ type: 'error', text: error?.message || 'Impossible de créer la caissière' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleActive = async (user) => {
    if (user.role === AUTH_ROLES.STORE_ADMIN) return
    await firestoreService.setUserActive(user.id, user.active === false)
  }

  if (!isStoreAdmin) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Utilisateurs</h1>
        <p className="text-gray-600">Seul le compte boutique peut gérer les caissières.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800">Utilisateurs</h1>
        <p className="text-gray-600 mt-1">{activeStore?.name || 'Boutique'}</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Créer une caissière</h2>
        {message.text && (
          <div className={`mb-4 rounded p-3 text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Nom de la caissière"
            className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-green-500"
          />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email de la caissière"
            className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-green-500"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium py-2 px-6 rounded"
          >
            {isSubmitting ? 'Création...' : 'Créer'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Comptes de la boutique</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-3 text-left">Nom</th>
                <th className="border px-4 py-3 text-left">Email</th>
                <th className="border px-4 py-3 text-left">Rôle</th>
                <th className="border px-4 py-3 text-left">Statut</th>
                <th className="border px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td className="border px-4 py-3">{user.name || '-'}</td>
                  <td className="border px-4 py-3">{user.email}</td>
                  <td className="border px-4 py-3">{AUTH_ROLE_LABELS[user.role] || user.role}</td>
                  <td className="border px-4 py-3">{user.active === false ? 'Inactif' : 'Actif'}</td>
                  <td className="border px-4 py-3 text-center">
                    {user.role !== AUTH_ROLES.STORE_ADMIN && (
                      <button
                        onClick={() => handleToggleActive(user)}
                        className="bg-gray-700 hover:bg-gray-800 text-white px-3 py-1 rounded text-sm"
                      >
                        {user.active === false ? 'Activer' : 'Désactiver'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Users
