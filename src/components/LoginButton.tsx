import { LogIn, LogOut, User } from 'lucide-react'
import { Button } from './ui/button'
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth'

export function LoginButton() {
  const { isAuthenticated, user, login, logout, isLoading } = useSpotifyAuth()

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {user.images && user.images[0] ? (
            <img
              src={user.images[0].url}
              alt={user.display_name}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <User className="h-4 w-4" />
            </div>
          )}
          <div className="hidden sm:block">
            <p className="text-sm font-medium">{user.display_name}</p>
            {user.product && (
              <p className="text-xs text-muted-foreground capitalize">
                {user.product}
              </p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="spotify"
      size="lg"
      onClick={login}
      disabled={isLoading}
      className="font-semibold"
    >
      <LogIn className="h-5 w-5 mr-2" />
      {isLoading ? 'Connecting...' : 'Login with Spotify'}
    </Button>
  )
}
