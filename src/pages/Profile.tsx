import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Palette, KeyRound, UserCircle, Image as ImageIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usersApi, type SiteSettings } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  applyProfileDesignOverride,
  applySiteAppearance,
  getProfileDesignPrefs,
  saveProfileDesignPrefs,
  type ProfileDesignPrefs,
} from '@/lib/theme'

const PRESET_COLORS = [
  '#6366f1', '#3b82f6', '#14b8a6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6',
]

const BG_PRESETS = [
  {
    name: 'Cachoeira',
    url: 'https://images.unsplash.com/photo-1437482078695-73f5ca6c96e2?auto=format&fit=crop&w=1920&q=80',
  },
  {
    name: 'Floresta Neblina',
    url: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1920&q=80',
  },
  {
    name: 'Plantas Tropicais',
    url: 'https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=1920&q=80',
  },
  {
    name: 'Bosque Verde',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1920&q=80',
  },
] as const

export default function Profile() {
  const { user, token, updateUser } = useAuth()
  const qc = useQueryClient()
  const [themeColor, setThemeColor] = useState(user?.themeColor ?? '#6366f1')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [designPrefs, setDesignPrefs] = useState<ProfileDesignPrefs>({
    mode: 'default',
    imageUrl: '',
    overlay: '0.45',
  })

  useEffect(() => {
    if (user) setDesignPrefs(getProfileDesignPrefs(user.id))
  }, [user?.id])

  const updateThemeMutation = useMutation({
    mutationFn: () => usersApi.updateMe(token!, { themeColor }),
    onSuccess: ({ user: updated }) => {
      updateUser(updated)
      toast.success('Tema atualizado!')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updatePasswordMutation = useMutation({
    mutationFn: () => usersApi.updateMe(token!, { currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      toast.success('Senha alterada com sucesso!')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!user) return null

  function persistDesign(next: ProfileDesignPrefs) {
    setDesignPrefs(next)
    saveProfileDesignPrefs(user!.id, next)
    if (next.mode === 'image') {
      applyProfileDesignOverride(user!.id)
    } else {
      // Restore global admin appearance so profile override doesn't linger
      const cached = qc.getQueryData<{ settings: SiteSettings }>(['site-settings'])
      applySiteAppearance(cached?.settings ?? {})
    }
    toast.success('Design atualizado para este perfil/dispositivo.')
  }

  return (
    <div className="container py-8 max-w-3xl page-enter space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Perfil</h1>
        <p className="text-muted-foreground mt-1">Gerencie sua conta e personalização</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserCircle className="h-5 w-5 text-primary" />
            Informações da conta
          </CardTitle>
          <CardDescription>Dados básicos do seu perfil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-muted-foreground">E-mail</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Tipo de conta</p>
            <p className="font-medium capitalize">{user.role === 'admin' ? 'Administrador' : 'Usuário'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ImageIcon className="h-5 w-5 text-primary" />
            Design com imagem (opcional)
          </CardTitle>
          <CardDescription>
            Personalização visual do seu perfil neste dispositivo. O padrão continua sendo o layout atual.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              id="use-image-design"
              type="checkbox"
              checked={designPrefs.mode === 'image'}
              onChange={(e) =>
                persistDesign({
                  ...designPrefs,
                  mode: e.target.checked ? 'image' : 'default',
                })
              }
            />
            <Label htmlFor="use-image-design">Ativar fundo com imagem e efeito de vidro</Label>
          </div>

          {designPrefs.mode === 'image' && (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                {BG_PRESETS.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => persistDesign({ ...designPrefs, imageUrl: preset.url })}
                    className="rounded-lg overflow-hidden border text-left"
                  >
                    <div
                      className="h-24 bg-cover bg-center"
                      style={{ backgroundImage: `url(${preset.url})` }}
                    />
                    <div className="px-3 py-2 text-sm font-medium">{preset.name}</div>
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-bg-url">URL da imagem</Label>
                <Input
                  id="profile-bg-url"
                  value={designPrefs.imageUrl}
                  placeholder="https://..."
                  onChange={(e) => setDesignPrefs((p) => ({ ...p, imageUrl: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-bg-overlay">Overlay (0 a 0.85)</Label>
                <Input
                  id="profile-bg-overlay"
                  type="number"
                  min={0}
                  max={0.85}
                  step={0.05}
                  value={designPrefs.overlay}
                  onChange={(e) => setDesignPrefs((p) => ({ ...p, overlay: e.target.value }))}
                />
              </div>

              <Button
                type="button"
                onClick={() => {
                  if (!/^https?:\/\//i.test(designPrefs.imageUrl)) {
                    toast.error('Informe uma URL de imagem válida (http/https).')
                    return
                  }
                  const n = Number(designPrefs.overlay)
                  if (Number.isNaN(n) || n < 0 || n > 0.85) {
                    toast.error('Overlay deve estar entre 0 e 0.85.')
                    return
                  }
                  persistDesign(designPrefs)
                }}
              >
                Salvar design com imagem
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5 text-primary" />
            Cor tema
          </CardTitle>
          <CardDescription>
            Essa cor afeta os elementos principais da interface para sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-8 gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                className={`h-9 rounded-md border-2 transition-all ${
                  themeColor === color ? 'border-foreground scale-105' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setThemeColor(color)}
              />
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="theme-color">Ou escolha manualmente</Label>
            <div className="flex gap-2">
              <Input
                id="theme-color"
                type="color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="w-14 h-10 p-1"
              />
              <Input
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                placeholder="#6366f1"
              />
            </div>
          </div>

          <Button
            onClick={() => updateThemeMutation.mutate()}
            disabled={updateThemeMutation.isPending || !/^#[0-9a-fA-F]{6}$/.test(themeColor)}
          >
            {updateThemeMutation.isPending ? 'Salvando...' : 'Salvar tema'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="h-5 w-5 text-primary" />
            Alterar senha
          </CardTitle>
          <CardDescription>Atualize sua senha de acesso</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="current-password">Senha atual</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova senha</Label>
            <Input
              id="new-password"
              type="password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres</p>
          </div>

          <Button
            onClick={() => updatePasswordMutation.mutate()}
            disabled={updatePasswordMutation.isPending || !currentPassword || newPassword.length < 8}
          >
            {updatePasswordMutation.isPending ? 'Atualizando...' : 'Atualizar senha'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
