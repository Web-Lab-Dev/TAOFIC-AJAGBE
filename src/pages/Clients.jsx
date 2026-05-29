import { useState } from 'react'
import { useClients } from '../hooks/useClients'
import ClientsTable from '../components/ClientsTable'
import ClientForm from '../components/ClientForm'

function Clients() {
  const { clients, deleteClient, editClient, addClient } = useClients()
  const [editingClient, setEditingClient] = useState(null)

  const handleDelete = (clientId) => {
    const client = clients.find(c => c.id === clientId)
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le client ${client?.nom} ${client?.prenom} ?`)) {
      deleteClient(clientId)
    }
  }

  const handleEdit = (client) => {
    setEditingClient(client)
  }

  const handleEditSubmit = (updatedData) => {
    editClient(editingClient.id, updatedData)
    setEditingClient(null)
  }

  const handleCancelEdit = () => {
    setEditingClient(null)
  }

  const handleImportClients = (importedClients) => {
    // Ajouter chaque client importé sans l'ID généré automatiquement
    importedClients.forEach(clientData => {
      const { id: _id, ...clientWithoutId } = clientData
      addClient(clientWithoutId)
    })
  }

  if (editingClient) {
    return (
      <div>
        <div className="mb-4">
          <button
            onClick={handleCancelEdit}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            ← Retour à la liste
          </button>
        </div>
        <ClientForm 
          onSubmit={handleEditSubmit}
          initialData={editingClient}
          title="Modifier le client"
        />
      </div>
    )
  }

  return (
    <ClientsTable 
      clients={clients}
      onDelete={handleDelete}
      onEdit={handleEdit}
      onImportClients={handleImportClients}
    />
  )
}

export default Clients