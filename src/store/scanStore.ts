import { create } from 'zustand'

interface ScanState {
  // State
  isScanning: boolean
  lastScannedCode: string | null
  lastTrackId: string | null
  error: string | null
  isCameraReady: boolean

  // Actions
  startScanning: () => void
  stopScanning: () => void
  setScannedCode: (code: string, trackId: string) => void
  setError: (error: string | null) => void
  clearError: () => void
  setCameraReady: (ready: boolean) => void
  reset: () => void
}

export const useScanStore = create<ScanState>((set) => ({
  // Initial state
  isScanning: false,
  lastScannedCode: null,
  lastTrackId: null,
  error: null,
  isCameraReady: false,

  // Actions
  startScanning: () => {
    set({
      isScanning: true,
      error: null,
    })
  },

  stopScanning: () => {
    set({
      isScanning: false,
      isCameraReady: false,
    })
  },

  setScannedCode: (code: string, trackId: string) => {
    set({
      lastScannedCode: code,
      lastTrackId: trackId,
      error: null,
    })
  },

  setError: (error: string | null) => {
    set({ error })
  },

  clearError: () => {
    set({ error: null })
  },

  setCameraReady: (ready: boolean) => {
    set({ isCameraReady: ready })
  },

  reset: () => {
    set({
      isScanning: false,
      lastScannedCode: null,
      lastTrackId: null,
      error: null,
      isCameraReady: false,
    })
  },
}))
