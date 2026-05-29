import { useState, useCallback } from 'react'
import MessageList from './MessageList'
import MessageInput from './MessageInput'

function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false)

  // URL du webhook n8n - à configurer plus tard
  const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || ''

  // Limite de messages pour éviter les problèmes de mémoire
  const MAX_MESSAGES = 100

  // Fonction pour nettoyer les anciens messages
  const cleanupMessages = useCallback((newMessages) => {
    if (newMessages.length > MAX_MESSAGES) {
      // Garder seulement les derniers messages
      return newMessages.slice(-MAX_MESSAGES)
    }
    return newMessages
  }, [])

  const toggleChatbot = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  const sendMessage = useCallback(async (messageContent) => {
    // Ajouter le message de l'utilisateur immédiatement
    const userMessage = {
      id: crypto.randomUUID(),
      content: messageContent,
      sender: 'user',
      timestamp: new Date().toISOString()
    }

    setMessages(prev => cleanupMessages([...prev, userMessage]))
    setIsTyping(true)

    try {
      if (WEBHOOK_URL) {
        // Timeout de 30 secondes pour éviter les requêtes bloquées
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000)

        try {
          const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              message: messageContent,
              timestamp: userMessage.timestamp
            }),
            signal: controller.signal
          })

          clearTimeout(timeoutId)

        if (response.ok) {
          let botResponse = {}
          const responseText = await response.text()

          if (responseText.trim()) {
            try {
              botResponse = JSON.parse(responseText)
            } catch {
              botResponse = { message: responseText }
            }
          } else {
            botResponse = { message: `Message traité avec succès !` }
          }

          // Extraire le contenu avec flexibilité
          const extractContent = (response) => {
            if (typeof response === 'string') return response
            const contentFields = ['message', 'response', 'text', 'content', 'reply']
            for (const field of contentFields) {
              if (response[field]) return response[field]
            }
            const firstStringValue = Object.values(response).find(val => typeof val === 'string')
            return firstStringValue || JSON.stringify(response)
          }

          const responseContent = extractContent(botResponse)

          const botMessage = {
            id: crypto.randomUUID(),
            content: responseContent || 'Réponse reçue du webhook n8n',
            sender: 'bot',
            timestamp: new Date().toISOString()
          }

          setMessages(prev => cleanupMessages([...prev, botMessage]))
        } else {
          throw new Error(`Webhook error: ${response.status}`)
        }
        } catch (fetchError) {
          clearTimeout(timeoutId)
          if (fetchError.name === 'AbortError') {
            throw new Error('Timeout: La requête a pris trop de temps')
          }
          throw fetchError
        }
      } else {
        // Réponse simulée quand le webhook n'est pas configuré
        await new Promise(resolve => setTimeout(resolve, 1500))

        const botMessage = {
          id: crypto.randomUUID(),
          content: `Merci pour votre message : "${messageContent}". Le webhook n8n n'est pas encore configuré. Ajoutez l'URL dans les variables d'environnement VITE_N8N_WEBHOOK_URL dans votre fichier .env.`,
          sender: 'bot',
          timestamp: new Date().toISOString()
        }

        setMessages(prev => cleanupMessages([...prev, botMessage]))
      }
    } catch (error) {
      // Mode de fallback - réponse intelligente
      await new Promise(resolve => setTimeout(resolve, 1000))

      let errorContent = ''
      if (error.message.includes('404')) {
        errorContent = `Le webhook n8n semble inaccessible (404). Vérifiez que votre workflow n8n est activé et que l'URL est correcte. En attendant, je peux vous dire que j'ai bien reçu votre message : "${messageContent}"`
      } else if (error.message.includes('Failed to fetch')) {
        errorContent = `Problème de connexion au webhook n8n (CORS/Network). Votre message était : "${messageContent}". Vérifiez la configuration CORS de votre workflow n8n.`
      } else if (error.message.includes('Timeout')) {
        errorContent = `La requête a pris trop de temps (timeout 30s). Votre message : "${messageContent}" a été reçu mais le traitement est trop long.`
      } else {
        errorContent = `Erreur technique temporaire. Votre message : "${messageContent}" a été reçu mais je ne peux pas le traiter pour le moment.`
      }

      const errorMessage = {
        id: crypto.randomUUID(),
        content: errorContent,
        sender: 'bot',
        timestamp: new Date().toISOString()
      }

      setMessages(prev => cleanupMessages([...prev, errorMessage]))
    } finally {
      setIsTyping(false)
    }
  }, [WEBHOOK_URL, cleanupMessages])

  return (
    <>
      {/* Bouton flottant pour ouvrir/fermer le chatbot */}
      <button
        onClick={toggleChatbot}
        className="
          fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999]
          w-12 h-12 sm:w-14 sm:h-14 bg-blue-500 hover:bg-blue-600 text-white
          rounded-full shadow-lg hover:shadow-xl
          flex items-center justify-center
          transition-all duration-300 transform hover:scale-110
          focus:outline-none focus:ring-4 focus:ring-blue-300
        "
        aria-label={isOpen ? 'Fermer le chatbot' : 'Ouvrir le chatbot'}
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Fenêtre du chatbot */}
      {isOpen && (
        <div className="
          fixed bottom-16 right-2 left-2 sm:bottom-20 sm:right-6 sm:left-auto z-[9998]
          w-auto sm:w-80 md:w-96 h-80 sm:h-96 md:h-[32rem] bg-white rounded-lg shadow-xl
          border border-gray-200 flex flex-col
          transform transition-all duration-300 scale-100
          max-w-md mx-auto sm:mx-0
        ">
          {/* En-tête du chatbot */}
          <div className="
            bg-blue-500 text-white p-4 rounded-t-lg
            flex items-center justify-between
          ">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <h3 className="font-medium">Assistant</h3>
            </div>
            <button
              onClick={toggleChatbot}
              className="
                hover:bg-blue-600 rounded p-1
                transition-colors duration-200
              "
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Zone des messages */}
          <MessageList messages={messages} isTyping={isTyping} />

          {/* Zone de saisie */}
          <MessageInput onSendMessage={sendMessage} disabled={isTyping} />
        </div>
      )}
    </>
  )
}

export default Chatbot
