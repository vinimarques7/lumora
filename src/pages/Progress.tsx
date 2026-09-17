import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Flame, TrendingUp, CalendarRange } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usersApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function formatDayLabel(date: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(date))
}

export default function ProgressPage() {
  const { token } = useAuth()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['user-progress'],
    queryFn: () => usersApi.getProgress(token!),
    enabled: !!token,
  })

  if (!token) {
    return (
      <div className="container py-8">
        <p className="text-muted-foreground">Faça login para ver o progresso pessoal.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-40 rounded bg-muted" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-28 rounded-lg bg-muted" />
            <div className="h-28 rounded-lg bg-muted" />
            <div className="h-28 rounded-lg bg-muted" />
          </div>
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="container py-8 max-w-2xl">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link to="/profile">
            <ArrowLeft className="h-4 w-4" /> Voltar ao perfil
          </Link>
        </Button>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Não foi possível carregar o seu progresso.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const summary = data.summary
  const history = data.history ?? []

  return (
    <div className="container py-8 max-w-5xl page-enter space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/profile">
          <ArrowLeft className="h-4 w-4" /> Voltar ao perfil
        </Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold">Progresso pessoal</h1>
        <p className="text-muted-foreground mt-1">Resumo da sua evolução com flashcards.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Precisão geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.accuracy}%</div>
            <p className="text-sm text-muted-foreground mt-1">{summary.correct} acertos de {summary.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="h-4 w-4 text-primary" />
              Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.streak}</div>
            <p className="text-sm text-muted-foreground mt-1">dias consecutivos com atividade</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarRange className="h-4 w-4 text-primary" />
              Total de tentativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.total}</div>
            <p className="text-sm text-muted-foreground mt-1">{summary.incorrect} erros e {summary.correct} acertos</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico diário</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-muted-foreground">Ainda não há atividade registrada.</p>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => {
                const total = entry.correct + entry.incorrect
                const accuracy = total === 0 ? 0 : Math.round((entry.correct / total) * 100)

                return (
                  <div key={entry.date} className="flex items-center gap-4 rounded-lg border p-3">
                    <div className="w-20 text-sm font-medium">{formatDayLabel(entry.date)}</div>
                    <div className="flex-1">
                      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.min(100, accuracy)}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-24 text-right text-sm text-muted-foreground">
                      {accuracy}% ({entry.correct}/{total})
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
