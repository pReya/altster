import { SpotifyTrack, PlaybackType } from './types'
import { getTrack } from './api'

// Global audio element for preview playback (reused to preserve user activation)
let audioElement: HTMLAudioElement | null = null
let audioUnlocked = false
let keepAliveActive = false
const SILENT_AUDIO_SRC =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'

class AutoplayBlockedError extends Error {
  constructor() {
    super('Autoplay was blocked')
    this.name = 'AutoplayBlockedError'
  }
}

function isAutoplayBlockedError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'NotAllowedError'
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return message.includes('notallowed') || message.includes('not allowed') || message.includes('autoplay')
  }
  return false
}

function ensureAudioElement(): HTMLAudioElement {
  if (!audioElement) {
    audioElement = new Audio()
    audioElement.preload = 'auto'
  }
  return audioElement
}

export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isIOS = /iPad|iPhone|iPod/.test(ua)
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return isIOS || isIPadOS
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
  // Only stop if keep-alive is NOT active.
  // When keep-alive is active, we transition directly to preserve user activation
  // so the browser still considers the audio element as user-gesture-activated.
  if (!keepAliveActive) {
    stopPreview()
  }

  // Reuse the shared audio element to preserve user activation
  const element = ensureAudioElement()
  element.loop = false
  element.muted = false
  element.src = previewUrl
  element.currentTime = 0
  element.volume = volume / 100

  try {
    element.load()
    await element.play()
    const started = await waitForPlaybackStart(element)
    if (!started) {
      throw new AutoplayBlockedError()
    }
    keepAliveActive = false
  } catch (error) {
    if (isAutoplayBlockedError(error)) {
      throw new AutoplayBlockedError()
    }
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
    element.src = SILENT_AUDIO_SRC
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
 * iOS Safari requires a user gesture for each playback.
 * We keep a silent loop running to preserve the activation.
 */
export async function startAutoplayKeepAlive(): Promise<void> {
  if (keepAliveActive) return

  try {
    const element = ensureAudioElement()
    element.src = SILENT_AUDIO_SRC
    element.loop = true
    element.muted = true
    element.volume = 0
    await element.play()
    keepAliveActive = true
    audioUnlocked = true
  } catch {
    // Ignore errors - fallback to tap to play
  }
}

/**
 * Activate the Spotify SDK audio element during a user gesture.
 * Must be called before SDK playback can produce audio.
 */
export function activateSDKElement(): void {
  if (spotifyPlayer && typeof spotifyPlayer.activateElement === 'function') {
    spotifyPlayer.activateElement()
  }
}

export function stopAutoplayKeepAlive(): void {
  if (!keepAliveActive) return
  keepAliveActive = false
  if (audioElement) {
    audioElement.loop = false
    audioElement.muted = false
    audioElement.pause()
    audioElement.currentTime = 0
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
 * Play a track on the user's active Spotify device via the Connect API.
 * This works without the Web Playback SDK — it plays on whatever device
 * the user has Spotify open on (phone app, desktop app, etc.).
 */
async function playWithConnectAPI(
  trackUri: string,
  accessToken: string
): Promise<void> {
  const response = await fetch(
    'https://api.spotify.com/v1/me/player/play',
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
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || 'No active Spotify device found')
  }
}

/**
 * Hybrid playback strategy — tries multiple approaches in order:
 * 1. Web Playback SDK (in-browser, non-iOS, requires Premium)
 * 2. Preview playback (HTML5 audio, 30s clip, works everywhere)
 * 3. Spotify Connect API (plays on user's active Spotify app/device)
 */
export async function playTrack(
  trackId: string,
  accessToken: string | null,
  volume: number = 80
): Promise<{
  type: PlaybackType
  track: SpotifyTrack
  autoplayBlocked?: boolean
}> {
  if (!accessToken) {
    throw new Error(
      'Please log in with Spotify to play tracks.'
    )
  }

  // Fetch track details
  let track: SpotifyTrack
  try {
    track = await getTrack(trackId, accessToken)
  } catch (error) {
    throw new Error('Failed to fetch track details')
  }

  const trackUri = `spotify:track:${trackId}`

  // Strategy 1: Web Playback SDK (non-iOS only, requires Premium)
  if (!isIOSDevice()) {
    try {
      if (!deviceId) {
        await initializeSpotifyPlayer(accessToken)
      }
      await playWithSDK(trackUri, accessToken)
      return { type: 'full', track }
    } catch (error) {
      console.log('SDK playback failed, trying fallbacks:', error)
    }
  }

  // Strategy 2: Preview playback (30s clip via HTML5 audio)
  if (track.preview_url) {
    try {
      await playPreview(track.preview_url, volume)
      return { type: 'preview', track }
    } catch (error) {
      if (error instanceof AutoplayBlockedError) {
        return { type: 'preview', track, autoplayBlocked: true }
      }
      console.log('Preview playback failed, trying Connect API:', error)
    }
  }

  // Strategy 3: Spotify Connect API (plays on user's active Spotify app/device)
  try {
    await playWithConnectAPI(trackUri, accessToken)
    return { type: 'full', track }
  } catch (error) {
    console.log('Connect API failed:', error)
  }

  throw new Error(
    'Could not play track. Please open Spotify on a device and try again.'
  )
}

async function waitForPlaybackStart(element: HTMLAudioElement): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false
    const finish = (started: boolean) => {
      if (done) return
      done = true
      cleanup()
      resolve(started)
    }

    const onPlaying = () => finish(true)
    const onTimeUpdate = () => finish(true)
    const onPause = () => {
      if (element.paused) finish(false)
    }

    const cleanup = () => {
      element.removeEventListener('playing', onPlaying)
      element.removeEventListener('timeupdate', onTimeUpdate)
      element.removeEventListener('pause', onPause)
    }

    element.addEventListener('playing', onPlaying)
    element.addEventListener('timeupdate', onTimeUpdate)
    element.addEventListener('pause', onPause)

    setTimeout(() => {
      finish(!element.paused)
    }, 300)
  })
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
