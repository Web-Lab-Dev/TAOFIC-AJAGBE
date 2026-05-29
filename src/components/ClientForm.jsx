import { useState, useEffect } from 'react'
import { useToast } from '../hooks/useToast'
import Toast from './Toast'

function ClientForm({ onSubmit, initialData = null, title = 'Ajouter un client' }) {
  const { toasts, showToast, removeToast } = useToast()
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    numeroIdentite: '',
    numeroPersonnel: '',
    orange: '',
    moov: '',
    telecel: '',
    coris: '',
    sank: '',
    localite: '',
    agentCommercial: ''
  })

  // Charger les données initiales si on modifie
  useEffect(() => {
    if (initialData) {
      setFormData({
        nom: initialData.nom || '',
        prenom: initialData.prenom || '',
        numeroIdentite: initialData.numeroIdentite || '',
        numeroPersonnel: initialData.numeroPersonnel || '',
        orange: initialData.orange || '',
        moov: initialData.moov || '',
        telecel: initialData.telecel || '',
        coris: initialData.coris || '',
        sank: initialData.sank || '',
        localite: initialData.localite || '',
        agentCommercial: initialData.agentCommercial || ''
      })
    }
  }, [initialData])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Validation basique
    if (!formData.nom || !formData.prenom) {
      showToast('Le nom et le prénom sont obligatoires', 'error')
      return
    }

    onSubmit(formData)
    
    // Reset du formulaire seulement si on n'est pas en mode modification
    if (!initialData) {
      setFormData({
        nom: '',
        prenom: '',
        numeroIdentite: '',
        numeroPersonnel: '',
        orange: '',
        moov: '',
        telecel: '',
        coris: '',
        sank: '',
        localite: '',
        agentCommercial: ''
      })
    }
  }

  const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-green-500"

  return (
    <div className="bg-white rounded-lg shadow-md p-6 w-full">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b-2 border-green-500 pb-2">
        {title}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom
          </label>
          <input
            type="text"
            name="nom"
            value={formData.nom}
            onChange={handleChange}
            className={inputClasses}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prénom
          </label>
          <input
            type="text"
            name="prenom"
            value={formData.prenom}
            onChange={handleChange}
            className={inputClasses}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Numéro d'identité
          </label>
          <input
            type="text"
            name="numeroIdentite"
            value={formData.numeroIdentite}
            onChange={handleChange}
            className={inputClasses}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Numéro personnel
          </label>
          <input
            type="text"
            name="numeroPersonnel"
            value={formData.numeroPersonnel}
            onChange={handleChange}
            className={inputClasses}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Orange
          </label>
          <input
            type="text"
            name="orange"
            value={formData.orange}
            onChange={handleChange}
            className={inputClasses}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Localité
          </label>
          <input
            type="text"
            name="localite"
            value={formData.localite}
            onChange={handleChange}
            className={inputClasses}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom de l'agent commercial
          </label>
          <input
            type="text"
            name="agentCommercial"
            value={formData.agentCommercial}
            onChange={handleChange}
            className={inputClasses}
          />
        </div>

        <button
          type="submit"
          className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded mt-6"
        >
          {initialData ? 'Modifier' : 'Enregistrer'}
        </button>
      </form>

      {/* Toasts */}
      <div className="fixed top-0 right-0 z-50 space-y-2 p-4">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  )
}

export default ClientForm
