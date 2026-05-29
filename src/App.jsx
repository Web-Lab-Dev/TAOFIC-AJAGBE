import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ClientsProvider } from './context/ClientsContext.jsx'
import { TransactionsProvider } from './context/transactions.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { NetworkConfigProvider } from './context/NetworkConfigContext.jsx'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Transactions from './pages/Transactions'
import Historique from './pages/Historique'
import Formulaire from './pages/Formulaire'
import Personnalisation from './pages/Personnalisation'
import Profil from './pages/Profil'

function AppContent() {
  return (
    <ProtectedRoute>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/historique" element={<Historique />} />
          <Route path="/formulaire" element={<Formulaire />} />
          <Route path="/personnalisation" element={<Personnalisation />} />
          <Route path="/profil" element={<Profil />} />
        </Routes>
      </Layout>
    </ProtectedRoute>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <NetworkConfigProvider>
            <ClientsProvider>
              <TransactionsProvider>
                <AppContent />
              </TransactionsProvider>
            </ClientsProvider>
          </NetworkConfigProvider>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
