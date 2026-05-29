import { memo } from 'react'

function ChatMessage({ message, isUser }) {
  return (
    <div className={`flex mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[260px] sm:max-w-xs lg:max-w-md px-3 py-2 sm:px-4 rounded-lg text-sm
          ${isUser
            ? 'bg-blue-50 text-gray-800 rounded-br-none'
            : 'bg-gray-100 text-gray-800 rounded-bl-none'
          }
        `}
      >
        <p className="whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  )
}

export default memo(ChatMessage)