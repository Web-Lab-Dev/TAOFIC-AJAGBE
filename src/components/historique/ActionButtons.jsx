import { useRef } from 'react'
import * as XLSX from 'xlsx'
import { useTransactions } from '../../context/transactions.jsx'
import { EXPORT_CONFIG, MESSAGES } from '../../utils/constants.js'
import { createExportData, generateExportFilename } from '../../utils/helpers.js'

function ActionButtons({ filteredTransactions = [], resetFilters }) {
  const { addTransaction } = useTransactions()
  const fileInputRef = useRef(null)


  const handleExport = () => {
    if (filteredTransactions.length === 0) {
      alert(MESSAGES.ERRORS.NO_EXPORT_DATA)
      return
    }

    const exportData = createExportData(filteredTransactions)

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)
    ws['!cols'] = EXPORT_CONFIG.COLUMN_WIDTHS
    XLSX.utils.book_append_sheet(wb, ws, EXPORT_CONFIG.SHEET_NAME)
    const filename = generateExportFilename(filteredTransactions.length)

    // Télécharger le fichier
    XLSX.writeFile(wb, filename)
  }

  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        
        // Prendre la première feuille
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        // Convertir en JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        
        let importedCount = 0
        
        // Traiter chaque ligne
        jsonData.forEach(row => {
          // Mapper les données importées vers le format de transaction
          if (row['Client'] && row['Type'] && row['Montant (FCFA)']) {
            const transaction = {
              client: row['Client'],
              type: row['Type'],
              reseau: row['Réseau'] || 'Orange',
              code: row['Code'] || '000000',
              montant: parseFloat(row['Montant (FCFA)']) || 0,
              statut: 'Validée', // Les imports sont toujours validés
              userEmail: row['Email utilisateur'] || ''
            }
            
            addTransaction(transaction)
            importedCount++
          }
        })
        
        alert(MESSAGES.SUCCESS.IMPORT_SUCCESS(importedCount))
        
        // Réinitialiser les filtres pour voir les nouvelles transactions
        resetFilters && resetFilters()
        
      } catch (error) {
        console.error('Erreur lors de l\'import:', error)
        alert(MESSAGES.ERRORS.IMPORT_ERROR)
      }
    }
    
    reader.readAsArrayBuffer(file)
    
    // Réinitialiser l'input file
    event.target.value = ''
  }

  return (
    <div className="flex gap-4 mt-4">
      <button
        onClick={handleExport}
        className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded font-medium transition-colors"
      >
        Exporter XLSM
      </button>
      
      <button
        onClick={handleImport}
        className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded font-medium transition-colors"
      >
        Importer (XLSM)
      </button>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept={EXPORT_CONFIG.FILE_EXTENSIONS}
        className="hidden"
      />
    </div>
  )
}

export default ActionButtons
