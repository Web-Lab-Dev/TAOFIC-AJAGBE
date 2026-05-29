import { memo } from 'react'

const TableRow = memo(({ client, index, onEdit, onDelete }) => {
  return (
    <tr className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
      <td className="border border-green-300 px-4 py-3 text-base">{client.nom}</td>
      <td className="border border-green-300 px-4 py-3 text-base">{client.prenom}</td>
      <td className="border border-green-300 px-4 py-3 text-base">{client.numeroIdentite}</td>
      <td className="border border-green-300 px-4 py-3 text-base">{client.numeroPersonnel}</td>
      <td className="border border-green-300 px-4 py-3 text-base">{client.orange}</td>
      <td className="border border-green-300 px-4 py-3 text-base max-w-48 break-words">{client.localite}</td>
      <td className="border border-green-300 px-4 py-3 text-base">{client.agentCommercial}</td>
      <td className="border border-green-300 px-4 py-3 text-base">{client.dateAjout}</td>
      <td className="border border-green-300 px-4 py-3 text-center">
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => onEdit && onEdit(client)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm"
          >
            Modifier
          </button>
          <button
            onClick={() => onDelete && onDelete(client.id)}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
          >
            Supprimer
          </button>
        </div>
      </td>
    </tr>
  )
})

TableRow.displayName = 'TableRow'

export default TableRow
