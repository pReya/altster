import { create } from 'zustand'
import { SpotifyUser } from '@/lib/spotify/types'
import {
  redirectToSpotifyAuth,
  exchangeCodeForToken,
  refreshAccessToken,
  getUserProfile,
  validateState,
} from '@/lib/spotify/auth'

interface AuthState {
  // State
  accessToken: string | null
  refreshToken: string | null
  expiresAt: number | null
  user: SpotifyUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: () => Promise<void>
  logout: () => void
  handleCallback: (code: string, state: string) => Promise<void>
  refreshAccessToken: () => Promise<void>
  initialize: () => void
  clearError: () => void
}

const TOKEN_STORAGE_KEY = 'spotify_tokens'

// Load tokens from localStorage
function loadTokensFromStorage() {
  const stored = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return null
    }
  }
  return null
}

// Save tokens to localStorage
function saveTokensToStorage(tokens: {
  accessToken: string
  refreshToken: string
  expiresAt: number
}) {
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens))
}

// Clear tokens from localStorage
function clearTokensFromStorage() {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async () => {
    try {
      set({ isLoading: true, error: null })
      await redirectToSpotifyAuth()
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to initiate login',
        isLoading: false,
      })
    }
  },

  logout: () => {
    clearTokensFromStorage()
    set({
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      user: null,
      isAuthenticated: false,
      error: null,
    })
  },

  handleCallback: async (code: string, state: string) => {
    try {
      set({ isLoading: true, error: null })

      // Validate state for CSRF protection
      if (!validateState(state)) {
        throw new Error('Invalid state parameter. Possible CSRF attack.')
      }

      // Exchange code for tokens
      const tokenResponse = await exchangeCodeForToken(code)
      const expiresAt = Date.now() + tokenResponse.expires_in * 1000

      // Save tokens
      saveTokensToStorage({
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt,
      })

      // Fetch user profile
      const user = await getUserProfile(tokenResponse.access_token)

      set({
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt,
        user,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to complete login',
        isLoading: false,
      })
      clearTokensFromStorage()
    }
  },

  refreshAccessToken: async () => {
    const { refreshToken: currentRefreshToken } = get()

    if (!currentRefreshToken) {
      set({ error: 'No refresh token available', isLoading: false })
      return
    }

    try {
      const tokenResponse = await refreshAccessToken(currentRefreshToken)
      const expiresAt = Date.now() + tokenResponse.expires_in * 1000

      saveTokensToStorage({
        accessToken: tokenResponse.access_token,
        refreshToken: currentRefreshToken, // Reuse existing refresh token
        expiresAt,
      })

      // Fetch user profile after refresh
      const user = await getUserProfile(tokenResponse.access_token)

      set({
        accessToken: tokenResponse.access_token,
        expiresAt,
        user,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to refresh token',
        isLoading: false,
      })
      // If refresh fails, log out
      get().logout()
    }
  },

  initialize: () => {
    const stored = loadTokensFromStorage()

    if (stored) {
      const { accessToken, refreshToken, expiresAt } = stored

      // Check if token is expired
      if (Date.now() >= expiresAt) {
        // Token expired, try to refresh
        set({
          refreshToken,
          isLoading: true,
        })
        get().refreshAccessToken()
      } else {
        // Token still valid, fetch user profile
        set({
          accessToken,
          refreshToken,
          expiresAt,
          isLoading: true,
        })

        getUserProfile(accessToken)
          .then((user) => {
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
            })
          })
          .catch(() => {
            // If profile fetch fails, clear everything
            get().logout()
          })
      }
    }
  },

  clearError: () => set({ error: null }),
}))

// Auto-refresh token before it expires
setInterval(() => {
  const { expiresAt, refreshToken, isAuthenticated } = useAuthStore.getState()

  if (isAuthenticated && expiresAt && refreshToken) {
    // Refresh if token expires in less than 5 minutes
    const timeUntilExpiry = expiresAt - Date.now()
    if (timeUntilExpiry < 5 * 60 * 1000) {
      useAuthStore.getState().refreshAccessToken()
    }
  }
}, 60 * 1000) // Check every minute
