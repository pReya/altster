// Parse Spotify URLs from QR codes and extract track IDs

export interface ParseResult {
  isValid: boolean
  trackId: string | null
  error: string | null
}

// Supported Spotify URL patterns
const SPOTIFY_PATTERNS = [
  // https://open.spotify.com/track/{id}
  /open\.spotify\.com\/track\/([a-zA-Z0-9]+)/,
  // spotify:track:{id}
  /spotify:track:([a-zA-Z0-9]+)/,
  // https://spotify.link/{shortcode} (Spotify short links)
  /spotify\.link\/([a-zA-Z0-9]+)/,
]

/**
 * Parse a scanned QR code and extract Spotify track ID
 * @param qrCodeData The raw data from the QR code
 * @returns ParseResult with validation status and track ID if found
 */
export function parseSpotifyUrl(qrCodeData: string): ParseResult {
  if (!qrCodeData || typeof qrCodeData !== 'string') {
    return {
      isValid: false,
      trackId: null,
      error: 'Invalid QR code data',
    }
  }

  // Try each pattern
  for (const pattern of SPOTIFY_PATTERNS) {
    const match = qrCodeData.match(pattern)
    if (match && match[1]) {
      return {
        isValid: true,
        trackId: match[1],
        error: null,
      }
    }
  }

  // If we get here, it's not a Spotify URL
  return {
    isValid: false,
    trackId: null,
    error: 'QR code does not contain a Spotify track link',
  }
}

/**
 * Validate if a track ID looks valid (22 alphanumeric characters)
 * @param trackId The track ID to validate
 * @returns boolean indicating if the ID format is valid
 */
export function isValidTrackId(trackId: string): boolean {
  return /^[a-zA-Z0-9]{22}$/.test(trackId)
}

/**
 * Build a Spotify Web URL from a track ID
 * @param trackId The Spotify track ID
 * @returns Full Spotify web URL
 */
export function buildSpotifyUrl(trackId: string): string {
  return `https://open.spotify.com/track/${trackId}`
}

/**
 * Build a Spotify URI from a track ID
 * @param trackId The Spotify track ID
 * @returns Spotify URI format
 */
export function buildSpotifyUri(trackId: string): string {
  return `spotify:track:${trackId}`
}
