import { create } from 'zustand'
import { SpotifyTrack, PlaybackType } from '@/lib/spotify/types'

interface PlayerState {
  // State
  currentTrack: SpotifyTrack | null
  isPlaying: boolean
  playbackType: PlaybackType
  progress: number // Current playback position in ms
  volume: number // 0-100
  error: string | null
  isLoading: boolean

  // Actions
  setCurrentTrack: (track: SpotifyTrack) => void
  setIsPlaying: (playing: boolean) => void
  setPlaybackType: (type: PlaybackType) => void
  setProgress: (progress: number) => void
  setVolume: (volume: number) => void
  setError: (error: string | null) => void
  setIsLoading: (loading: boolean) => void
  clearError: () => void
  reset: () => void
}

export const usePlayerStore = create<PlayerState>((set) => ({
  // Initial state
  currentTrack: null,
  isPlaying: false,
  playbackType: null,
  progress: 0,
  volume: 80,
  error: null,
  isLoading: false,

  // Actions
  setCurrentTrack: (track: SpotifyTrack) => {
    set({
      currentTrack: track,
      progress: 0,
      error: null,
    })
  },

  setIsPlaying: (playing: boolean) => {
    set({ isPlaying: playing })
  },

  setPlaybackType: (type: PlaybackType) => {
    set({ playbackType: type })
  },

  setProgress: (progress: number) => {
    set({ progress })
  },

  setVolume: (volume: number) => {
    // Clamp volume between 0 and 100
    const clampedVolume = Math.max(0, Math.min(100, volume))
    set({ volume: clampedVolume })
  },

  setError: (error: string | null) => {
    set({ error, isLoading: false })
  },

  setIsLoading: (loading: boolean) => {
    set({ isLoading: loading })
  },

  clearError: () => {
    set({ error: null })
  },

  reset: () => {
    set({
      currentTrack: null,
      isPlaying: false,
      playbackType: null,
      progress: 0,
      error: null,
      isLoading: false,
    })
  },
}))
