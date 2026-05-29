import { useState, useMemo } from 'react'
import { MONTHS } from '../constants'

export const useClientsFilter = (clients) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('Tous les mois')

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch = client.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           client.prenom.toLowerCase().includes(searchTerm.toLowerCase())
      
      let matchesMonth = true
      if (selectedMonth !== 'Tous les mois') {
        const selectedMonthNumber = MONTHS[selectedMonth]
        if (selectedMonthNumber && client.dateAjout) {
          const dateParts = client.dateAjout.split('/')
          if (dateParts.length === 3) {
            const clientMonth = dateParts[1]
            matchesMonth = clientMonth === selectedMonthNumber
          } else {
            matchesMonth = false
          }
        }
      }
      
      return matchesSearch && matchesMonth
    })
  }, [clients, searchTerm, selectedMonth])

  return {
    searchTerm,
    setSearchTerm,
    selectedMonth,
    setSelectedMonth,
    filteredClients
  }
}