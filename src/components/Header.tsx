import { Music as MusicIcon } from 'lucide-react'
import { LoginButton } from './LoginButton'

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MusicIcon className="h-6 w-6 text-spotify-green" />
          <h1 className="text-xl font-bold">Altster</h1>
        </div>
        <LoginButton />
      </div>
    </header>
  )
}
