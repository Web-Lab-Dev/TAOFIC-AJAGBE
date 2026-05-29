import * as XLSX from 'xlsx'
import { EXCEL_HEADERS } from '../constants'
import { CLIENT_ID } from '../config/clientIsolation'

// Fonction pour exporter les clients vers XLSM
export const exportClientsToXLSM = (clients, filename = `clients_${CLIENT_ID}`) => {
  try {

    // Convertir les clients en tableau de données
    const data = clients.map(client => [
      client.nom,
      client.prenom,
      client.numeroIdentite,
      client.numeroPersonnel,
      client.orange,
      client.localite,
      client.agentCommercial,
      client.dateAjout
    ])

    // Ajouter les en-têtes en première ligne
    const worksheetData = [EXCEL_HEADERS, ...data]

    // Créer une nouvelle feuille de calcul
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

    // Définir la largeur des colonnes pour une meilleure lisibilité
    worksheet['!cols'] = [
      { width: 15 }, // Nom
      { width: 15 }, // Prénom
      { width: 20 }, // Numéro d'identité
      { width: 18 }, // Numéro personnel
      { width: 12 }, // Orange
      { width: 30 }, // Localité
      { width: 20 }, // Agent commercial
      { width: 15 }  // Date d'ajout
    ]

    // Créer un nouveau classeur et ajouter la feuille
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients')

    // Télécharger le fichier XLSM
    const timestamp = new Date().toISOString().slice(0,10).replace(/-/g, '')
    XLSX.writeFile(workbook, `${filename}_${timestamp}.xlsm`)
    
    return { success: true, count: clients.length }
  } catch (error) {
    console.error('Erreur lors de l\'export:', error)
    return { success: false, error: error.message }
  }
}

// Fonction pour importer des clients depuis un fichier XLSM/XLSX
export const importClientsFromXLSM = (file) => {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          
          // Prendre la première feuille
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          
          // Convertir en JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
          
          // Ignorer la première ligne (en-têtes)
          const clientsData = jsonData.slice(1)
          
          // Mapper les données vers le format client
          const headers = jsonData[0] || []
          const hasLegacyNetworkColumns = headers.includes('Moov') || headers.includes('Telecel') || headers.includes('Coris') || headers.includes('Sank')

          const clients = clientsData
            .filter(row => row[0] && row[1]) // S'assurer qu'au moins nom et prénom existent
            .map((row, index) => ({
              id: `import_${Date.now()}_${index}`,
              nom: row[0] || '',
              prenom: row[1] || '',
              numeroIdentite: row[2] || '',
              numeroPersonnel: row[3] || '',
              orange: row[4] || '',
              moov: hasLegacyNetworkColumns ? row[5] || '' : '',
              telecel: hasLegacyNetworkColumns ? row[6] || '' : '',
              coris: hasLegacyNetworkColumns ? row[7] || '' : '',
              sank: hasLegacyNetworkColumns ? row[8] || '' : '',
              localite: hasLegacyNetworkColumns ? row[9] || '' : row[5] || '',
              agentCommercial: hasLegacyNetworkColumns ? row[10] || '' : row[6] || '',
              dateAjout: (hasLegacyNetworkColumns ? row[11] : row[7]) || new Date().toLocaleDateString('fr-FR')
            }))
          
          resolve({ success: true, clients, count: clients.length })
        } catch (error) {
          reject({ success: false, error: `Erreur de lecture du fichier: ${error.message}` })
        }
      }
      
      reader.onerror = () => {
        reject({ success: false, error: 'Erreur de lecture du fichier' })
      }
      
      reader.readAsArrayBuffer(file)
    } catch (error) {
      reject({ success: false, error: error.message })
    }
  })
}

// Fonction pour valider le format du fichier
export const validateExcelFile = (file) => {
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel.sheet.macroEnabled.12', // .xlsm
    'application/vnd.ms-excel' // .xls (legacy)
  ]
  
  const validExtensions = ['.xlsx', '.xlsm', '.xls']
  const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
  
  return {
    isValid: validTypes.includes(file.type) || validExtensions.includes(fileExtension),
    message: validTypes.includes(file.type) || validExtensions.includes(fileExtension) 
      ? 'Fichier valide' 
      : 'Veuillez sélectionner un fichier Excel (.xlsx, .xlsm, ou .xls)'
  }
}
