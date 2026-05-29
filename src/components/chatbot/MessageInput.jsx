import { useState, useCallback, useRef, useEffect } from 'react'

function MessageInput({ onSendMessage, disabled }) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef(null)

  // Auto-resize du textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = '40px' // Reset to minimum
      const scrollHeight = textarea.scrollHeight
      const maxHeight = 120 // Maximum height in pixels
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`
    }
  }, [])

  // Ajuster la hauteur quand le contenu change
  useEffect(() => {
    adjustTextareaHeight()
  }, [message, adjustTextareaHeight])

  const handleSubmit = useCallback((e) => {
    e.preventDefault()

    if (message.trim() && !disabled) {
      onSendMessage(message.trim())
      setMessage('')
    }
  }, [message, onSendMessage, disabled])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }, [handleSubmit])

  return (
    <div className="border-t border-gray-200 p-4">
      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez votre question ici..."
            className="
              w-full px-3 py-2 border border-gray-300 rounded-lg
              resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:bg-gray-100 disabled:cursor-not-allowed
            "
            rows="1"
            disabled={disabled}
            style={{
              minHeight: '40px',
              maxHeight: '120px',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className="
            px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            disabled:bg-gray-300 disabled:cursor-not-allowed
            transition-colors duration-200 flex items-center justify-center
          "
          style={{ minHeight: '40px', minWidth: '40px' }}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </form>
    </div>
  )
}

export default MessageInput