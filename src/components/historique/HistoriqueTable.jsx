import { useTransactions } from '../../context/transactions.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import { getClientName, formatTransactionDateTime } from '../../utils/helpers.js'

function HistoriqueTable({ transactions = [] }) {
  const { getTransactionStyles } = useTransactions()
  const { themeClasses } = useTheme()
  const allTransactions = transactions
  
  const headers = [
    'Date & heure',
    'Client', 
    'Type',
    'Réseau',
    'Code',
    'Montant',
    'Statut',
    'Utilisateur',
    'Email utilisateur'
  ]


  return (
    <div className="mt-6">
      <div className={`overflow-x-auto border ${themeClasses.tableHeader.split(' ')[1]} rounded`}>
        <table className="w-full border-collapse min-w-max">
          <thead>
            <tr className={themeClasses.tableHeader}>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className={`border ${themeClasses.tableHeader.split(' ')[1]} px-4 py-3 text-left text-base font-medium ${themeClasses.text} whitespace-nowrap`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allTransactions.length === 0 ? (
              <tr>
                <td 
                  colSpan={headers.length} 
                  className="border border-green-300 px-4 py-8 text-center text-gray-500"
                >
                  Aucune transaction dans l'historique
                </td>
              </tr>
            ) : (
              allTransactions.map((transaction, index) => {
                const styles = getTransactionStyles(transaction.type)
                return (
                  <tr
                    key={transaction.id || `${transaction.clientId || 'transaction'}-${transaction.date || index}-${index}`}
                    className={`border-b border-gray-100 ${styles.bgColor} ${styles.textColor}`}
                  >
                    <td className="border border-green-300 px-4 py-3 text-base">
                      {formatTransactionDateTime(transaction)}
                    </td>
                    <td className="border border-green-300 px-4 py-3 text-base">
                      {getClientName(transaction.client)}
                    </td>
                    <td className="border border-green-300 px-4 py-3 text-base font-medium">
                      {transaction.type || '-'}
                    </td>
                    <td className="border border-green-300 px-4 py-3 text-base">
                      {transaction.reseau || transaction.network || '-'}
                    </td>
                    <td className="border border-green-300 px-4 py-3 text-base">
                      {transaction.code || '-'}
                    </td>
                    <td className="border border-green-300 px-4 py-3 text-base font-medium">
                      {transaction.montant ? `${(Number(transaction.montant) || 0).toLocaleString('fr-FR')} FCFA` :
                       transaction.amount ? `${transaction.amount} FCFA` : '-'}
                    </td>
                    <td className="border border-green-300 px-4 py-3 text-base">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                        {transaction.statut || 'Validée'}
                      </span>
                    </td>
                    <td className="border border-green-300 px-4 py-3 text-base">
                      {transaction.operatorName || transaction.userName || '-'}
                    </td>
                    <td className="border border-green-300 px-4 py-3 text-base">
                      {transaction.operatorEmail || transaction.userEmail || '-'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default HistoriqueTable
