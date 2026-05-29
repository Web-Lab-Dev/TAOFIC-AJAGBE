import { useEffect, useRef, useState } from 'react'
import ChatMessage from './ChatMessage'

function MessageList({ messages, isTyping }) {
  const messagesEndRef = useRef(null)
  const containerRef = useRef(null)
  const [isNearBottom, setIsNearBottom] = useState(true)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Vérifier si l'utilisateur est proche du bas de la conversation
  const checkIfNearBottom = () => {
    const container = containerRef.current
    if (!container) return true

    const scrollHeight = container.scrollHeight
    const scrollTop = container.scrollTop
    const clientHeight = container.clientHeight
    const threshold = 100 // pixels de seuil

    return scrollHeight - scrollTop - clientHeight < threshold
  }

  // Gérer le scroll manuel de l'utilisateur
  const handleScroll = () => {
    setIsNearBottom(checkIfNearBottom())
  }

  // Auto-scroll seulement si l'utilisateur est proche du bas
  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom()
    }
  }, [messages, isTyping, isNearBottom])

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 space-y-2"
    >
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <div className="text-4xl mb-2">🤖</div>
          <p className="text-sm text-center">
            Bonjour ! Je suis votre assistant.<br />
            Comment puis-je vous aider aujourd'hui ?
          </p>
        </div>
      ) : (
        messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            isUser={message.sender === 'user'}
          />
        ))
      )}

      {isTyping && (
        <div className="flex justify-start mb-3">
          <div className="bg-gray-100 px-4 py-2 rounded-lg rounded-bl-none max-w-xs">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 italic">Vérification en cours</span>
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
}

export default MessageList