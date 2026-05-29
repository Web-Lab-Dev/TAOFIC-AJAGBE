import { useClients } from '../hooks/useClients'
import TransactionForm from '../components/transactions/TransactionForm'
import TransactionTable from '../components/transactions/TransactionTable'
import ErrorBoundary from '../components/ui/ErrorBoundary'

function Transactions() {
  const { clients } = useClients()

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 border-b-2 border-green-500 pb-2">
          Transactions
        </h1>

        <div className="space-y-8">
          {/* Formulaire de transaction */}
          <ErrorBoundary>
            <TransactionForm clients={clients} />
          </ErrorBoundary>

          {/* Tableau des transactions */}
          <ErrorBoundary>
            <TransactionTable />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  )
}

export default Transactions