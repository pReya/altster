import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'

export function useSpotifyAuth() {
  const {
    accessToken,
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    handleCallback,
    initialize,
    clearError,
  } = useAuthStore()

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    initialize()
  }, [initialize])

  // Check if user has Spotify Premium
  const isPremium = user?.product === 'premium'

  return {
    accessToken,
    user,
    isAuthenticated,
    isLoading,
    error,
    isPremium,
    login,
    logout,
    handleCallback,
    clearError,
  }
}
