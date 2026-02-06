// Spotify OAuth 2.0 PKCE (Proof Key for Code Exchange) Implementation

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI
const SCOPES = ['streaming', 'user-read-email', 'user-read-private', 'user-modify-playback-state', 'user-read-playback-state']

// Generate a random string for code verifier
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(values)
    .map((x) => possible[x % possible.length])
    .join('')
}

// Generate SHA-256 hash and base64url encode
async function sha256(plain: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return base64urlencode(hash)
}

// Base64URL encode
function base64urlencode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const binary = Array.from(bytes)
    .map((byte) => String.fromCharCode(byte))
    .join('')
  const base64 = btoa(binary)
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// Generate code challenge from verifier
export async function generateCodeChallenge(verifier: string): Promise<string> {
  return await sha256(verifier)
}

// Start the OAuth flow
export async function redirectToSpotifyAuth(): Promise<void> {
  const codeVerifier = generateRandomString(128)
  const codeChallenge = await generateCodeChallenge(codeVerifier)

  // Store code verifier in session storage
  sessionStorage.setItem('spotify_code_verifier', codeVerifier)

  // Generate random state for CSRF protection
  const state = generateRandomString(16)
  sessionStorage.setItem('spotify_auth_state', state)

  // Build authorization URL
  const authUrl = new URL('https://accounts.spotify.com/authorize')
  authUrl.searchParams.append('client_id', CLIENT_ID)
  authUrl.searchParams.append('response_type', 'code')
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI)
  authUrl.searchParams.append('code_challenge_method', 'S256')
  authUrl.searchParams.append('code_challenge', codeChallenge)
  authUrl.searchParams.append('state', state)
  authUrl.searchParams.append('scope', SCOPES.join(' '))

  // Redirect to Spotify authorization
  window.location.href = authUrl.toString()
}

// Exchange authorization code for access token
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const codeVerifier = sessionStorage.getItem('spotify_code_verifier')

  if (!codeVerifier) {
    throw new Error('Code verifier not found. Please restart the login process.')
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error_description || 'Failed to exchange code for token')
  }

  const data = await response.json()

  // Clean up session storage
  sessionStorage.removeItem('spotify_code_verifier')
  sessionStorage.removeItem('spotify_auth_state')

  return data
}

// Refresh access token
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
}> {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error_description || 'Failed to refresh token')
  }

  return await response.json()
}

// Validate state parameter (CSRF protection)
export function validateState(returnedState: string): boolean {
  const storedState = sessionStorage.getItem('spotify_auth_state')
  return storedState === returnedState
}

// Get user profile
export async function getUserProfile(accessToken: string): Promise<{
  id: string
  display_name: string
  email: string
  images: Array<{ url: string }>
  product: string
}> {
  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch user profile')
  }

  return await response.json()
}
