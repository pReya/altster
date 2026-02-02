import { SpotifyTrack } from './types'

const BASE_URL = 'https://api.spotify.com/v1'

/**
 * Get track details without authentication (public data only)
 * Note: This requires a valid Spotify access token even for public data
 * For truly unauthenticated access, we'll use a different approach in the player
 */
export async function getTrack(trackId: string, accessToken: string): Promise<SpotifyTrack> {
  const response = await fetch(`${BASE_URL}/tracks/${trackId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Track not found')
    }
    if (response.status === 401) {
      throw new Error('Authentication required')
    }
    throw new Error(`Failed to fetch track: ${response.statusText}`)
  }

  const data = await response.json()
  return data as SpotifyTrack
}

/**
 * Get track details for unauthenticated users using the Spotify Web API
 * This method uses oEmbed which doesn't require authentication
 */
export async function getTrackPublic(trackId: string): Promise<{
  title: string
  author_name: string
  thumbnail_url: string
}> {
  const trackUrl = `https://open.spotify.com/track/${trackId}`
  const response = await fetch(
    `https://open.spotify.com/oembed?url=${encodeURIComponent(trackUrl)}`
  )

  if (!response.ok) {
    throw new Error('Failed to fetch track information')
  }

  return await response.json()
}

/**
 * Search for a track by URL (alternative method for unauthenticated users)
 * This returns basic track info including preview URL
 */
export async function getTrackEmbed(trackId: string): Promise<SpotifyTrack> {
  // Use the embed iframe URL to get track data
  // This is a workaround for getting track data without authentication
  const embedUrl = `https://open.spotify.com/embed/track/${trackId}`

  try {
    const response = await fetch(embedUrl)
    if (!response.ok) {
      throw new Error('Track not found')
    }

    // Extract track data from the embed page
    // This is a simplified approach - in reality, we'd parse the HTML
    // For now, we'll construct a basic track object
    // In production, you'd want to use the official Spotify API with a client credentials token

    throw new Error('Embed parsing not implemented. Please log in to play tracks.')
  } catch (error) {
    throw error
  }
}

/**
 * Play a track on the user's active Spotify device
 */
export async function playTrack(
  trackUri: string,
  accessToken: string,
  deviceId?: string
): Promise<void> {
  const url = deviceId
    ? `${BASE_URL}/me/player/play?device_id=${deviceId}`
    : `${BASE_URL}/me/player/play`

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uris: [trackUri],
    }),
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('No active device found. Please open Spotify on your device.')
    }
    if (response.status === 403) {
      throw new Error('Playback requires Spotify Premium')
    }
    throw new Error(`Failed to play track: ${response.statusText}`)
  }
}

/**
 * Pause playback on the user's active device
 */
export async function pausePlayback(accessToken: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/me/player/pause`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok && response.status !== 204) {
    throw new Error(`Failed to pause playback: ${response.statusText}`)
  }
}

/**
 * Resume playback on the user's active device
 */
export async function resumePlayback(accessToken: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/me/player/play`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok && response.status !== 204) {
    throw new Error(`Failed to resume playback: ${response.statusText}`)
  }
}

/**
 * Get the user's current playback state
 */
export async function getPlaybackState(accessToken: string): Promise<any> {
  const response = await fetch(`${BASE_URL}/me/player`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (response.status === 204) {
    return null // No active playback
  }

  if (!response.ok) {
    throw new Error(`Failed to get playback state: ${response.statusText}`)
  }

  return await response.json()
}
