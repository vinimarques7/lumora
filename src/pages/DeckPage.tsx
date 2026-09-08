import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Play,
  Users,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  ArrowLeft,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { decksApi, cardsApi, type Card } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card as UICard, CardContent, CardHeader } from '@/components/ui/card'
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

const DIFFICULTY_LABEL = { easy: '🟢 Fácil', medium: '🟡 Médio', hard: '🔴 Difícil' }

// ─── Image drop / URL field ───────────────────────────────────────────────────
function ImageDropField({
  value,
  onChange,
}: {
  value: string
  onChange: (url: string) => void
}) {
  const [dragging, setDragging] = useState(false)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      if (ev.target?.result) onChange(ev.target.result as string)
    }
    reader.readAsDataURL(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      if (ev.target?.result) onChange(ev.target.result as string)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-2">
      <Label>Imagem <span className="text-muted-foreground text-xs">(opcional)</span></Label>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        className={`relative rounded-lg border-2 border-dashed transition-colors ${
          dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/40'
        } p-4 text-center`}
      >
        {value ? (
          <div className="space-y-2">
            <img src={value} alt="Preview" className="mx-auto max-h-32 rounded-md object-contain" />
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-xs text-destructive hover:underline"
            >
              Remover imagem
            </button>
          </div>
        ) : (
          <div className="space-y-2 text-sm text-muted-foreground">
            <ImageIcon className="mx-auto h-8 w-8 opacity-40" />
            <p>Arraste uma imagem aqui</p>
            <label className="cursor-pointer text-primary hover:underline">
              ou clique para escolher arquivo
              <input type="file" accept="image/*" className="sr-only" onChange={handleFileInput} />
            </label>
          </div>
        )}
      </div>

      <Input
        placeholder="Ou cole uma URL de imagem (https://...)"
        value={value.startsWith('data:') ? '' : value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

interface CardFormData {
  question: string
  answer: string
  explanation: string
  analogy: string
  imageUrl: string
  difficulty: 'easy' | 'medium' | 'hard'
}

function CardFormDialog({
  open,
  onOpenChange,
  deckId,
  card,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  deckId: string
  card?: Card
  onSaved: () => void
}) {
  const { token } = useAuth()
  const [form, setForm] = useState<CardFormData>({
    question: card?.question ?? '',
    answer: card?.answer ?? '',
    explanation: card?.explanation ?? '',
    analogy: card?.analogy ?? '',
    imageUrl: card?.imageUrl ?? '',
    difficulty: card?.difficulty ?? 'medium',
  })

  const mutation = useMutation({
    mutationFn: () =>
      card
        ? cardsApi.update(token!, card.id, {
            ...form,
            explanation: form.explanation || undefined,
            analogy: form.analogy || undefined,
            imageUrl: form.imageUrl || null,
          })
        : cardsApi.create(token!, {
            deckId,
            ...form,
            explanation: form.explanation || undefined,
            analogy: form.analogy || undefined,
            imageUrl: form.imageUrl || null,
          }),
    onSuccess: () => {
      toast.success(card ? 'Card atualizado!' : 'Card criado!')
      onOpenChange(false)
      onSaved()
    },
    onError: () => toast.error('Erro ao salvar card.'),
  })

  function set(key: keyof CardFormData, val: string) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{card ? 'Editar card' : 'Novo card'}</DialogTitle>
          <DialogDescription>
            Preencha pergunta e resposta. Explicação e analogia são opcionais.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="card-question">Pergunta *</Label>
            <Textarea
              id="card-question"
              placeholder="O que é...?"
              required
              value={form.question}
              onChange={(e) => set('question', e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="card-answer">Resposta *</Label>
            <Textarea
              id="card-answer"
              placeholder="A resposta correta..."
              required
              value={form.answer}
              onChange={(e) => set('answer', e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          <div className="space-y-2">
            <Label>Explicação <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Textarea
              placeholder="Explique em mais detalhes..."
              value={form.explanation}
              onChange={(e) => set('explanation', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Analogia <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Input
              placeholder="Uma analogia do mundo real..."
              value={form.analogy}
              onChange={(e) => set('analogy', e.target.value)}
            />
          </div>
          <ImageDropField value={form.imageUrl} onChange={(url) => set('imageUrl', url)} />
          <div className="space-y-2">
            <Label>Dificuldade</Label>
            <Select
              value={form.difficulty}
              onValueChange={(v) => set('difficulty', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">🟢 Fácil</SelectItem>
                <SelectItem value="medium">🟡 Médio</SelectItem>
                <SelectItem value="hard">🔴 Difícil</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Salvar card'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FlashCard({
  card,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  card: Card
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <UICard className="group">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium leading-snug flex-1">{card.question}</p>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-xs">
            {DIFFICULTY_LABEL[card.difficulty]}
          </Badge>
          {card.imageUrl && <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <button
          className="w-full text-left"
          onClick={onToggle}
        >
          <div className="flex items-center gap-2 text-sm text-primary hover:text-primary/80">
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" /> Ocultar resposta
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" /> Ver resposta
              </>
            )}
          </div>
        </button>

        {expanded && (
          <div className="mt-3 space-y-3 animate-fade-in">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm font-medium text-foreground">{card.answer}</p>
            </div>
            {card.explanation && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Explicação
                </p>
                <p className="text-sm text-muted-foreground">{card.explanation}</p>
              </div>
            )}
            {card.analogy && (
              <div className="p-2.5 rounded-lg bg-muted border-l-2 border-primary/40">
                <p className="text-xs font-medium text-primary mb-0.5">Analogia</p>
                <p className="text-sm text-muted-foreground italic">{card.analogy}</p>
              </div>
            )}
            {card.imageUrl && (
              <img
                src={card.imageUrl}
                alt="Card image"
                className="rounded-lg max-h-48 object-contain"
              />
            )}
          </div>
        )}
      </CardContent>
    </UICard>
  )
}

export default function DeckPage() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editCard, setEditCard] = useState<Card | undefined>()
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['deck', id],
    queryFn: () => decksApi.get(token!, id!),
    enabled: !!token && !!id,
  })

  // Must be called unconditionally (Rules of Hooks) — before any early returns
  const rawCards = data?.cards ?? []
  const { ordered: cards, dragHandlers, resetOrder } = useLocalOrder(
    rawCards,
    `sc_card_order_${id}`,
  )

  const deleteMutation = useMutation({
    mutationFn: (cardId: string) => cardsApi.delete(token!, cardId),
    onSuccess: () => {
      toast.success('Card excluído.')
      qc.invalidateQueries({ queryKey: ['deck', id] })
    },
    onError: () => toast.error('Erro ao excluir card.'),
  })

  function handleDelete(cardId: string) {
    if (confirm('Excluir este card?')) deleteMutation.mutate(cardId)
  }

  function handleEdit(card: Card) {
    setEditCard(card)
    setFormOpen(true)
  }

  function handleFormClose(v: boolean) {
    setFormOpen(v)
    if (!v) setEditCard(undefined)
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const deck = data?.deck

  if (!deck) return <div className="container py-8">Deck não encontrado.</div>

  return (
    <div className="container py-8 page-enter">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{deck.name}</h1>
            {deck.description && (
              <p className="text-muted-foreground mt-1">{deck.description}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {pluralize(rawCards.length, 'card', 'cards')}
              {rawCards.length > 1 && ' — arraste para reordenar'}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {cards.length >= 2 && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/decks/${id}/play/hold`}>
                    <Users className="h-4 w-4" />
                    Segura e Responde
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to={`/decks/${id}/play/quiz`}>
                    <Play className="h-4 w-4" />
                    Quiz Solo
                  </Link>
                </Button>
              </>
            )}
            <Button
              size="sm"
              onClick={() => {
                setEditCard(undefined)
                setFormOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              Novo card
            </Button>
            {rawCards.length > 1 && (
              <Button size="sm" variant="ghost" onClick={resetOrder} title="Resetar ordem">
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Cards grid — click outside any card collapses the open one */}
      {cards.length === 0 ? (
        <div className="text-center py-24 space-y-4">
          <h2 className="text-xl font-semibold">Nenhum card ainda</h2>
          <p className="text-muted-foreground">Adicione o primeiro card a este deck.</p>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Adicionar card
          </Button>
        </div>
      ) : (
        <div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
          onClick={() => setExpandedCardId(null)}
        >
          {cards.map((card) => {
            const dp = dragHandlers(card.id)
            return (
              <div
                key={card.id}
                {...dp}
                onClick={(e) => e.stopPropagation()}
                className={`transition-transform ${dp['data-drag-over'] ? 'scale-[1.02] ring-2 ring-primary rounded-xl' : ''}`}
              >
                <FlashCard
                  card={card}
                  expanded={expandedCardId === card.id}
                  onToggle={() => setExpandedCardId((prev) => (prev === card.id ? null : card.id))}
                  onEdit={() => handleEdit(card)}
                  onDelete={() => handleDelete(card.id)}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Card form dialog */}
      <CardFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        deckId={id!}
        card={editCard}
        onSaved={() => qc.invalidateQueries({ queryKey: ['deck', id] })}
      />
    </div>
  )
}
