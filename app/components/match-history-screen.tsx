"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, MapPin, Clock, Trophy, Target, Play, Star, Loader2, History } from "lucide-react"
import { useAuth } from "@/lib/contexts/AuthContext"
import { useQuery, useDocument } from "@/hooks/useFirestore"
import { MatchHistory, UserStats } from "@/lib/types"

export default function MatchHistoryScreen() {
  const { user } = useAuth()

  // Fetch user's match history
  const { data: matchHistory, loading, error } = useQuery<MatchHistory>(
    "matchHistory",
    [{ field: "userId", operator: "==", value: user?.id || "" }],
    { enabled: !!user?.id, realtime: true }
  )

  // Fetch user's stats
  const { data: userStats } = useDocument<UserStats>(
    "userStats",
    user?.id || null
  )

  // Sort matches by date (most recent first)
  const sortedMatches = useMemo(() => {
    if (!matchHistory) return []
    return [...matchHistory].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [matchHistory])

  // Calculate aggregate stats from match history
  const aggregateStats = useMemo(() => {
    if (!matchHistory || matchHistory.length === 0) {
      return {
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        averageRating: 0,
        totalHours: 0,
        thisMonth: 0
      }
    }

    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const wins = matchHistory.filter(m => m.result === "win").length
    const losses = matchHistory.filter(m => m.result === "loss").length
    const draws = matchHistory.filter(m => m.result === "draw").length
    const thisMonth = matchHistory.filter(m => new Date(m.date) >= thisMonthStart).length

    const totalRating = matchHistory.reduce((acc, m) => acc + (m.myStats.rating || 0), 0)
    const averageRating = matchHistory.length > 0 ? totalRating / matchHistory.length : 0

    const totalMinutes = matchHistory.reduce((acc, m) => {
      const mins = parseInt(m.duration) || 60
      return acc + mins
    }, 0)

    return {
      totalGames: matchHistory.length,
      wins,
      losses,
      draws,
      winRate: matchHistory.length > 0 ? Math.round((wins / matchHistory.length) * 100) : 0,
      averageRating: Math.round(averageRating * 10) / 10,
      totalHours: Math.round(totalMinutes / 60),
      thisMonth
    }
  }, [matchHistory])

  // Calculate stats per sport
  const sportStats = useMemo(() => {
    if (!matchHistory) return []

    const statsMap: Record<string, {
      sport: string
      games: number
      wins: number
      goals: number
      assists: number
      points: number
    }> = {}

    matchHistory.forEach(match => {
      if (!statsMap[match.sport]) {
        statsMap[match.sport] = {
          sport: match.sport,
          games: 0,
          wins: 0,
          goals: 0,
          assists: 0,
          points: 0
        }
      }
      statsMap[match.sport].games++
      if (match.result === "win") statsMap[match.sport].wins++
      statsMap[match.sport].goals += match.myStats.goals || 0
      statsMap[match.sport].assists += match.myStats.assists || 0
      statsMap[match.sport].points += match.myStats.points || 0
    })

    return Object.values(statsMap).sort((a, b) => b.games - a.games)
  }, [matchHistory])

  const getResultColor = (result: string) => {
    switch (result) {
      case "win":
        return "bg-green-100 text-green-800"
      case "loss":
        return "bg-red-100 text-red-800"
      case "draw":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getResultLabel = (result: string) => {
    switch (result) {
      case "win":
        return "Vitória"
      case "loss":
        return "Derrota"
      case "draw":
        return "Empate"
      default:
        return result
    }
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return "text-green-600"
    if (rating >= 6) return "text-yellow-600"
    return "text-red-600"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-2" />
          <p className="text-gray-600">A carregar histórico...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6 text-center">
            <p className="text-red-600">Erro ao carregar histórico de jogos</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Match History</h1>
        <p className="text-gray-600">Revê os teus jogos anteriores e estatísticas</p>
      </div>

      <Tabs defaultValue="recent" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="recent">Jogos Recentes</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas Gerais</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          {sortedMatches.length === 0 ? (
            <Card className="bg-gray-50">
              <CardContent className="p-12 text-center">
                <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Sem histórico de jogos
                </h3>
                <p className="text-gray-600">
                  Ainda não tens nenhum jogo registado. Participa em jogos para veres o teu histórico aqui!
                </p>
              </CardContent>
            </Card>
          ) : (
            sortedMatches.map((match) => (
              <Card key={match.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {match.sport}
                        <Badge className={getResultColor(match.result)}>{getResultLabel(match.result)}</Badge>
                        {match.mode === "ranked" && (
                          <Badge variant="outline" className="text-purple-600 border-purple-600">
                            Ranqueado
                          </Badge>
                        )}
                        {match.hasRecording && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Play className="w-3 h-3" />
                            Gravação
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(match.date).toLocaleDateString("pt-PT")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {match.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {match.venue || match.location}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{match.score || "-"}</div>
                      <p className="text-sm text-gray-600">{match.duration}</p>
                      {match.rankPoints && (
                        <p className={`text-sm font-medium ${match.rankPoints > 0 ? "text-green-600" : "text-red-600"}`}>
                          {match.rankPoints > 0 ? "+" : ""}{match.rankPoints} pts
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* My Performance */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">A Minha Performance</h4>
                      <div className="space-y-1">
                        {(match.myStats.goals !== undefined && match.myStats.goals > 0) && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Golos:</span>
                            <span className="font-medium">{match.myStats.goals}</span>
                          </div>
                        )}
                        {(match.myStats.points !== undefined && match.myStats.points > 0) && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Pontos:</span>
                            <span className="font-medium">{match.myStats.points}</span>
                          </div>
                        )}
                        {(match.myStats.assists !== undefined && match.myStats.assists > 0) && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Assistências:</span>
                            <span className="font-medium">{match.myStats.assists}</span>
                          </div>
                        )}
                        {(match.myStats.aces !== undefined && match.myStats.aces > 0) && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Aces:</span>
                            <span className="font-medium">{match.myStats.aces}</span>
                          </div>
                        )}
                        {match.myStats.rating && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Rating:</span>
                            <span className={`font-bold ${getRatingColor(match.myStats.rating)}`}>
                              {match.myStats.rating}/10
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* MVP */}
                    {match.mvp && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-900">Melhor Jogador</h4>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src="/placeholder.svg?height=32&width=32" />
                            <AvatarFallback>
                              {match.mvp
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{match.mvp}</p>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs text-gray-600">MVP</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">Ações</h4>
                      <div className="space-y-2">
                        <Button variant="outline" size="sm" className="w-full">
                          Ver Detalhes
                        </Button>
                        {match.hasRecording && (
                          <Button variant="outline" size="sm" className="w-full">
                            <Play className="w-4 h-4 mr-1" />
                            Ver Gravação
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          {/* Overall Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Jogos</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {userStats?.totalGames || aggregateStats.totalGames}
                </div>
                <p className="text-xs text-muted-foreground">
                  Este mês: {aggregateStats.thisMonth}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Vitórias</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {userStats?.winRate?.toFixed(0) || aggregateStats.winRate}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {aggregateStats.wins} vitórias de {aggregateStats.totalGames}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rating Médio</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {aggregateStats.averageRating || "-"}
                </div>
                <p className="text-xs text-muted-foreground">Últimos jogos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Horas Jogadas</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {userStats?.totalHours || aggregateStats.totalHours}h
                </div>
                <p className="text-xs text-muted-foreground">Total</p>
              </CardContent>
            </Card>
          </div>

          {/* Sport-specific Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas por Desporto</CardTitle>
            </CardHeader>
            <CardContent>
              {sportStats.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Ainda não tens estatísticas registadas
                </div>
              ) : (
                <div className="space-y-4">
                  {sportStats.map((stat) => (
                    <div key={stat.sport} className="flex justify-between items-center p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{stat.sport}</h4>
                        <p className="text-sm text-gray-600">
                          {stat.games} jogos • {stat.wins} vitórias
                        </p>
                      </div>
                      <div className="text-right">
                        {stat.goals > 0 && (
                          <>
                            <p className="font-bold text-green-600">{stat.goals} golos</p>
                            <p className="text-sm text-gray-600">{stat.assists} assistências</p>
                          </>
                        )}
                        {stat.points > 0 && stat.goals === 0 && (
                          <>
                            <p className="font-bold text-blue-600">{stat.points} pontos</p>
                            <p className="text-sm text-gray-600">
                              {Math.round((stat.wins / stat.games) * 100)}% vitórias
                            </p>
                          </>
                        )}
                        {stat.goals === 0 && stat.points === 0 && (
                          <p className="text-sm text-gray-600">
                            {Math.round((stat.wins / stat.games) * 100)}% vitórias
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
