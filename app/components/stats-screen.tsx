"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Trophy, Target, Clock, Award, Zap, Loader2, BarChart3, Crown } from "lucide-react"
import { useAuth } from "@/lib/contexts/AuthContext"
import { useQuery } from "@/hooks/useFirestore"
import { MatchHistory } from "@/lib/types"
import { toDate } from "@/lib/utils"

const MONTH_LABELS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

const SPORT_EMOJI: Record<string, string> = {
  futebol: "⚽",
  futsal: "⚽",
  "ténis": "🎾",
  tenis: "🎾",
  basquetebol: "🏀",
  padel: "🏓",
  voleibol: "🏐",
}

interface SportBreakdown {
  games: number
  wins: number
  losses: number
  draws: number
  winRate: number
  hours: number
  goals: number
  assists: number
  points: number
  aces: number
}

interface MonthBucket {
  key: string
  label: string
  games: number
  wins: number
}

interface ComputedAchievement {
  id: string
  icon: string
  name: string
  description: string
  progress: number
  maxProgress: number
  completed: boolean
}

function parseDurationHours(duration: string | undefined): number {
  const match = duration?.match(/(\d+)\s*min/)
  const minutes = match ? parseInt(match[1], 10) : 60
  return minutes / 60
}

function matchDate(match: MatchHistory): Date | null {
  return toDate(match.createdAt) ?? (match.date ? toDate(match.date) : null)
}

