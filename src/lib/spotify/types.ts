// Spotify API Type Definitions

export interface SpotifyUser {
  id: string
  display_name: string
  email: string
  images: Array<{ url: string }>
  product: string // 'premium' | 'free' | 'open'
}

export interface SpotifyTrack {
  id: string
  name: string
  artists: Array<{
    id: string
    name: string
  }>
  album: {
    id: string
    name: string
    images: Array<{
      url: string
      height: number
      width: number
    }>
  }
  duration_ms: number
  preview_url: string | null
  uri: string
  external_urls: {
    spotify: string
  }
}

export interface SpotifyTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
}

export interface PlaybackState {
  is_playing: boolean
  progress_ms: number
  duration_ms: number
  track: SpotifyTrack | null
  device_id: string | null
}

export type PlaybackType = 'preview' | 'full' | null

export interface PlayerError {
  message: string
  type: 'permission' | 'network' | 'playback' | 'not_found' | 'unknown'
}
