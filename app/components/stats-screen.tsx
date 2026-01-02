"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Trophy, Target, Clock, Award, Zap, Loader2, BarChart3 } from "lucide-react"
import { useAuth } from "@/lib/contexts/AuthContext"
import { useDocument, useQuery } from "@/hooks/useFirestore"
import { UserStats, MonthlyProgress, Achievement } from "@/lib/types"

export default function StatsScreen() {
  const { user } = useAuth()

  // Fetch user stats
  const { data: userStats, loading: statsLoading } = useDocument<UserStats>(
    "userStats",
    user?.id || null
  )

  // Fetch monthly progress
  const { data: monthlyProgress, loading: progressLoading } = useQuery<MonthlyProgress>(
    "monthlyProgress",
    [{ field: "userId", operator: "==", value: user?.id || "" }],
    { enabled: !!user?.id }
  )

  // Fetch achievements
  const { data: achievements, loading: achievementsLoading } = useQuery<Achievement>(
    "achievements",
    [{ field: "userId", operator: "==", value: user?.id || "" }],
    { enabled: !!user?.id }
  )

  // Default stats when no data
  const overallStats = useMemo(() => ({
    totalGames: userStats?.totalGames || user?.gamesPlayed || 0,
    wins: userStats?.wins || user?.wins || 0,
    losses: userStats?.losses || user?.losses || 0,
    draws: userStats?.draws || user?.draws || 0,
    winRate: userStats?.winRate || 0,
    totalHours: userStats?.totalHours || 0,
    currentStreak: userStats?.currentStreak || 0,
    bestStreak: userStats?.bestStreak || 0,
    level: userStats?.level || user?.level || 1,
    totalPoints: userStats?.totalPoints || user?.points || 0,
  }), [userStats, user])

  // Sport stats from userStats
  const sportStats = useMemo(() => {
    if (!userStats?.sportStats) return {}
    return userStats.sportStats
  }, [userStats])

  // Sort monthly progress by date
  const sortedProgress = useMemo(() => {
    if (!monthlyProgress) return []
    return [...monthlyProgress].sort((a, b) => {
      const dateA = new Date(`${a.year}-${a.month}-01`)
      const dateB = new Date(`${b.year}-${b.month}-01`)
      return dateA.getTime() - dateB.getTime()
    }).slice(-6) // Last 6 months
  }, [monthlyProgress])

  // Calculate chart values
  const maxGames = useMemo(() => {
    if (sortedProgress.length === 0) return 10
    return Math.max(...sortedProgress.map((m) => m.games), 1)
  }, [sortedProgress])

  const chartHeight = 200

  // Calculate progress to next level (mock calculation)
  const progressToNextLevel = useMemo(() => {
    const pointsPerLevel = 300
    const currentLevelPoints = (overallStats.level - 1) * pointsPerLevel
    const nextLevelPoints = overallStats.level * pointsPerLevel
    const pointsInCurrentLevel = overallStats.totalPoints - currentLevelPoints
    const pointsNeeded = nextLevelPoints - overallStats.totalPoints
    const progress = Math.min(100, Math.round((pointsInCurrentLevel / pointsPerLevel) * 100))
    return { progress, pointsNeeded }
  }, [overallStats])

  const loading = statsLoading || progressLoading || achievementsLoading

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-2" />
          <p className="text-gray-600">A carregar estatísticas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Minhas Estatísticas</h1>
        <p className="text-gray-600">Acompanha o teu progresso e performance em todos os desportos</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumo Geral</TabsTrigger>
          <TabsTrigger value="sports">Por Desporto</TabsTrigger>
          <TabsTrigger value="progress">Progresso</TabsTrigger>
          <TabsTrigger value="achievements">Conquistas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Main Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Jogos</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallStats.totalGames}</div>
                <p className="text-xs text-muted-foreground">
                  {overallStats.wins}V - {overallStats.losses}D
                  {overallStats.draws > 0 && ` - ${overallStats.draws}E`}
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
                  {overallStats.winRate.toFixed(0)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {overallStats.wins} vitórias
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Horas Jogadas</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{overallStats.totalHours}h</div>
                <p className="text-xs text-muted-foreground">
                  Média: {overallStats.totalGames > 0
                    ? (overallStats.totalHours / overallStats.totalGames).toFixed(1)
                    : 0}h/jogo
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Série Atual</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{overallStats.currentStreak}</div>
                <p className="text-xs text-muted-foreground">
                  Melhor: {overallStats.bestStreak} vitórias
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Level Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Progresso de Nível</CardTitle>
              <CardDescription>
                Nível {overallStats.level} • {overallStats.totalPoints} pontos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Nível {overallStats.level}</span>
                  <span>Nível {overallStats.level + 1}</span>
                </div>
                <Progress value={progressToNextLevel.progress} className="h-3" />
                <p className="text-xs text-muted-foreground">
                  Faltam {progressToNextLevel.pointsNeeded} pontos para o próximo nível
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sports" className="space-y-6">
          {Object.keys(sportStats).length === 0 ? (
            <Card className="bg-gray-50">
              <CardContent className="p-12 text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Sem estatísticas por desporto
                </h3>
                <p className="text-gray-600">
                  Joga partidas para começares a ver as tuas estatísticas por desporto!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(sportStats).map(([sport, stats]) => (
                <Card key={sport}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {sport === "futebol" || sport === "futsal" ? "⚽" :
                       sport === "ténis" || sport === "tenis" ? "🎾" :
                       sport === "basquetebol" ? "🏀" :
                       sport === "padel" ? "🏓" :
                       sport === "voleibol" ? "🏐" : "🏆"}
                      {sport.charAt(0).toUpperCase() + sport.slice(1)}
                      <Badge variant="outline">{stats.games} jogos</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Taxa de Vitórias</p>
                        <p className="text-2xl font-bold text-green-600">
                          {stats.winRate?.toFixed(0) || 0}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          {stats.goals !== undefined ? "Golos" : "Pontos"}
                        </p>
                        <p className="text-2xl font-bold text-blue-600">
                          {stats.goals || stats.points || 0}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">
                          {stats.assists !== undefined ? "Assistências" :
                           stats.aces !== undefined ? "Aces" :
                           stats.winners !== undefined ? "Winners" : "Outros"}
                        </p>
                        <p className="text-lg font-semibold">
                          {stats.assists || stats.aces || stats.winners || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Por Jogo</p>
                        <p className="text-lg font-semibold text-purple-600">
                          {stats.games > 0
                            ? ((stats.goals || stats.points || 0) / stats.games).toFixed(1)
                            : 0}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-500">{stats.hours || 0}h jogadas</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Progresso Mensal</CardTitle>
              <CardDescription>Evolução dos teus jogos ao longo dos últimos meses</CardDescription>
            </CardHeader>
            <CardContent>
              {sortedProgress.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Ainda não há dados de progresso</p>
                  <p className="text-sm text-gray-500">Joga partidas para ver o teu progresso ao longo do tempo!</p>
                </div>
              ) : (
                <>
                  {/* Chart Container */}
                  <div className="relative bg-gray-50 rounded-lg p-6">
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 py-6">
                      <span>{maxGames}</span>
                      <span>{Math.round(maxGames * 0.75)}</span>
                      <span>{Math.round(maxGames * 0.5)}</span>
                      <span>{Math.round(maxGames * 0.25)}</span>
                      <span>0</span>
                    </div>

                    {/* Chart area */}
                    <div className="ml-8 relative" style={{ height: `${chartHeight}px` }}>
                      {/* Grid lines */}
                      <div className="absolute inset-0">
                        {[0, 25, 50, 75, 100].map((percent) => (
                          <div
                            key={percent}
                            className="absolute w-full border-t border-gray-200"
                            style={{ top: `${percent}%` }}
                          />
                        ))}
                      </div>

                      {/* Data visualization */}
                      <div className="relative h-full flex items-end justify-between px-4">
                        {sortedProgress.map((progress) => {
                          const gamesHeight = (progress.games / maxGames) * chartHeight
                          const winsHeight = (progress.wins / maxGames) * chartHeight

                          return (
                            <div key={`${progress.year}-${progress.month}`} className="flex flex-col items-center gap-2">
                              {/* Bars */}
                              <div className="flex items-end gap-1">
                                {/* Total games bar */}
                                <div
                                  className="w-6 bg-blue-400 rounded-t-sm relative group cursor-pointer"
                                  style={{ height: `${gamesHeight}px` }}
                                >
                                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                    {progress.games} jogos
                                  </div>
                                </div>
                                {/* Wins bar */}
                                <div
                                  className="w-6 bg-green-500 rounded-t-sm relative group cursor-pointer"
                                  style={{ height: `${winsHeight}px` }}
                                >
                                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                    {progress.wins} vitórias
                                  </div>
                                </div>
                              </div>
                              {/* Month label */}
                              <span className="text-xs text-gray-600 font-medium">{progress.month}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="flex justify-center gap-6 mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-400 rounded"></div>
                        <span className="text-sm text-gray-600">Total de Jogos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                        <span className="text-sm text-gray-600">Vitórias</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {sortedProgress.reduce((sum, m) => sum + m.games, 0)}
                      </div>
                      <div className="text-sm text-gray-600">Total de Jogos</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {sortedProgress.reduce((sum, m) => sum + m.wins, 0)}
                      </div>
                      <div className="text-sm text-gray-600">Total de Vitórias</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {sortedProgress.reduce((sum, m) => sum + m.games, 0) > 0
                          ? Math.round(
                              (sortedProgress.reduce((sum, m) => sum + m.wins, 0) /
                                sortedProgress.reduce((sum, m) => sum + m.games, 0)) *
                                100
                            )
                          : 0}
                        %
                      </div>
                      <div className="text-sm text-gray-600">Taxa de Vitórias</div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          {(!achievements || achievements.length === 0) ? (
            <Card className="bg-gray-50">
              <CardContent className="p-12 text-center">
                <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Sem conquistas ainda
                </h3>
                <p className="text-gray-600">
                  Joga partidas para desbloqueares conquistas!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.map((achievement) => (
                <Card
                  key={achievement.id}
                  className={achievement.completed ? "border-green-200 bg-green-50" : ""}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Award className={`w-5 h-5 ${achievement.completed ? "text-green-600" : "text-gray-400"}`} />
                        <h3 className="font-semibold">{achievement.name}</h3>
                      </div>
                      {achievement.completed && <Badge className="bg-green-500">Completo</Badge>}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{achievement.description}</p>
                    {!achievement.completed && achievement.progress !== undefined && achievement.maxProgress && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Progresso</span>
                          <span>{achievement.progress}/{achievement.maxProgress}</span>
                        </div>
                        <Progress
                          value={(achievement.progress / achievement.maxProgress) * 100}
                          className="h-2"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