export default function StatsScreen() {
  const { user } = useAuth()

  // Live match history (one doc per completed match per player)
  const { data: matches, loading: matchesLoading } = useQuery<MatchHistory>(
    "matchHistory",
    [{ field: "userId", operator: "==", value: user?.id || "" }],
    { enabled: !!user?.id, realtime: true }
  )

  // Overall stats: user doc first (kept live by match completion), hours from matchHistory
  const overallStats = useMemo(() => {
    const totalGames = user?.gamesPlayed || 0
    const wins = user?.wins || 0
    const totalHours = matches.reduce((sum, m) => sum + parseDurationHours(m.duration), 0)

    // Streaks derived from match history in chronological order
    const chronological = [...matches].sort((a, b) => {
      const da = matchDate(a)?.getTime() ?? 0
      const db = matchDate(b)?.getTime() ?? 0
      return da - db
    })
    let bestStreak = 0
    let run = 0
    for (const m of chronological) {
      if (m.result === "win") {
        run++
        if (run > bestStreak) bestStreak = run
      } else {
        run = 0
      }
    }
    let currentStreak = 0
    for (let i = chronological.length - 1; i >= 0; i--) {
      if (chronological[i].result === "win") currentStreak++
      else break
    }

    return {
      totalGames,
      wins,
      losses: user?.losses || 0,
      draws: user?.draws || 0,
      winRate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0,
      totalHours: Math.round(totalHours * 10) / 10,
      currentStreak,
      bestStreak,
      level: user?.level || 1,
      totalPoints: user?.points || 0,
    }
  }, [user, matches])

  // Sport breakdown derived from match history
  const sportStats = useMemo(() => {
    const bySport: Record<string, SportBreakdown> = {}
    for (const m of matches) {
      const sport = (m.sport || "outro").toLowerCase()
      if (!bySport[sport]) {
        bySport[sport] = { games: 0, wins: 0, losses: 0, draws: 0, winRate: 0, hours: 0, goals: 0, assists: 0, points: 0, aces: 0 }
      }
      const s = bySport[sport]
      s.games++
      if (m.result === "win") s.wins++
      else if (m.result === "loss") s.losses++
      else s.draws++
      s.hours += parseDurationHours(m.duration)
      s.goals += m.myStats?.goals || 0
      s.assists += m.myStats?.assists || 0
      s.points += m.myStats?.points || 0
      s.aces += m.myStats?.aces || 0
    }
    for (const s of Object.values(bySport)) {
      s.winRate = s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0
      s.hours = Math.round(s.hours * 10) / 10
    }
    return bySport
  }, [matches])

  // Monthly progress: last 6 months bucketed from match history (current month always shown)
  const monthlyProgress = useMemo<MonthBucket[]>(() => {
    const now = new Date()
    const buckets: MonthBucket[] = []
    const index = new Map<string, MonthBucket>()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const bucket: MonthBucket = { key, label: MONTH_LABELS[d.getMonth()], games: 0, wins: 0 }
      buckets.push(bucket)
      index.set(key, bucket)
    }
    for (const m of matches) {
      const d = matchDate(m)
      if (!d) continue
      const bucket = index.get(`${d.getFullYear()}-${d.getMonth()}`)
      if (!bucket) continue
      bucket.games++
      if (m.result === "win") bucket.wins++
    }
    return buckets
  }, [matches])

  const maxGames = useMemo(() => {
    return Math.max(...monthlyProgress.map((m) => m.games), 1)
  }, [monthlyProgress])

  const chartHeight = 200

  // Achievements computed from live user data
  const achievements = useMemo<ComputedAchievement[]>(() => {
    const gamesPlayed = user?.gamesPlayed || 0
    const wins = user?.wins || 0
    const mvps = user?.mvps || 0
    const level = user?.level || 1
    const points = user?.points || 0

    const build = (
      id: string,
      icon: string,
      name: string,
      description: string,
      value: number,
      target: number
    ): ComputedAchievement => ({
      id,
      icon,
      name,
      description,
      progress: Math.min(value, target),
      maxProgress: target,
      completed: value >= target,
    })

    return [
      build("first-game", "🎮", "Primeiro Jogo", "Joga a tua primeira partida", gamesPlayed, 1),
      build("first-win", "🏆", "Primeira Vitória", "Ganha a tua primeira partida", wins, 1),
      build("hat-trick", "🔥", "Hat-trick de Vitórias", "Ganha 3 partidas", wins, 3),
      build("veteran", "🎖️", "Veterano", "Joga 10 partidas", gamesPlayed, 10),
      build("marathon", "🏃", "Maratonista", "Joga 25 partidas", gamesPlayed, 25),
      build("mvp", "👑", "MVP", "Sê eleito MVP de uma partida", mvps, 1),
      build("team-star", "⭐", "Estrela da Equipa", "Sê eleito MVP 5 vezes", mvps, 5),
      build("level-5", "📈", "Nível 5", "Alcança o nível 5", level, 5),
      build("legend", "🐐", "Lenda", "Alcança o nível 10", level, 10),
      build("point-collector", "💎", "Colecionador de Pontos", "Acumula 500 pontos", points, 500),
    ]
  }, [user])

  // Progress to next level
  const progressToNextLevel = useMemo(() => {
    const pointsPerLevel = 300
    const currentLevelPoints = (overallStats.level - 1) * pointsPerLevel
    const nextLevelPoints = overallStats.level * pointsPerLevel
    const pointsInCurrentLevel = overallStats.totalPoints - currentLevelPoints
    const pointsNeeded = Math.max(0, nextLevelPoints - overallStats.totalPoints)
    const progress = Math.min(100, Math.round((pointsInCurrentLevel / pointsPerLevel) * 100))
    return { progress, pointsNeeded }
  }, [overallStats])

  const hasGames = matches.length > 0

  if (matchesLoading) {
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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
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
                  {overallStats.winRate}%
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
                  Média: {matches.length > 0
                    ? (overallStats.totalHours / matches.length).toFixed(1)
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

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">MVPs</CardTitle>
                <Crown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{user?.mvps || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Vezes eleito MVP
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
                  Ainda não tens jogos. Joga partidas para começares a ver as tuas estatísticas por desporto!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(sportStats).map(([sport, stats]) => (
                <Card key={sport}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {SPORT_EMOJI[sport] || "🏆"}
                      {sport.charAt(0).toUpperCase() + sport.slice(1)}
                      <Badge variant="outline">{stats.games} jogos</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Taxa de Vitórias</p>
                        <p className="text-2xl font-bold text-green-600">
                          {stats.winRate}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          {stats.goals > 0 || stats.points === 0 ? "Golos" : "Pontos"}
                        </p>
                        <p className="text-2xl font-bold text-blue-600">
                          {stats.goals > 0 || stats.points === 0 ? stats.goals : stats.points}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">V - D - E</p>
                        <p className="text-lg font-semibold">
                          {stats.wins} - {stats.losses} - {stats.draws}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          {stats.assists > 0 ? "Assistências" : stats.aces > 0 ? "Aces" : "Assistências"}
                        </p>
                        <p className="text-lg font-semibold text-purple-600">
                          {stats.assists > 0 ? stats.assists : stats.aces > 0 ? stats.aces : stats.assists}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-500">{stats.hours}h jogadas</p>
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
              <CardDescription>Evolução dos teus jogos ao longo dos últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              {!hasGames ? (
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Ainda não tens jogos</p>
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
                        {monthlyProgress.map((month) => {
                          const gamesHeight = (month.games / maxGames) * chartHeight
                          const winsHeight = (month.wins / maxGames) * chartHeight

                          return (
                            <div key={month.key} className="flex flex-col items-center gap-2">
                              {/* Bars */}
                              <div className="flex items-end gap-1">
                                {/* Total games bar */}
                                <div
                                  className="w-6 bg-blue-400 rounded-t-sm relative group cursor-pointer"
                                  style={{ height: `${gamesHeight}px` }}
                                >
                                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                    {month.games} jogos
                                  </div>
                                </div>
                                {/* Wins bar */}
                                <div
                                  className="w-6 bg-green-500 rounded-t-sm relative group cursor-pointer"
                                  style={{ height: `${winsHeight}px` }}
                                >
                                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                    {month.wins} vitórias
                                  </div>
                                </div>
                              </div>
                              {/* Month label */}
                              <span className="text-xs text-gray-600 font-medium">{month.label}</span>
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

                  {/* Monthly progress bars */}
                  <div className="space-y-3 mt-6">
                    {monthlyProgress.map((month) => (
                      <div key={`bar-${month.key}`} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-700 capitalize">{month.label}</span>
                          <span className="text-gray-500">
                            {month.games} jogos • {month.wins} vitórias
                          </span>
                        </div>
                        <Progress
                          value={(month.games / maxGames) * 100}
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Summary stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {monthlyProgress.reduce((sum, m) => sum + m.games, 0)}
                      </div>
                      <div className="text-sm text-gray-600">Total de Jogos</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {monthlyProgress.reduce((sum, m) => sum + m.wins, 0)}
                      </div>
                      <div className="text-sm text-gray-600">Total de Vitórias</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {monthlyProgress.reduce((sum, m) => sum + m.games, 0) > 0
                          ? Math.round(
                              (monthlyProgress.reduce((sum, m) => sum + m.wins, 0) /
                                monthlyProgress.reduce((sum, m) => sum + m.games, 0)) *
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map((achievement) => (
              <Card
                key={achievement.id}
                className={achievement.completed ? "border-green-200 bg-green-50" : ""}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl leading-none">{achievement.icon}</span>
                      <Award className={`w-5 h-5 ${achievement.completed ? "text-green-600" : "text-gray-400"}`} />
                      <h3 className="font-semibold">{achievement.name}</h3>
                    </div>
                    {achievement.completed && <Badge className="bg-green-500">Completo</Badge>}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{achievement.description}</p>
                  {!achievement.completed && (
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
