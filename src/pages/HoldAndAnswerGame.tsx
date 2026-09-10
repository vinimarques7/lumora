import { useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, RotateCcw, CheckCircle2, XCircle, Trophy, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { decksApi, type Card } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card as UICard, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

interface RoundResult {
  cardId: string
  hit: boolean
}

export default function HoldAndAnswerGame() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const { token } = useAuth()

  // Multi-deck: ?decks=id1,id2,id3
  const multiIds = searchParams.get('decks')?.split(',').filter(Boolean) ?? []
  const selectedIds = searchParams.get('selected')?.split(',').filter(Boolean) ?? []
  const isMulti = multiIds.length > 0
  const primaryId = isMulti ? multiIds[0] : (id ?? '')
  const countParam = parseInt(searchParams.get('count') ?? '0', 10)

  const singleQuery = useQuery({
    queryKey: ['deck', primaryId],
    queryFn: () => decksApi.get(token!, primaryId),
    enabled: !!token && !!primaryId && !isMulti,
  })

  const multiQuery = useQuery({
    queryKey: ['deck-multi', multiIds.join(',')],
    queryFn: () => decksApi.getMulti(token!, multiIds),
    enabled: !!token && isMulti,
  })

  const isLoading = isMulti ? multiQuery.isLoading : singleQuery.isLoading
  const isError = isMulti ? multiQuery.isError : singleQuery.isError

  const deck = isMulti ? multiQuery.data?.[0]?.deck : singleQuery.data?.deck
  const allCards: Card[] = isMulti
    ? (multiQuery.data ?? []).flatMap((r) => r.cards)
    : (singleQuery.data?.cards ?? [])
  const filteredCards = selectedIds.length ? allCards.filter((card) => selectedIds.includes(card.id)) : allCards
  const cards = countParam > 0 ? filteredCards.slice(0, countParam) : filteredCards

  const deckName = isMulti
    ? (multiQuery.data ?? []).map((r) => r.deck.name).join(' + ')
    : (deck?.name ?? '')

  const saveMutation = useMutation({
    mutationFn: (payload: { score: number; totalCards: number; correctCards: number }) =>
      decksApi.saveSession(token!, primaryId, {
        gameType: 'hold_and_answer',
        ...payload,
      }),
  })

  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState<RoundResult[]>([])
  const [finished, setFinished] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="container py-8 max-w-3xl">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link to={`/decks/${id}`}>
            <ArrowLeft className="h-4 w-4" /> Voltar ao deck
          </Link>
        </Button>
        <UICard>
          <CardContent className="py-8 text-center space-y-3">
            <h2 className="text-xl font-semibold">Erro ao carregar deck</h2>
            <p className="text-muted-foreground">
              Não foi possível carregar o deck para o jogo.
            </p>
          </CardContent>
        </UICard>
      </div>
    )
  }

  if (!deck || cards.length === 0) {
    return <div className="container py-8">Deck sem cards para jogar.</div>
  }

  const current = cards[index]
  const total = cards.length
  const correct = results.filter((r) => r.hit).length
  const wrong = results.filter((r) => !r.hit).length
  const score = Math.round((correct / Math.max(1, results.length)) * 100)

  function mark(hit: boolean) {
    const next = [...results, { cardId: current.id, hit }]
    setResults(next)

    if (index === total - 1) {
      setFinished(true)
      const finalCorrect = next.filter((r) => r.hit).length
      const finalScore = Math.round((finalCorrect / total) * 100)
      saveMutation
        .mutateAsync({ score: finalScore, totalCards: total, correctCards: finalCorrect })
        .catch(() => toast.error('Não foi possível salvar o resultado da partida.'))
      return
    }

    setIndex((i) => i + 1)
    setFlipped(false)
  }

  function restart() {
    setIndex(0)
    setFlipped(false)
    setResults([])
    setFinished(false)
  }

  return (
    <div className="container py-8 max-w-3xl page-enter">
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link to={`/decks/${primaryId}`}>
          <ArrowLeft className="h-4 w-4" /> Voltar ao deck
        </Link>
      </Button>

      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Users className="h-4 w-4" />
          Modo Segura e Responde
        </div>
        <h1 className="text-3xl font-bold">{deckName}</h1>
      </div>

      {!finished ? (
        <>
          <div className="mb-6 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                Card {index + 1} de {total}
              </span>
              <span>{score}% de acerto</span>
            </div>
            <Progress value={((index + 1) / total) * 100} />
          </div>

          <div className="card-flip-container h-[420px] mb-6">
            <div className={`card-flip-inner h-full ${flipped ? 'flipped' : ''}`}>
              <UICard className="card-face h-full flex flex-col cursor-pointer" onClick={() => setFlipped(true)}>
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">
                    Pergunta
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center text-center">
                  <p className="text-2xl font-semibold leading-relaxed">{current.question}</p>
                </CardContent>
              </UICard>

              <UICard className="card-face card-face-back h-full flex flex-col cursor-pointer" onClick={() => setFlipped(false)}>
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">
                    Resposta
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-4 overflow-y-auto">
                  <p className="text-xl font-semibold">{current.answer}</p>

                  {current.explanation && (
                    <div className="rounded-xl border-2 border-primary/30 bg-primary/8 p-4 space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                        🎯 Guia do avaliador
                      </p>
                      <p className="text-sm leading-relaxed">{current.explanation}</p>
                    </div>
                  )}

                  {current.analogy && (
                    <div className="p-3 rounded-lg bg-muted border-l-2 border-primary/40">
                      <p className="text-xs font-medium text-primary mb-1">Analogia</p>
                      <p className="text-sm italic">{current.analogy}</p>
                    </div>
                  )}

                  {current.imageUrl && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPreviewImage(current.imageUrl)
                      }}
                      className="block mx-auto"
                    >
                      <img
                        src={current.imageUrl}
                        alt="Card"
                        className="rounded-lg max-h-52 w-full object-contain border border-border bg-muted/30 cursor-zoom-in mx-auto"
                      />
                    </button>
                  )}
                </CardContent>
              </UICard>
            </div>
          </div>

          <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
            <DialogContent className="max-w-4xl p-2 sm:p-4">
              <div className="relative">
                {previewImage && (
                  <img
                    src={previewImage}
                    alt="Preview da imagem do card"
                    className="max-h-[80vh] w-full rounded-lg object-contain bg-muted/20"
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>

          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              variant="destructive"
              className="h-14 text-base"
              onClick={() => mark(false)}
            >
              <XCircle className="h-5 w-5" />
              Errou
            </Button>
            <Button
              size="lg"
              className="h-14 text-base bg-green-600 hover:bg-green-700"
              onClick={() => mark(true)}
            >
              <CheckCircle2 className="h-5 w-5" />
              Acertou
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Toque no card para virar pergunta/resposta
          </p>
        </>
      ) : (
        <UICard className="text-center py-8">
          <CardContent className="space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Partida finalizada!</h2>
              <p className="text-muted-foreground mt-1">Veja seu desempenho abaixo</p>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold">{correct}</p>
                <p className="text-xs text-muted-foreground">Acertos</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold">{wrong}</p>
                <p className="text-xs text-muted-foreground">Erros</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold">{Math.round((correct / total) * 100)}%</p>
                <p className="text-xs text-muted-foreground">Taxa</p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={restart}>
                <RotateCcw className="h-4 w-4" />
                Jogar novamente
              </Button>
              <Button asChild>
                <Link to={`/decks/${primaryId}/play/quiz`}>Tentar modo Quiz</Link>
              </Button>
            </div>
          </CardContent>
        </UICard>
      )}
    </div>
  )
}
