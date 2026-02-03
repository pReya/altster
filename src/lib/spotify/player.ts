import { SpotifyTrack, PlaybackType } from './types'
import { getTrack } from './api'

// Global audio element for preview playback (reused to preserve user activation)
let audioElement: HTMLAudioElement | null = null
let audioUnlocked = false

function ensureAudioElement(): HTMLAudioElement {
  if (!audioElement) {
    audioElement = new Audio()
    audioElement.preload = 'auto'
  }
  return audioElement
}

// Spotify Web Playback SDK types
declare global {
  interface Window {
    Spotify: any
    onSpotifyWebPlaybackSDKReady: () => void
  }
}

let spotifyPlayer: any = null
let deviceId: string | null = null

/**
 * Initialize the Spotify Web Playback SDK (for authenticated users)
 */
export async function initializeSpotifyPlayer(accessToken: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if SDK is already loaded
    if (window.Spotify) {
      createPlayer(accessToken, resolve, reject)
      return
    }

    // Load SDK script
    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true

    document.body.appendChild(script)

    window.onSpotifyWebPlaybackSDKReady = () => {
      createPlayer(accessToken, resolve, reject)
    }

    // Timeout after 10 seconds
    setTimeout(() => {
      reject(new Error('Spotify Player SDK failed to load'))
    }, 10000)
  })
}

function createPlayer(
  accessToken: string,
  resolve: (deviceId: string) => void,
  reject: (error: Error) => void
) {
  spotifyPlayer = new window.Spotify.Player({
    name: 'Altster QR Scanner',
    getOAuthToken: (cb: (token: string) => void) => {
      cb(accessToken)
    },
    volume: 0.8,
  })

  // Error handling
  spotifyPlayer.addListener('initialization_error', ({ message }: any) => {
    reject(new Error(`Initialization error: ${message}`))
  })

  spotifyPlayer.addListener('authentication_error', ({ message }: any) => {
    reject(new Error(`Authentication error: ${message}`))
  })

  spotifyPlayer.addListener('account_error', ({ message }: any) => {
    reject(new Error(`Account error: ${message}. Spotify Premium required.`))
  })

  spotifyPlayer.addListener('playback_error', ({ message }: any) => {
    console.error('Playback error:', message)
  })

  // Ready
  spotifyPlayer.addListener('ready', ({ device_id }: any) => {
    console.log('Spotify Player ready with device ID:', device_id)
    deviceId = device_id
    resolve(device_id)
  })

  // Not Ready
  spotifyPlayer.addListener('not_ready', ({ device_id }: any) => {
    console.log('Device ID has gone offline:', device_id)
  })

  // Connect to the player
  spotifyPlayer.connect()
}

/**
 * Play a track using the Web Playback SDK
 */
