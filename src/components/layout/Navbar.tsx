import { Link, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, User, Shield, Menu, X, Compass } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Brand } from './Brand'

export function Navbar({ brandTitle }: { brandTitle: string }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  async function handleLogout() {
    setLogoutConfirmOpen(false)
    setMobileOpen(false)
    await logout()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <Brand title={brandTitle} subtitle="natureza, aprendizado e mente" titleClassName="text-base" />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/explore">
              <Compass className="h-4 w-4" />
              Explorar
            </Link>
          </Button>
          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
              </Button>

              {user.role === 'admin' && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin">
                    <Shield className="h-4 w-4" />
                    Admin
                  </Link>
                </Button>
              )}

              <Separator orientation="vertical" className="mx-2 h-6" />

              <Button variant="ghost" size="sm" asChild>
                <Link to="/profile">
                  <User className="h-4 w-4" />
                  {user.displayName ?? user.email.split('@')[0]}
                </Link>
              </Button>

              <Button variant="ghost" size="sm" onClick={() => setLogoutConfirmOpen(true)}>
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Entrar</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/register">Criar conta</Link>
              </Button>
            </>
          )}
        </nav>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-accent"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Nav */}
      <div
        className={cn(
          'md:hidden overflow-hidden transition-all duration-300',
          mobileOpen ? 'max-h-96 border-b' : 'max-h-0',
        )}
      >
        <nav className="container flex flex-col gap-1 py-4">
          <Button variant="ghost" className="justify-start" asChild>
            <Link to="/explore" onClick={() => setMobileOpen(false)}>
              <Compass className="h-4 w-4" />
              Explorar
            </Link>
          </Button>
          {user ? (
            <>
              <Button variant="ghost" className="justify-start" asChild>
                <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              {user.role === 'admin' && (
                <Button variant="ghost" className="justify-start" asChild>
                  <Link to="/admin" onClick={() => setMobileOpen(false)}>
                    <Shield className="h-4 w-4" />
                    Admin
                  </Link>
                </Button>
              )}
              <Button variant="ghost" className="justify-start" asChild>
                <Link to="/profile" onClick={() => setMobileOpen(false)}>
                  <User className="h-4 w-4" />
                  Perfil
                </Link>
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => setLogoutConfirmOpen(true)}>
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" className="justify-start" asChild>
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  Entrar
                </Link>
              </Button>
              <Button className="justify-start" asChild>
                <Link to="/register" onClick={() => setMobileOpen(false)}>
                  Criar conta
                </Link>
              </Button>
            </>
          )}
        </nav>
      </div>

      <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sair da conta?</DialogTitle>
            <DialogDescription>
              Você precisará entrar novamente para acessar seus decks.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutConfirmOpen(false)}>
              Não
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Sim, sair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  )
}
