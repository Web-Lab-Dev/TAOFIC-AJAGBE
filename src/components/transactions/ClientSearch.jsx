import { useState, useMemo, useEffect, useCallback } from 'react'

function ClientSearch({ clients, onClientSelect, selectedClient }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // Debouncing du terme de recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300) // 300ms de délai

    return () => clearTimeout(timer)
  }, [searchTerm])

  const filteredClients = useMemo(() => {
    if (!debouncedSearchTerm.trim() || !clients || clients.length === 0) return []

    const term = debouncedSearchTerm.toLowerCase()
    return clients.filter(client => {
      if (!client) return false

      const nom = client.nom?.toLowerCase() || ''
      const prenom = client.prenom?.toLowerCase() || ''
      const orange = client.orange?.toLowerCase() || ''

      return nom.includes(term) ||
             prenom.includes(term) ||
             orange.includes(term)
    }).slice(0, 10)
  }, [clients, debouncedSearchTerm])

  const handleInputChange = useCallback((e) => {
    setSearchTerm(e.target.value)
    setIsDropdownOpen(true)
  }, [])

  const handleClientSelect = (client) => {
    setSearchTerm(`${client.nom} ${client.prenom}`)
    setIsDropdownOpen(false)
    onClientSelect(client)
  }

  // Reset search when client is cleared from parent
  useEffect(() => {
    if (!selectedClient) {
      setSearchTerm('')
      setIsDropdownOpen(false)
    }
  }, [selectedClient])

  const formatClientDisplay = (client) => {
    const accounts = []
    if (client.orange) accounts.push(`Orange: ${client.orange}`)
    
    return `${client.nom} ${client.prenom} | ${accounts.join(' | ')}`
  }

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Rechercher par nom, prénom ou code compte..."
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={() => searchTerm && setIsDropdownOpen(true)}
        onBlur={() => setTimeout(() => setIsDropdownOpen(false), 300)}
        className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:outline-none focus:border-green-500 bg-white transition-colors"
      />
      
      {isDropdownOpen && filteredClients.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
          {filteredClients.map((client) => (
            <li
              key={client.id}
              onMouseDown={(e) => {
                e.preventDefault()
                handleClientSelect(client)
              }}
              className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
            >
              <div className="text-sm text-gray-800">
                {formatClientDisplay(client)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ClientSearch
