import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, BookOpen, Play, Edit2, Trash2, Globe, Lock, MoreVertical, Tag, Users, RotateCcw, Bookmark, BookmarkX, Search, X, Layers } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { decksApi, savedDecksApi, type DeckWithCount } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { pluralize } from '@/lib/utils'
import { useLocalOrder } from '@/lib/useLocalOrder'
import { DECK_CATEGORIES, DIFFICULTY_LABEL } from '@/lib/categories'

const DECK_PINS = [
  { emoji: '🟢', label: 'Tranquilo' },
  { emoji: '🟡', label: 'Revisão' },
  { emoji: '🔴', label: 'Urgente' },
  { emoji: '⭐', label: 'Favorito' },
  { emoji: '🧠', label: 'Difícil' },
  { emoji: '🔥', label: 'Foco' },
  { emoji: '📌', label: 'Fixado' },
  { emoji: '✅', label: 'Concluído' },
  { emoji: '😤', label: 'Preciso estudar' },
  { emoji: '😌', label: 'Dominei' },
] as const

// ─── GameLaunchDialog ─────────────────────────────────────────────────────────

function GameLaunchDialog({
  open,
  onOpenChange,
  primaryDeckId,
  allDecks,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  primaryDeckId: string
  allDecks: DeckWithCount[]
}) {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Set<string>>(new Set([primaryDeckId]))
  const [count, setCount] = useState(10)
  const estimatedMins = Math.ceil((count * 20) / 60)

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        if (next.size === 1) return prev // keep at least one
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function launch(type: 'quiz' | 'hold') {
    const ids = [...selected]
    let route =
      ids.length === 1
        ? `/decks/${ids[0]}/play/${type}`
        : `/play/${type}?decks=${ids.join(',')}`
    const sep = route.includes('?') ? '&' : '?'
    route += `${sep}count=${count}`
    navigate(route)
    onOpenChange(false)
  }

  const eligibleDecks = allDecks.filter((d) => d.cardCount >= 2)

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) setSelected(new Set([primaryDeckId]))
        onOpenChange(v)
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Escolher modo de jogo
          </DialogTitle>
          <DialogDescription>
            Selecione os decks e o modo que deseja jogar.
          </DialogDescription>
        </DialogHeader>

        {/* Deck selector */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Decks ({selected.size} selecionado{selected.size !== 1 ? 's' : ''})</p>
          <div className="max-h-44 overflow-y-auto space-y-1 rounded-lg border p-2">
            {eligibleDecks.map((d) => (
              <label
                key={d.id}
                className={`flex items-center gap-3 rounded-md px-2 py-1.5 cursor-pointer transition-colors ${
                  selected.has(d.id) ? 'bg-primary/10' : 'hover:bg-muted'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(d.id)}
                  onChange={() => toggle(d.id)}
                  className="accent-primary"
                />
                <span className="text-sm flex-1 truncate">
                  {d.pinEmoji && <span className="mr-1">{d.pinEmoji}</span>}
                  {d.name}
                  {d.creatorName && (
                    <span className="ml-1.5 text-[10px] text-muted-foreground rounded-full bg-muted px-1.5 py-0.5">
                      salvo
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">{d.cardCount} cards</span>
              </label>
            ))}
            {eligibleDecks.length === 0 && (
              <p className="text-sm text-muted-foreground p-2">Nenhum deck com ≥ 2 cards.</p>
            )}
          </div>
        </div>

        {/* Question count */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <Label>Quantidade de perguntas: <span className="font-bold text-primary">{count}</span></Label>
            <span className="text-muted-foreground text-xs">⏱ ~{estimatedMins} min (quiz)</span>
          </div>
          <input
            type="range"
            min={5}
            max={50}
            step={5}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>5</span><span>50</span>
          </div>
        </div>

        {/* Game mode buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => launch('quiz')}
            disabled={selected.size === 0}
            className="flex flex-col items-center gap-2 rounded-xl border-2 border-transparent bg-muted p-4 hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-40"
          >
            <Play className="h-7 w-7 text-primary" />
            <div className="text-center">
              <p className="text-sm font-semibold">Quiz Solo</p>
              <p className="text-xs text-muted-foreground">Múltipla escolha com timer</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => launch('hold')}
            disabled={selected.size === 0}
            className="flex flex-col items-center gap-2 rounded-xl border-2 border-transparent bg-muted p-4 hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-40"
          >
            <Users className="h-7 w-7 text-primary" />
            <div className="text-center">
              <p className="text-sm font-semibold">Segura e Responde</p>
              <p className="text-xs text-muted-foreground">Em dupla, sem timer</p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── CreateDeckDialog ─────────────────────────────────────────────────────────

function CreateDeckDialog({ onCreated }: { onCreated: () => void }) {
  const { token } = useAuth()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [category, setCategory] = useState('')
  const [extraCategories, setExtraCategories] = useState<string[]>([])
  const [deckDifficulty, setDeckDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [extraOpen, setExtraOpen] = useState(false)
  const [extraSearch, setExtraSearch] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      decksApi.create(token!, {
        name,
        description,
        isPublic,
        category: category || null,
        extraCategories: extraCategories.length ? extraCategories : undefined,
        deckDifficulty,
      }),
    onSuccess: () => {
      toast.success('Deck criado!')
      setOpen(false)
      setName('')
      setDescription('')
      setCategory('')
      setExtraCategories([])
      setDeckDifficulty('medium')
      onCreated()
    },
    onError: () => toast.error('Erro ao criar deck.'),
  })

  function toggleExtra(cat: string) {
    setExtraCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    )
  }

  const availableExtra = DECK_CATEGORIES.filter(
    (c) => c !== category && c.toLowerCase().includes(extraSearch.toLowerCase()),
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Novo Deck
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar novo deck</DialogTitle>
          <DialogDescription>Organize seus cards por tema ou assunto.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="deck-name">Nome *</Label>
            <Input
              id="deck-name"
              placeholder="Ex: SOLID, Design Patterns..."
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deck-desc">Descrição</Label>
            <Textarea
              id="deck-desc"
              placeholder="Breve descrição do deck..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Categoria principal</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {DECK_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dificuldade</Label>
              <Select value={deckDifficulty} onValueChange={(v) => setDeckDifficulty(v as 'easy' | 'medium' | 'hard')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">{DIFFICULTY_LABEL.easy}</SelectItem>
                  <SelectItem value="medium">{DIFFICULTY_LABEL.medium}</SelectItem>
                  <SelectItem value="hard">{DIFFICULTY_LABEL.hard}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Extra categories */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setExtraOpen((v) => !v)}
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              {extraOpen ? '▾' : '▸'} Categorias adicionais
              {extraCategories.length > 0 && (
                <span className="rounded-full bg-primary/10 text-primary text-xs px-1.5">{extraCategories.length}</span>
              )}
            </button>
            {extraOpen && (
              <div className="rounded-lg border p-3 space-y-2">
                <Input
                  placeholder="Buscar categoria..."
                  value={extraSearch}
                  onChange={(e) => setExtraSearch(e.target.value)}
                  className="h-8 text-sm"
                />
                <div className="max-h-36 overflow-y-auto space-y-0.5">
                  {availableExtra.map((cat) => (
                    <label
                      key={cat}
                      className={`flex items-center gap-2 rounded px-2 py-1 cursor-pointer text-sm transition-colors ${
                        extraCategories.includes(cat) ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={extraCategories.includes(cat)}
                        onChange={() => toggleExtra(cat)}
                        className="accent-primary"
                      />
                      {cat}
                    </label>
                  ))}
                </div>
                {extraCategories.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1 border-t">
                    {extraCategories.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleExtra(c)}
                        className="flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5 hover:bg-primary/20"
                      >
                        {c} ×
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="deck-public"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="deck-public" className="cursor-pointer">
              Deck público (visível no hub de exploração)
            </Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending || !name.trim()}>
              {mutation.isPending ? 'Criando...' : 'Criar deck'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeckCard({
  deck,
  onDelete,
  onLaunch,
  dragProps,
}: {
  deck: DeckWithCount
  onDelete: (id: string) => void
  onLaunch: (id: string) => void
  dragProps: ReturnType<ReturnType<typeof useLocalOrder>['dragHandlers']>
}) {
  const { token } = useAuth()
  const qc = useQueryClient()
  const [menuOpen, setMenuOpen] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)
  const [customEmoji, setCustomEmoji] = useState('')
  const [customLabel, setCustomLabel] = useState('')

  const pinMutation = useMutation({
    mutationFn: (args: { pinEmoji: string | null; pinLabel: string | null }) =>
      decksApi.update(token!, deck.id, args),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['decks'] })
      setPinOpen(false)
    },
    onError: () => toast.error('Erro ao salvar pin.'),
  })

  function applyPreset(emoji: string, label: string) {
    pinMutation.mutate({ pinEmoji: emoji, pinLabel: label })
  }

  function applyCustom() {
    const emoji = customEmoji.trim()
    const label = customLabel.trim()
    if (!emoji) return toast.error('Informe um emoji.')
    pinMutation.mutate({ pinEmoji: emoji, pinLabel: label || emoji })
    setCustomEmoji('')
    setCustomLabel('')
  }

  function clearPin() {
    pinMutation.mutate({ pinEmoji: null, pinLabel: null })
  }

  return (
    <Card
      className={`group hover:shadow-md transition-all relative cursor-grab active:cursor-grabbing select-none ${
        dragProps['data-drag-over'] ? 'ring-2 ring-primary scale-[1.02]' : ''
      }`}
      {...dragProps}
    >
      {/* Prominent pin badge */}
      {deck.pinEmoji && (
        <div
          className="absolute -top-2.5 -right-2.5 z-10 flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs font-medium shadow-sm"
          title={deck.pinLabel ?? ''}
        >
          <span className="text-base leading-none">{deck.pinEmoji}</span>
          {deck.pinLabel && <span className="text-muted-foreground">{deck.pinLabel}</span>}
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <CardTitle className="text-base truncate">{deck.name}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {/* Pin button */}
            <div className="relative">
              <button
                title="Definir pin"
                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity"
                onClick={(e) => { e.stopPropagation(); setPinOpen((v) => !v) }}
              >
                <Tag className="h-4 w-4 text-muted-foreground" />
              </button>
              {pinOpen && (
                <div className="absolute right-0 top-7 z-20 w-64 rounded-xl border bg-popover shadow-xl p-3 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Escolher pin</p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {DECK_PINS.map((p) => (
                      <button
                        key={p.emoji}
                        title={p.label}
                        onClick={() => applyPreset(p.emoji, p.label)}
                        className={`text-xl rounded-lg p-1.5 hover:bg-muted transition-colors ${deck.pinEmoji === p.emoji ? 'bg-primary/15 ring-1 ring-primary' : ''}`}
                      >
                        {p.emoji}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex gap-1">
                      <Input
                        placeholder="Emoji"
                        value={customEmoji}
                        onChange={(e) => setCustomEmoji(e.target.value)}
                        className="w-16 text-center px-1"
                        maxLength={4}
                      />
                      <Input
                        placeholder="Nome do pin"
                        value={customLabel}
                        onChange={(e) => setCustomLabel(e.target.value)}
                        className="flex-1"
                        maxLength={30}
                      />
                    </div>
                    <Button size="sm" className="w-full" variant="secondary" onClick={applyCustom}>
                      Aplicar personalizado
                    </Button>
                  </div>
                  {deck.pinEmoji && (
                    <Button size="sm" variant="ghost" className="w-full text-destructive" onClick={clearPin}>
                      Remover pin
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Options menu */}
            <div className="relative">
              <button
                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity"
                onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
              >
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-6 z-10 w-40 rounded-md border bg-popover shadow-lg py-1">
                  <Link
                    to={`/decks/${deck.id}`}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Editar
                  </Link>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-destructive"
                    onClick={() => { setMenuOpen(false); onDelete(deck.id) }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {deck.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{deck.description}</p>
        )}
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary">{pluralize(deck.cardCount, 'card', 'cards')}</Badge>
          {deck.category && (
            <Badge variant="outline" className="text-xs gap-1">{deck.category}</Badge>
          )}
          {deck.isPublic ? (
            <Badge variant="outline" className="gap-1"><Globe className="h-3 w-3" /> Público</Badge>
          ) : (
            <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> Privado</Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0 gap-2">
        <Button size="sm" variant="outline" asChild className="flex-1">
          <Link to={`/decks/${deck.id}`}>Ver cards</Link>
        </Button>
        {deck.cardCount >= 2 ? (
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onLaunch(deck.id)}
          >
            <Play className="h-3.5 w-3.5" />
            Jogar
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-muted-foreground cursor-default"
            disabled
            title="Adicione pelo menos 2 cards para jogar"
          >
            <Play className="h-3.5 w-3.5 opacity-40" />
            Jogar
            <span className="ml-1 text-[10px] rounded-full bg-muted-foreground/15 px-1.5 py-0.5 leading-none">
              +2 cards
            </span>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export default function Dashboard() {
  const { token } = useAuth()
  const qc = useQueryClient()
  const [launchDeckId, setLaunchDeckId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [groupByCategory, setGroupByCategory] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['decks'],
    queryFn: () => decksApi.list(token!),
    enabled: !!token,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => decksApi.delete(token!, id),
    onSuccess: () => {
      toast.success('Deck excluído.')
      qc.invalidateQueries({ queryKey: ['decks'] })
    },
    onError: () => toast.error('Erro ao excluir deck.'),
  })

  function confirmDelete(id: string) {
    if (confirm('Excluir este deck? Todos os cards serão removidos.')) {
      deleteMutation.mutate(id)
    }
  }

  const rawDecks = data?.decks ?? []
  const { ordered: decks, dragHandlers, resetOrder } = useLocalOrder(rawDecks, 'sc_deck_order')

  const usedCategories = [...new Set(rawDecks.map((d) => d.category).filter(Boolean))] as string[]
  const hasActiveFilter = search.trim() !== '' || categoryFilter !== ''

  const filteredDecks = decks.filter((deck) => {
    const matchesSearch =
      search.trim() === '' ||
      deck.name.toLowerCase().includes(search.toLowerCase()) ||
      deck.description?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === '' || deck.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const groupedDecks = groupByCategory
    ? Object.entries(
        filteredDecks.reduce<Record<string, DeckWithCount[]>>((acc, deck) => {
          const key = deck.category ?? 'Sem categoria'
          acc[key] = acc[key] ?? []
          acc[key].push(deck)
          return acc
        }, {}),
      ).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
    : null

  const { data: savedData } = useQuery({
    queryKey: ['saved-decks'],
    queryFn: () => savedDecksApi.list(token!),
    enabled: !!token,
  })

  const unsaveMutation = useMutation({
    mutationFn: (id: string) => savedDecksApi.unsave(token!, id),
    onSuccess: () => {
      toast.success('Deck removido dos salvos.')
      qc.invalidateQueries({ queryKey: ['saved-decks'] })
    },
  })

  const savedDecks = savedData?.decks ?? []

  return (
    <div className="container py-8 page-enter">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Meus Decks</h1>
          <p className="text-muted-foreground mt-1">
            {rawDecks.length > 0
              ? hasActiveFilter
                ? `${pluralize(filteredDecks.length, 'deck', 'decks')} encontrado(s) de ${rawDecks.length}`
                : `${pluralize(rawDecks.length, 'deck', 'decks')} — arraste para reordenar`
              : 'Nenhum deck ainda'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {rawDecks.length > 1 && !hasActiveFilter && (
            <Button variant="ghost" size="sm" onClick={resetOrder} title="Resetar ordem">
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <CreateDeckDialog onCreated={() => qc.invalidateQueries({ queryKey: ['decks'] })} />
        </div>
      </div>

      {rawDecks.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar deck..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Select value={categoryFilter || 'all'} onValueChange={(v) => setCategoryFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="all">Todas as categorias</SelectItem>
              {usedCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={groupByCategory ? 'default' : 'outline'}
            size="sm"
            className="h-9"
            onClick={() => setGroupByCategory((v) => !v)}
            title="Agrupar por tema"
          >
            <Layers className="h-4 w-4" />
            Agrupar por tema
          </Button>
          {hasActiveFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() => {
                setSearch('')
                setCategoryFilter('')
              }}
            >
              <X className="h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="h-5 bg-muted rounded w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : rawDecks.length === 0 ? (
        <div className="text-center py-24 space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Nenhum deck ainda</h2>
          <p className="text-muted-foreground">Crie seu primeiro deck para começar a estudar.</p>
        </div>
      ) : filteredDecks.length === 0 ? (
        <div className="text-center py-24 space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Nenhum deck encontrado</h2>
          <p className="text-muted-foreground">Tente outro termo de busca ou categoria.</p>
        </div>
      ) : groupedDecks ? (
        <div className="space-y-8">
          {groupedDecks.map(([category, categoryDecks]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold">{category}</h2>
                <span className="text-sm text-muted-foreground">({categoryDecks.length})</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryDecks.map((deck) => (
                  <DeckCard
                    key={deck.id}
                    deck={deck}
                    onDelete={confirmDelete}
                    onLaunch={setLaunchDeckId}
                    dragProps={dragHandlers(deck.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDecks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              onDelete={confirmDelete}
              onLaunch={setLaunchDeckId}
              dragProps={dragHandlers(deck.id)}
            />
          ))}
        </div>
      )}

      {launchDeckId && (
        <GameLaunchDialog
          open={!!launchDeckId}
          onOpenChange={(v) => { if (!v) setLaunchDeckId(null) }}
          primaryDeckId={launchDeckId}
          allDecks={[
            ...rawDecks,
            // add saved decks, deduplicating by id
            ...savedDecks.filter((s) => !rawDecks.some((d) => d.id === s.id)),
          ]}
        />
      )}

      {/* ─── Saved Decks ─────────────────────────────────────────────── */}
      {savedDecks.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center gap-2 mb-5">
            <Bookmark className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Decks salvos</h2>
            <span className="text-sm text-muted-foreground">({savedDecks.length})</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedDecks.map((deck) => {
              const creator = deck.creatorName ?? deck.creatorEmail?.split('@')[0] ?? 'Desconhecido'
              return (
                <Card key={deck.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <BookOpen className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <CardTitle className="text-base truncate">{deck.name}</CardTitle>
                      </div>
                      <button
                        title="Remover dos salvos"
                        onClick={() => unsaveMutation.mutate(deck.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <BookmarkX className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">por {creator}</p>
                    {deck.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{deck.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary">{pluralize(deck.cardCount, 'card', 'cards')}</Badge>
                      {deck.category && <Badge variant="outline" className="text-xs">{deck.category}</Badge>}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 gap-2">
                    <Button size="sm" variant="outline" asChild className="flex-1">
                      <Link to={`/decks/${deck.id}`}>Ver cards</Link>
                    </Button>
                    {deck.cardCount >= 2 ? (
                      <Button size="sm" className="flex-1" onClick={() => setLaunchDeckId(deck.id)}>
                        <Play className="h-3.5 w-3.5" /> Jogar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-muted-foreground cursor-default"
                        disabled
                        title="Adicione pelo menos 2 cards para jogar"
                      >
                        <Play className="h-3.5 w-3.5 opacity-40" />
                        Jogar
                        <span className="ml-1 text-[10px] rounded-full bg-muted-foreground/15 px-1.5 py-0.5 leading-none">
                          +2 cards
                        </span>
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
