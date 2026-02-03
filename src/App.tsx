import { useEffect, useState, useRef } from 'react'
import { Header } from './components/Header'
import { QRScanner } from './components/QRScanner'
import { SpotifyPlayer } from './components/SpotifyPlayer'
import { ErrorDisplay } from './components/ErrorDisplay'
import { useSpotifyAuth } from './hooks/useSpotifyAuth'
import { useSpotifyPlayer } from './hooks/useSpotifyPlayer'
import { useScanStore } from './store/scanStore'
import { startAutoplayKeepAlive } from './lib/spotify/player'

type View = 'scanner' | 'player'

function App() {
  const [currentView, setCurrentView] = useState<View>('player')
  const { handleCallback, error: authError, clearError: clearAuthError } = useSpotifyAuth()
  const { play, error: playerError, clearError: clearPlayerError } = useSpotifyPlayer()
  const { error: scanError, clearError: clearScanError } = useScanStore()
  const callbackProcessed = useRef(false)

  // Handle OAuth callback
  useEffect(() => {
    // Only process the callback once
    if (callbackProcessed.current) return

    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const state = urlParams.get('state')

    if (code && state) {
      callbackProcessed.current = true
      // Clear URL parameters immediately to prevent re-processing
      window.history.replaceState({}, document.title, window.location.pathname)

      handleCallback(code, state)
    }
  }, [])

  // Handle successful QR scan
  const handleScanSuccess = async (trackId: string) => {
    setCurrentView('player')
    try {
      await play(trackId)
    } catch (error) {
      console.error('Failed to play track:', error)
    }
  }

  // Switch to scanner view
  const showScanner = () => {
    // Unlock audio during the click event (must be synchronous with user gesture)
    startAutoplayKeepAlive()
    setCurrentView('scanner')
  }

  // Determine which error to show (priority: auth > player > scan)
  const currentError = authError || playerError || scanError
  const handleClearError = () => {
    clearAuthError()
    clearPlayerError()
    clearScanError()
  }

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground">
      <Header />

      <main className="h-[calc(100vh-4rem)] mt-16 overflow-hidden">
        {currentView === 'scanner' ? (
          <QRScanner onScanSuccess={handleScanSuccess} />
        ) : (
          <SpotifyPlayer onScanAgain={showScanner} />
        )}
      </main>

      <ErrorDisplay error={currentError} onDismiss={handleClearError} />
    </div>
  )
}

export default App