export async function playWithSDK(
  trackUri: string,
  accessToken: string
): Promise<void> {
  if (!deviceId) {
    throw new Error('Spotify player not initialized')
  }

  const response = await fetch(
    `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uris: [trackUri],
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to play track with SDK')
  }
}

/**
 * Play track preview using HTML5 Audio
 */
export async function playPreview(previewUrl: string, volume: number = 0.8): Promise<void> {
  // Stop any existing playback
  stopPreview()

  // Reuse the shared audio element to preserve user activation
  const element = ensureAudioElement()
  element.src = previewUrl
  element.currentTime = 0
  element.volume = volume / 100

  try {
    await element.play()
  } catch (error) {
    console.error('Failed to play preview:', error)
    throw new Error('Failed to play audio preview')
  }
}

/**
 * Prepare track preview without playing (for autoplay policy compliance)
 */
export function preparePreview(previewUrl: string, volume: number = 0.8): void {
  // Stop any existing playback
  stopPreview()

  // Reuse the shared audio element but don't play
  const element = ensureAudioElement()
  element.src = previewUrl
  element.currentTime = 0
  element.volume = volume / 100
  element.load()
}

/**
 * Unlock audio playback by playing silent audio during a user gesture.
 * Call this when user clicks "Start Scanning" to enable later autoplay.
 */
export async function unlockAudio(): Promise<void> {
  if (audioUnlocked) return

  try {
    // Use the shared audio element so the user activation persists
    const element = ensureAudioElement()
    element.src =
      'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'
    element.volume = 0
    await element.play()
    element.pause()
    element.currentTime = 0
    audioUnlocked = true
  } catch {
    // Ignore errors - audio may still work
  }
}

/**
 * Stop preview playback
 */
export function stopPreview(): void {
  if (audioElement) {
    audioElement.pause()
    audioElement.currentTime = 0
  }
}

/**
 * Pause preview playback
 */
export function pausePreview(): void {
  if (audioElement) {
    audioElement.pause()
  }
}

/**
 * Resume preview playback
 */
export function resumePreview(): void {
  if (audioElement) {
    audioElement.play().catch((error) => {
      console.error('Failed to resume preview:', error)
    })
  }
}

/**
 * Set preview volume
 */
export function setPreviewVolume(volume: number): void {
  if (audioElement) {
    audioElement.volume = volume / 100
  }
}

/**
 * Get current preview progress
 */
export function getPreviewProgress(): { current: number; duration: number } {
  if (audioElement) {
    return {
      current: audioElement.currentTime * 1000,
      duration: audioElement.duration * 1000,
    }
  }
  return { current: 0, duration: 0 }
}

/**
 * Check if preview is currently playing
 */
export function isPreviewPlaying(): boolean {
  return audioElement !== null && !audioElement.paused
}

/**
 * Subscribe to preview progress updates
 */
export function onPreviewProgress(callback: (progress: number, duration: number) => void): () => void {
  if (!audioElement) return () => {}

  const handler = () => {
    if (audioElement) {
      callback(audioElement.currentTime * 1000, audioElement.duration * 1000)
    }
  }

  audioElement.addEventListener('timeupdate', handler)

  return () => {
    if (audioElement) {
      audioElement.removeEventListener('timeupdate', handler)
    }
  }
}

/**
 * Hybrid playback strategy
 * Tries full playback with SDK if authenticated and Premium,
 * falls back to preview playback
 */
export async function playTrack(
  trackId: string,
  accessToken: string | null,
  volume: number = 80
): Promise<{
  type: PlaybackType
  track: SpotifyTrack
}> {
  // First, fetch track details
  let track: SpotifyTrack

  if (accessToken) {
    try {
      track = await getTrack(trackId, accessToken)
    } catch (error) {
      // If authenticated fetch fails, we can't proceed
      throw new Error('Failed to fetch track details')
    }

    // Try Web Playback SDK for Premium users
    try {
      if (!deviceId) {
        await initializeSpotifyPlayer(accessToken)
      }
      const trackUri = `spotify:track:${trackId}`
      await playWithSDK(trackUri, accessToken)

      return {
        type: 'full',
        track,
      }
    } catch (error) {
      console.log('SDK playback failed, falling back to preview:', error)
      // Fall through to preview playback
    }
  }

  // For non-authenticated users or if SDK fails, we need track data
  // In a real implementation, you'd use client credentials flow
  // For now, we'll require authentication to get track data
  if (!accessToken) {
    throw new Error(
      'Please log in with Spotify to play tracks. Preview playback requires authentication to fetch track data.'
    )
  }

  // Fetch track if we don't have it yet
  if (!track!) {
    track = await getTrack(trackId, accessToken)
  }

  // Try preview playback
  if (track.preview_url) {
    await playPreview(track.preview_url, volume)
    return {
      type: 'preview',
      track,
    }
  }

  // No preview available
  throw new Error('This track has no preview available. Please log in for full playback.')
}

/**
 * Load a track without auto-playing (for autoplay policy compliance)
 * Prepares everything so resume() can start playback on user gesture
 */
export async function loadTrack(
  trackId: string,
  accessToken: string | null,
  volume: number = 80
): Promise<{
  type: PlaybackType
  track: SpotifyTrack
}> {
  if (!accessToken) {
    throw new Error(
      'Please log in with Spotify to play tracks.'
    )
  }

  // Fetch track details
  const track = await getTrack(trackId, accessToken)

  // For preview playback, prepare the audio element without playing
  if (track.preview_url) {
    preparePreview(track.preview_url, volume)
    return {
      type: 'preview',
      track,
    }
  }

  // No preview available
  throw new Error('This track has no preview available. Please log in for full playback.')
}

/**
 * Pause playback (works for both preview and SDK)
 */
export async function pause(): Promise<void> {
  if (spotifyPlayer) {
    await spotifyPlayer.pause()
  } else {
    pausePreview()
  }
}

/**
 * Resume playback (works for both preview and SDK)
 */
export async function resume(): Promise<void> {
  if (spotifyPlayer) {
    await spotifyPlayer.resume()
  } else {
    resumePreview()
  }
}

/**
 * Stop all playback
 */
export function stopPlayback(): void {
  stopPreview()
  if (spotifyPlayer) {
    spotifyPlayer.pause()
  }
}

/**
 * Disconnect the Spotify Player
 */
export function disconnectPlayer(): void {
  if (spotifyPlayer) {
    spotifyPlayer.disconnect()
    spotifyPlayer = null
    deviceId = null
  }
  stopPreview()
}
