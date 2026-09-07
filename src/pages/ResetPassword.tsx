import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { authApi, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Brand } from '@/components/layout/Brand'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) {
      toast.error('Link de redefinição inválido.')
      return
    }

    setLoading(true)
    try {
      await authApi.resetPassword(token, newPassword)
      toast.success('Senha redefinida com sucesso! Faça login com a nova senha.')
      navigate('/login')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao redefinir senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 page-enter">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <Brand center className="justify-center" />
          <h1 className="text-2xl font-bold">Nova senha</h1>
        </div>

        <Card>
          {!token ? (
            <CardContent className="py-6 text-center space-y-2">
              <CardTitle className="text-lg">Link inválido</CardTitle>
              <CardDescription>
                Este link de redefinição é inválido ou já expirou.{' '}
                <Link to="/forgot-password" className="text-primary hover:underline font-medium">
                  Solicitar novo link
                </Link>
              </CardDescription>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Escolha uma nova senha</CardTitle>
                <CardDescription>Mínimo de 8 caracteres.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova senha</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPw ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPw((v) => !v)}
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Salvando...' : 'Redefinir senha'}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
