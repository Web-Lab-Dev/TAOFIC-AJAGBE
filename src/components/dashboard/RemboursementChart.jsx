import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { useMemo } from 'react'
import { useAllTransactions } from '../../hooks/useAllTransactions.js'
import { useTodayTransactions } from '../../hooks/useTodayTransactions.js'

function RemboursementChart() {
  const allTransactions = useAllTransactions()
  const todayTransactions = useTodayTransactions(allTransactions)

  // Mémoriser les calculs pour optimiser les performances
  const { rembourseCount, nonRembourseCount } = useMemo(() => {
    // Crédits créés aujourd'hui qui sont encore "Non Terminées" (en cours)
    const todayPendingCredits = todayTransactions.filter(transaction => (
      transaction.type === "Crédit" &&
      transaction.statut === "Non Terminées"
    ))

    // Crédits créés aujourd'hui qui ont été remboursés (dans l'historique)
    const todayReimbursedCredits = todayTransactions.filter(transaction => (
      transaction.type === "Crédit" &&
      transaction.statut && transaction.statut.startsWith("Remboursé")
    ))

    return {
      rembourseCount: todayReimbursedCredits.length,
      nonRembourseCount: todayPendingCredits.length
    }
  }, [todayTransactions])


  // Données pour le diagramme circulaire
  const data = []

  if (rembourseCount > 0) {
    data.push({
      name: 'Remboursés',
      value: rembourseCount,
      color: '#10B981'
    })
  }

  if (nonRembourseCount > 0) {
    data.push({
      name: 'Non remboursés',
      value: nonRembourseCount,
      color: '#EF4444'
    })
  }

  const COLORS = ['#10B981', '#EF4444']

  const CustomLegend = () => {
    return (
      <div className="flex flex-col space-y-2 text-sm">
        {data.map((entry, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center">
              <div
                className="w-4 h-4 rounded mr-2"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-700">{entry.name}</span>
            </div>
            <span className="text-gray-600 text-xs ml-2">
              {entry.value} crédit{entry.value > 1 ? 's' : ''}
            </span>
          </div>
        ))}
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const total = rembourseCount + nonRembourseCount
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0
      return (
        <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-semibold">{data.name}</p>
          <p className="text-gray-300">
            <span className="text-blue-400">{data.value}</span> crédit{data.value > 1 ? 's' : ''}
          </p>
          <p className="text-gray-400 text-sm">
            {percentage}% du total
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl shadow-sm border border-emerald-100 p-6 h-64">
      <div className="flex items-center space-x-3 mb-4">
        <div className="h-8 w-8 bg-emerald-100 rounded-lg flex items-center justify-center">
          <div className="h-4 w-4 bg-emerald-500 rounded-sm"></div>
        </div>
        <h3 className="text-emerald-800 text-lg font-semibold">
          Taux de remboursement (aujourd'hui)
        </h3>
      </div>

      {/* Afficher un message si aucune donnée */}
      {rembourseCount === 0 && nonRembourseCount === 0 ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-emerald-500 text-sm">Aucun crédit aujourd'hui</p>
        </div>
      ) : (
        <div className="flex items-center justify-between" style={{ height: 'calc(100% - 60px)' }}>
          <ResponsiveContainer width="60%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={60}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="w-40%">
            <CustomLegend />
          </div>
        </div>
      )}
    </div>
  )
}

export default RemboursementChart