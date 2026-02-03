import { useEffect } from 'react'
import { Play, Pause, ScanLine } from 'lucide-react'
import { Button } from './ui/button'
import { useSpotifyPlayer } from '@/hooks/useSpotifyPlayer'

interface SpotifyPlayerProps {
  onScanAgain: () => void
}

export function SpotifyPlayer({ onScanAgain }: SpotifyPlayerProps) {
  const {
    currentTrack,
    isPlaying,
    error,
    isLoading,
    autoplayBlocked,
    pause,
    resume,
  } = useSpotifyPlayer()

  const handlePlayPause = () => {
    if (isPlaying) {
      pause()
    } else {
      resume()
    }
  }

  // Show error if there is one
  useEffect(() => {
    if (error) {
      console.error('Player error:', error)
    }
  }, [error])

  // If no track is loaded, show the scanner prompt
  if (!currentTrack && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="text-center max-w-md">
          <ScanLine className="h-20 w-20 text-spotify-green mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Ready to Play</h2>
          <p className="text-muted-foreground mb-8">
            Scan a Spotify QR code to start listening to music
          </p>
          <Button onClick={onScanAgain} variant="spotify" size="lg" className="w-full">
            Start Scanning
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 gap-6">
      {/* Play/Pause Button */}
      <Button
        variant="spotify"
        size="icon"
        className="h-20 w-20"
        onClick={handlePlayPause}
        disabled={isLoading}
      >
        {isPlaying ? (
          <Pause className="h-10 w-10" fill="currentColor" />
        ) : (
          <Play className="h-10 w-10" fill="currentColor" />
        )}
      </Button>

      {autoplayBlocked && !isPlaying && (
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Autoplay is blocked on iOS. Tap Play to start.
        </p>
      )}

      {/* Scan Next Code Button */}
      <Button
        onClick={onScanAgain}
        variant="outline"
        size="lg"
      >
        <ScanLine className="h-5 w-5 mr-2" />
        Scan next code
      </Button>
    </div>
  )
}
