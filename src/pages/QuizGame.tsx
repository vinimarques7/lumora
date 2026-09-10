import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, Trophy, Clock3, RotateCcw, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { decksApi, type Card, type QuizQuestion } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card as UICard, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { calcQuizPoints } from '@/lib/utils'
import { buildQuizOptions, getCardAnswerLabel, normalizeTrueFalseValue } from '@/lib/quiz'

const TIME_PER_QUESTION_MS = 20_000

interface AnswerRecord {
  questionId: string
  selected: string
  correct: boolean
  points: number
}

function generateQuestions(allCards: Card[], count: number): QuizQuestion[] {
  const shuffled = [...allCards].sort(() => Math.random() - 0.5).slice(0, count)
  return shuffled.map((card) => {
    const correctAnswer = getCardAnswerLabel(card)
    const options = buildQuizOptions(card, allCards)

    return {
      id: card.id,
      question: card.question,
      explanation: card.explanation,
      analogy: card.analogy,
      correctAnswer,
      options,
    }
  })
}

export default function QuizGame() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const { token } = useAuth()

  const multiIds = searchParams.get('decks')?.split(',').filter(Boolean) ?? []
  const selectedIds = searchParams.get('selected')?.split(',').filter(Boolean) ?? []
  const isMulti = multiIds.length > 0
  const primaryId = isMulti ? multiIds[0] : (id ?? '')
  const count = Math.max(5, Math.min(50, parseInt(searchParams.get('count') ?? '10', 10)))

  // Single-deck: use server-generated quiz
  const singleQuery = useQuery({
    queryKey: ['quiz', primaryId, count, selectedIds.join(',')],
    queryFn: () => decksApi.getQuiz(token!, primaryId, count, selectedIds),
    enabled: !!token && !!primaryId && !isMulti,
  })

  // Multi-deck: fetch all decks, then generate client-side
  const multiQuery = useQuery({
    queryKey: ['deck-multi', multiIds.join(',')],
    queryFn: () => decksApi.getMulti(token!, multiIds),
    enabled: !!token && isMulti,
  })

  const isLoading = isMulti ? multiQuery.isLoading : singleQuery.isLoading
  const isError = isMulti ? multiQuery.isError : singleQuery.isError

  const questions: QuizQuestion[] = useMemo(() => {
    if (isMulti) {
      const allCards = (multiQuery.data ?? []).flatMap((r) => r.cards)
      const filteredCards = selectedIds.length ? allCards.filter((card) => selectedIds.includes(card.id)) : allCards
      if (filteredCards.length < 2) return []
      return generateQuestions(filteredCards, Math.min(count, filteredCards.length))
    }

    if (!singleQuery.data?.questions) return []
    const serverQuestions = singleQuery.data.questions
    if (!selectedIds.length) return serverQuestions
    return serverQuestions.filter((question) => selectedIds.includes(question.id))
  }, [isMulti, multiQuery.data, selectedIds, singleQuery.data, count])

  const deckName = isMulti
    ? (multiQuery.data ?? []).map((r) => r.deck.name).join(' + ')
    : (singleQuery.data?.deckName ?? 'Quiz')

  const saveMutation = useMutation({
    mutationFn: (payload: { score: number; totalCards: number; correctCards: number }) =>
      decksApi.saveSession(token!, primaryId, {
        gameType: 'quiz',
        ...payload,
      }),
  })

  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION_MS)
  const [locked, setLocked] = useState(false)
  const [finished, setFinished] = useState(false)

  const current = questions[idx]
  const progress = questions.length > 0 ? ((idx + 1) / questions.length) * 100 : 0

  const score = useMemo(() => answers.reduce((acc, a) => acc + a.points, 0), [answers])
  const correct = useMemo(() => answers.filter((a) => a.correct).length, [answers])

  useEffect(() => {
    if (!current || locked || finished) return

    setTimeLeft(TIME_PER_QUESTION_MS)
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 100) {
          clearInterval(interval)
          handleAnswer('__timeout__')
          return 0
        }
        return prev - 100
      })
    }, 100)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, current, locked, finished])

  function handleAnswer(selected: string) {
    if (!current || locked) return

    setLocked(true)

    const normalizedSelected = normalizeTrueFalseValue(selected)
    const normalizedCorrect = normalizeTrueFalseValue(current.correctAnswer)
    const isCorrect = selected === current.correctAnswer ||
      (!!normalizedSelected && !!normalizedCorrect && normalizedSelected === normalizedCorrect)
    const points = isCorrect ? calcQuizPoints(timeLeft, TIME_PER_QUESTION_MS) : 0

    const nextAnswers = [
      ...answers,
      {
        questionId: current.id,
        selected,
        correct: isCorrect,
        points,
      },
    ]

    setAnswers(nextAnswers)

    setTimeout(() => {
      if (idx === questions.length - 1) {
        setFinished(true)
        const totalCorrect = nextAnswers.filter((a) => a.correct).length
        saveMutation
          .mutateAsync({ score: nextAnswers.reduce((s, a) => s + a.points, 0), totalCards: questions.length, correctCards: totalCorrect })
          .catch(() => toast.error('Não foi possível salvar o resultado.'))
      } else {
        setIdx((i) => i + 1)
      }
      setLocked(false)
    }, 900)
  }

  async function restart() {
    setIdx(0)
    setAnswers([])
    setTimeLeft(TIME_PER_QUESTION_MS)
    setLocked(false)
    setFinished(false)
    if (!isMulti) await singleQuery.refetch()
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="container py-8">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link to={id ? `/decks/${primaryId}` : '/dashboard'}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </Button>
        <UICard>
          <CardContent className="py-8 text-center space-y-3">
            <h2 className="text-xl font-semibold">Erro ao carregar quiz</h2>
            <p className="text-muted-foreground">
              Não foi possível carregar as perguntas do quiz.
            </p>
          </CardContent>
        </UICard>
      </div>
    )
  }

  if (!questions.length) {
    return (
      <div className="container py-8">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link to={`/decks/${primaryId}`}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </Button>
        <UICard>
          <CardContent className="py-8 text-center space-y-3">
            <h2 className="text-xl font-semibold">Não foi possível iniciar o quiz</h2>
            <p className="text-muted-foreground">
              O deck precisa ter pelo menos 2 cards para gerar opções de múltipla escolha.
            </p>
          </CardContent>
        </UICard>
      </div>
    )
  }

  if (finished) {
    const accuracy = Math.round((correct / questions.length) * 100)

    return (
      <div className="container py-8 max-w-3xl page-enter">
        <UICard>
          <CardContent className="py-10 text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Trophy className="h-8 w-8 text-primary" />
            </div>

            <div>
              <h1 className="text-3xl font-bold">Quiz finalizado!</h1>
              <p className="text-muted-foreground mt-1">{deckName}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold">{score}</p>
                <p className="text-xs text-muted-foreground">Pontos</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold">{correct}/{questions.length}</p>
                <p className="text-xs text-muted-foreground">Acertos</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold">{accuracy}%</p>
                <p className="text-xs text-muted-foreground">Precisão</p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={restart}>
                <RotateCcw className="h-4 w-4" />
                Jogar novamente
              </Button>
              <Button asChild>
                <Link to={`/decks/${primaryId}/play/hold`}>Modo Segura e Responde</Link>
              </Button>
            </div>
          </CardContent>
        </UICard>
      </div>
    )
  }

  const lastAnswer = answers[answers.length - 1]

  return (
    <div className="container py-8 max-w-3xl page-enter">
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link to={isMulti ? '/dashboard' : `/decks/${primaryId}`}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      </Button>

      <div className="mb-5 space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Questão {idx + 1} de {questions.length}
          </span>
          <span className="flex items-center gap-1">
            <Clock3 className="h-4 w-4" /> {(timeLeft / 1000).toFixed(1)}s
          </span>
        </div>
        <Progress value={progress} />

        {/* Time bar */}
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-[width]"
            style={{ width: `${(timeLeft / TIME_PER_QUESTION_MS) * 100}%` }}
          />
        </div>
      </div>

      <UICard className="mb-4">
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold leading-relaxed">{current.question}</h2>
        </CardContent>
      </UICard>

      <div className="grid sm:grid-cols-2 gap-3">
        {current.options.map((opt, optionIndex) => {
          const isSelected = lastAnswer?.selected === opt && locked
          const isCorrect = locked && opt === current.correctAnswer
          const isWrongSelected = isSelected && !isCorrect

          return (
            <button
              key={`${current.id}-${optionIndex}`}
              onClick={() => handleAnswer(opt)}
              disabled={locked}
              className={`
                rounded-xl border p-4 text-left transition-all min-h-24 bg-card text-card-foreground
                hover:border-primary/40 hover:bg-primary/10
                ${isCorrect ? 'border-emerald-400 bg-emerald-500/20 text-foreground' : ''}
                ${isWrongSelected ? 'border-rose-400 bg-rose-500/20 text-foreground' : ''}
                ${locked && !isCorrect && !isWrongSelected ? 'opacity-80' : ''}
                ${locked ? 'cursor-default' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm leading-relaxed">{opt}</p>
                {isCorrect && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />}
                {isWrongSelected && <XCircle className="h-4 w-4 text-red-600 shrink-0" />}
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-4 text-sm text-muted-foreground flex items-center justify-between">
        <span>Pontuação: <strong className="text-foreground">{score}</strong></span>
        <span>Acertos: <strong className="text-foreground">{correct}</strong></span>
      </div>
    </div>
  )
}
