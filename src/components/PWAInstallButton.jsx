import { useState, useEffect } from 'react'

function isRunningStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

const PWAInstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(() => window.__pwaInstallEvent ?? null)
  const [showButton, setShowButton] = useState(() => {
    if (isRunningStandalone()) return false
    return window.__pwaInstallEvent != null
  })

  useEffect(() => {
    if (isRunningStandalone()) return

    const onAvailable = () => {
      setDeferredPrompt(window.__pwaInstallEvent)
      setShowButton(true)
    }
    const onInstalled = () => {
      setDeferredPrompt(null)
      setShowButton(false)
    }

    window.addEventListener('pwa-install-available', onAvailable)
    window.addEventListener('pwa-installed', onInstalled)
    return () => {
      window.removeEventListener('pwa-install-available', onAvailable)
      window.removeEventListener('pwa-installed', onInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    window.__pwaInstallEvent = null
    setDeferredPrompt(null)
    setShowButton(false)
  }

  if (!showButton) return null

  return (
    <button
      onClick={handleInstall}
      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
      title="Installer l'application"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Installer l'app
    </button>
  )
}

export default PWAInstallButton
