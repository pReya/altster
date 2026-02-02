import { useEffect, useState } from 'react'
import { Play, Pause, Volume2, ExternalLink, ScanLine } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { useSpotifyPlayer } from '@/hooks/useSpotifyPlayer'

interface SpotifyPlayerProps {
  onScanAgain: () => void
}

export function SpotifyPlayer({ onScanAgain }: SpotifyPlayerProps) {
  const {
    currentTrack,
    isPlaying,
    playbackType,
    progress,
    volume,
    error,
    isLoading,
    pause,
    resume,
    changeVolume,
  } = useSpotifyPlayer()

  const [showVolumeControl, setShowVolumeControl] = useState(false)

  // Format time in mm:ss
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

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
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4">
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
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-6">
          {/* Album Art */}
          {currentTrack && (
            <div className="relative">
              <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                {currentTrack.album.images[0] ? (
                  <img
                    src={currentTrack.album.images[0].url}
                    alt={currentTrack.album.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="h-20 w-20 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Playback Type Badge */}
              {playbackType && (
                <div className="absolute top-3 right-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    playbackType === 'full'
                      ? 'bg-spotify-green text-black'
                      : 'bg-yellow-500 text-black'
                  }`}>
                    {playbackType === 'full' ? 'Full Track' : 'Preview (30s)'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Track Info */}
          {currentTrack && (
            <div className="space-y-1 text-center">
              <h3 className="text-xl font-bold line-clamp-2">{currentTrack.name}</h3>
              <p className="text-muted-foreground line-clamp-1">
                {currentTrack.artists.map((artist) => artist.name).join(', ')}
              </p>
              <p className="text-sm text-muted-foreground">{currentTrack.album.name}</p>
            </div>
          )}

          {/* Progress Bar (for preview playback) */}
          {playbackType === 'preview' && currentTrack && (
            <div className="space-y-2">
              <div className="w-full bg-muted rounded-full h-1">
                <div
                  className="bg-spotify-green h-1 rounded-full transition-all duration-300"
                  style={{
                    width: `${(progress / currentTrack.duration_ms) * 100}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(currentTrack.duration_ms)}</span>
              </div>
            </div>
          )}

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-4">
            {/* Volume Control */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowVolumeControl(!showVolumeControl)}
              >
                <Volume2 className="h-5 w-5" />
              </Button>
              {showVolumeControl && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-popover rounded-lg shadow-lg">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => changeVolume(Number(e.target.value))}
                    className="w-24 accent-spotify-green"
                  />
                </div>
              )}
            </div>

            {/* Play/Pause Button */}
            <Button
              variant="spotify"
              size="icon"
              className="h-16 w-16"
              onClick={handlePlayPause}
              disabled={isLoading}
            >
              {isPlaying ? (
                <Pause className="h-8 w-8" fill="currentColor" />
              ) : (
                <Play className="h-8 w-8" fill="currentColor" />
              )}
            </Button>

            {/* Open in Spotify */}
            {currentTrack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.open(currentTrack.external_urls.spotify, '_blank')}
              >
                <ExternalLink className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Scan Another Button */}
          <Button
            onClick={onScanAgain}
            variant="outline"
            className="w-full"
          >
            <ScanLine className="h-4 w-4 mr-2" />
            Scan Another QR Code
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
