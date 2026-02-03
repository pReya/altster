import { useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'
import { useScanStore } from '@/store/scanStore'
import { parseSpotifyUrl } from '@/lib/qr/parser'

const SCANNER_FPS = 10

// Calculate square qrbox based on viewfinder dimensions
const getQrBoxSize = (viewfinderWidth: number, viewfinderHeight: number) => {
  const minDimension = Math.min(viewfinderWidth, viewfinderHeight)
  const boxSize = Math.floor(minDimension * 0.7)
  return { width: boxSize, height: boxSize }
}

export function useQRScanner(onScanSuccess?: (trackId: string) => void) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const lastScanTimeRef = useRef<number>(0)
  const isStartingRef = useRef(false)
  const isStoppingRef = useRef(false)
  const SCAN_COOLDOWN = 2000 // Prevent duplicate scans within 2 seconds

  const {
    isScanning,
    startScanning,
    stopScanning,
    setScannedCode,
    setError,
    clearError,
    setCameraReady,
  } = useScanStore()

  // Handle successful QR code scan
  const handleScanSuccess = useCallback(
    (decodedText: string) => {
      const now = Date.now()

      // Debounce scans to prevent duplicates
      if (now - lastScanTimeRef.current < SCAN_COOLDOWN) {
        return
      }

      lastScanTimeRef.current = now

      // Parse the QR code data
      const parseResult = parseSpotifyUrl(decodedText)

      if (parseResult.isValid && parseResult.trackId) {
        setScannedCode(decodedText, parseResult.trackId)
        clearError()

        // Call the callback with the track ID
        if (onScanSuccess) {
          onScanSuccess(parseResult.trackId)
        }
      } else {
        setError(parseResult.error || 'Invalid QR code')
      }
    },
    [setScannedCode, setError, clearError, onScanSuccess]
  )

  // Handle scan errors (usually just "no QR code found")
  const handleScanError = useCallback((error: string) => {
    // Ignore "NotFoundException" which just means no QR code in frame
    if (error.includes('NotFoundException')) {
      return
    }
    console.error('QR scan error:', error)
  }, [])

  // Start the QR scanner
  const start = useCallback(
    async (elementId: string) => {
      // Prevent concurrent start calls
      if (isStartingRef.current || isStoppingRef.current) {
        console.log('Scanner is already starting or stopping')
        return
      }

      try {
        isStartingRef.current = true
        clearError()

        // Create scanner instance if it doesn't exist
        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode(elementId)
        }

        // Check if already scanning
        const currentState = scannerRef.current.getState()
        if (
          currentState === Html5QrcodeScannerState.SCANNING ||
          currentState === Html5QrcodeScannerState.PAUSED
        ) {
          console.log('Scanner already running')
          isStartingRef.current = false
          return
        }

        // Request camera permission and start scanning
        await scannerRef.current.start(
          { facingMode: 'environment' }, // Use back camera on mobile
          {
            fps: SCANNER_FPS,
            qrbox: getQrBoxSize,
          },
          handleScanSuccess,
          handleScanError
        )

        startScanning()
        setCameraReady(true)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to start camera'

        if (errorMessage.includes('Permission denied')) {
          setError('Camera permission denied. Please allow camera access to scan QR codes.')
        } else if (errorMessage.includes('NotFoundError')) {
          setError('No camera found on this device.')
        } else if (errorMessage.includes('NotAllowedError')) {
          setError('Camera access was blocked. Please check your browser settings.')
        } else {
          setError(errorMessage)
        }

        console.error('Failed to start scanner:', error)
      } finally {
        isStartingRef.current = false
      }
    },
    [startScanning, setError, clearError, setCameraReady, handleScanSuccess, handleScanError]
  )

  // Stop the QR scanner
  const stop = useCallback(async () => {
    // Prevent concurrent stop calls
    if (isStoppingRef.current || isStartingRef.current) {
      console.log('Scanner is already stopping or starting')
      return
    }

    try {
      isStoppingRef.current = true

      if (scannerRef.current) {
        const currentState = scannerRef.current.getState()

        // Only try to stop if scanner is actually running
        if (
          currentState === Html5QrcodeScannerState.SCANNING ||
          currentState === Html5QrcodeScannerState.PAUSED
        ) {
          await scannerRef.current.stop()
        }
      }

      stopScanning()
      setCameraReady(false)
    } catch (error) {
      // Silently handle errors - scanner might already be stopped
      console.log('Stop scanner:', error instanceof Error ? error.message : error)
    } finally {
      isStoppingRef.current = false
    }
  }, [stopScanning, setCameraReady])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Use a flag to prevent double cleanup
      if (scannerRef.current && !isStoppingRef.current) {
        const currentState = scannerRef.current.getState()

        // Only stop if it's actually running
        if (
          currentState === Html5QrcodeScannerState.SCANNING ||
          currentState === Html5QrcodeScannerState.PAUSED
        ) {
          scannerRef.current
            .stop()
            .then(() => {
              stopScanning()
              setCameraReady(false)
            })
            .catch((err) => {
              // Silently handle - component is unmounting anyway
              console.log('Cleanup stop:', err instanceof Error ? err.message : err)
            })
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on unmount

  return {
    isScanning,
    start,
    stop,
  }
}
