import { useEffect } from 'react'
import { Camera, ScanLine } from 'lucide-react'
import { Button } from './ui/button'
import { useQRScanner } from '@/hooks/useQRScanner'
import { useScanStore } from '@/store/scanStore'

interface QRScannerProps {
  onScanSuccess: (trackId: string) => void
}

const SCANNER_ELEMENT_ID = 'qr-scanner'

export function QRScanner({ onScanSuccess }: QRScannerProps) {
  const { start, stop } = useQRScanner(onScanSuccess)
  const { isScanning, isCameraReady, error } = useScanStore()

  useEffect(() => {
    // Start scanner on mount
    start(SCANNER_ELEMENT_ID)

    // Cleanup on unmount
    return () => {
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  const handleStartScanning = () => {
    start(SCANNER_ELEMENT_ID)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Camera className="h-12 w-12 text-spotify-green mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Scan Spotify QR Code</h2>
          <p className="text-muted-foreground">
            Point your camera at a Spotify QR code to start playing
          </p>
        </div>

        <div className="relative rounded-lg overflow-hidden bg-black/50 aspect-square mb-6">
          {/* QR Scanner Container */}
          <div id={SCANNER_ELEMENT_ID} className="w-full h-full" />

          {/* Scanning Overlay */}
          {isScanning && isCameraReady && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 border-2 border-spotify-green rounded-lg" />
              <div className="absolute top-1/2 left-0 right-0 flex items-center justify-center -translate-y-1/2">
                <ScanLine className="h-8 w-8 text-spotify-green animate-pulse" />
              </div>
            </div>
          )}

          {/* Loading State */}
          {!isCameraReady && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Initializing camera...</p>
              </div>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="text-center mb-4">
            <p className="text-destructive text-sm mb-4">{error}</p>
            {!isScanning && (
              <Button onClick={handleStartScanning} variant="spotify" size="lg">
                <Camera className="h-5 w-5 mr-2" />
                Try Again
              </Button>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
          <p className="font-medium">Tips for scanning:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Hold your device steady</li>
            <li>Ensure good lighting</li>
            <li>Keep the QR code within the frame</li>
            <li>Allow camera permissions when prompted</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
