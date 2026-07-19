"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trophy, Target, Users, TrendingUp, Loader2, Crown } from "lucide-react"
import { useAuth } from "@/lib/contexts/AuthContext"
import { useCollection, useDocument } from "@/hooks/useFirestore"
import { User, UserStats } from "@/lib/types"

// Rank by points desc, tiebreak wins desc, then fewer games played first
const rankUsers = (players: User[]) =>
  [...players].sort(
    (a, b) =>
      (b.points || 0) - (a.points || 0) ||
      (b.wins || 0) - (a.wins || 0) ||
      (a.gamesPlayed || 0) - (b.gamesPlayed || 0)
  )

const getInitials = (player: User) =>
  (player.displayName || `${player.firstName || ""} ${player.lastName || ""}`)
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?"

// Medal colors for the top 3 podium
const medalStyles: Record<number, { medal: string; border: string }> = {
  1: { medal: "bg-yellow-500", border: "border-yellow-400" },
  2: { medal: "bg-gray-400", border: "border-gray-300" },
  3: { medal: "bg-amber-600", border: "border-amber-500" },
}

export default function RankingsScreen() {
  const { user } = useAuth()
  const [selectedSport, setSelectedSport] = useState("Futebol")
  const [rankingSport, setRankingSport] = useState("todos")

  // Fetch user's stats
  const { data: userStats, loading: statsLoading } = useDocument<UserStats>(
    "userStats",
    user?.id || null
  )

  // Live leaderboard: all users, ranked client-side (some docs may lack fields,
  // so we avoid Firestore orderBy and sort locally)
  const { data: allUsers, loading: rankingsLoading } = useCollection<User>("users", {
    realtime: true,
  })

  // Only users with public profiles appear in rankings
  const visibleUsers = useMemo(
    () => allUsers.filter((u) => u.privacy?.profileVisible !== false),
    [allUsers]
  )

  // Leaderboard for the selected sport filter
  const leaderboard = useMemo(() => {
    const filtered =
      rankingSport === "todos"
        ? visibleUsers
        : visibleUsers.filter((u) =>
            u.sports?.some((s) => s.toLowerCase() === rankingSport.toLowerCase())
          )
    return rankUsers(filtered)
  }, [visibleUsers, rankingSport])

  // Global rank info (used in "As Minhas Estatísticas")
  const userRankInfo = useMemo(() => {
    if (!user?.id) return { rank: "-" as number | string, totalPlayers: 0 }
    const board = rankUsers(visibleUsers)
    const idx = board.findIndex((u) => u.id === user.id)
    return {
      rank: idx >= 0 ? idx + 1 : ("-" as number | string),
      totalPlayers: board.length,
    }
  }, [visibleUsers, user?.id])

  // User's position within the currently filtered leaderboard
  const myLeaderboardRank = useMemo(() => {
    if (!user?.id) return null
    const idx = leaderboard.findIndex((u) => u.id === user.id)
    return idx >= 0 ? idx + 1 : null
  }, [leaderboard, user?.id])

  // Get stats for current sport
  const currentSportStats = useMemo(() => {
    if (!userStats?.sportStats) return null
    return userStats.sportStats[selectedSport] || userStats.sportStats[selectedSport.toLowerCase()] || null
  }, [userStats, selectedSport])

  if (statsLoading) {
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
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Rankings</h1>
        <p className="text-gray-600">Acompanha o teu progresso e vê os melhores jogadores</p>
      </div>

      <Tabs defaultValue="my-stats" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-stats">As Minhas Estatísticas</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
        </TabsList>

        <TabsContent value="my-stats" className="space-y-6">
          {/* Sport Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Selecionar Desporto</CardTitle>
              <CardDescription>Escolhe o desporto para veres as tuas estatísticas</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedSport} onValueChange={setSelectedSport}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Futebol">⚽ Futebol</SelectItem>
                  <SelectItem value="Ténis">🎾 Ténis</SelectItem>
                  <SelectItem value="Basquetebol">🏀 Basquetebol</SelectItem>
                  <SelectItem value="Padel">🏓 Padel</SelectItem>
                  <SelectItem value="Voleibol">🏐 Voleibol</SelectItem>
                  <SelectItem value="Futsal">⚽ Futsal</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Level Card */}
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-6 h-6" />
                Nível Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-4xl font-bold">Nível {userStats?.level || user?.level || 1}</div>
                  <p className="text-green-100">Sistema de Níveis JOGA</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">#{userRankInfo.rank}</div>
                  <p className="text-green-100">de {userRankInfo.totalPlayers.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vitórias</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {userStats?.wins || user?.wins || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline w-3 h-3 mr-1" />
                  Taxa: {userStats?.winRate?.toFixed(0) || 0}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {selectedSport.toLowerCase() === "ténis" || selectedSport.toLowerCase() === "tenis"
                    ? "Aces"
                    : selectedSport.toLowerCase() === "basquetebol" || selectedSport.toLowerCase() === "voleibol"
                      ? "Pontos"
                      : "Golos"}
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {currentSportStats?.goals || currentSportStats?.aces || currentSportStats?.points || user?.goals || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total na temporada
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assistências</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {currentSportStats?.assists || user?.assists || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total na temporada
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{userStats?.totalGames || user?.gamesPlayed || 0}</div>
                  <p className="text-xs text-muted-foreground">Jogos Totais</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{userStats?.totalHours || 0}h</div>
                  <p className="text-xs text-muted-foreground">Horas Jogadas</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-500">{userStats?.currentStreak || 0}</div>
                  <p className="text-xs text-muted-foreground">Streak Atual</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-500">{userStats?.bestStreak || 0}</div>
                  <p className="text-xs text-muted-foreground">Melhor Streak</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rankings" className="space-y-6">
          {/* Sport Filter */}
          <Card>
            <CardHeader>
              <CardTitle>Selecionar Desporto</CardTitle>
              <CardDescription>Filtra o ranking por desporto</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={rankingSport} onValueChange={setRankingSport}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">🏆 Todos os desportos</SelectItem>
                  <SelectItem value="Futebol">⚽ Futebol</SelectItem>
                  <SelectItem value="Ténis">🎾 Ténis</SelectItem>
                  <SelectItem value="Basquetebol">🏀 Basquetebol</SelectItem>
                  <SelectItem value="Padel">🏓 Padel</SelectItem>
                  <SelectItem value="Voleibol">🏐 Voleibol</SelectItem>
                  <SelectItem value="Futsal">⚽ Futsal</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {rankingsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-green-600" />
            </div>
          ) : leaderboard.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {rankingSport === "todos"
                      ? "Ainda não há jogadores no ranking"
                      : `Ainda não há jogadores de ${rankingSport} no ranking`}
                  </p>
                  <p className="text-sm text-gray-500">Joga partidas para apareceres aqui!</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Podium - top 3 */}
              <div className="grid grid-cols-3 gap-3 items-end">
                {[
                  { player: leaderboard[1], rank: 2 },
                  { player: leaderboard[0], rank: 1 },
                  { player: leaderboard[2], rank: 3 },
                ].map(({ player, rank }) =>
                  player ? (
                    <div key={player.id} className={rank === 1 ? "pb-4" : ""}>
                      <Card
                        className={`text-center border-2 ${medalStyles[rank].border} ${
                          player.id === user?.id ? "ring-2 ring-green-600" : ""
                        }`}
                      >
                        <CardContent className="pt-6 pb-4 px-2 flex flex-col items-center gap-2">
                          <div
                            className={`flex items-center justify-center w-8 h-8 rounded-full text-white font-bold ${medalStyles[rank].medal}`}
                          >
                            {rank}
                          </div>
                          <Avatar className={rank === 1 ? "w-16 h-16" : "w-12 h-12"}>
                            <AvatarImage src={player.photoURL} />
                            <AvatarFallback>{getInitials(player)}</AvatarFallback>
                          </Avatar>
                          <p className="font-semibold text-sm truncate w-full">
                            {player.displayName}
                          </p>
                          <Badge variant="outline">Nível {player.level || 1}</Badge>
                          <p className="text-lg font-bold text-green-600">
                            {player.points || 0} pts
                          </p>
                          <p className="text-xs text-gray-600">
                            {player.wins || 0}V-{player.losses || 0}D-{player.draws || 0}E
                          </p>
                          {(player.mvps || 0) > 0 && (
                            <p className="flex items-center gap-1 text-xs text-yellow-600">
                              <Crown className="w-3 h-3" /> {player.mvps} MVP
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div key={`empty-${rank}`} />
                  )
                )}
              </div>

              {/* Current user position summary */}
              {user && (
                <Card className="sticky top-2 z-10 border-green-600 bg-green-50">
                  <CardContent className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user.photoURL} />
                        <AvatarFallback>{getInitials(user)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-green-800">A tua posição</p>
                        <p className="text-xs text-green-700">
                          {myLeaderboardRank
                            ? `#${myLeaderboardRank} de ${leaderboard.length} jogadores`
                            : "Ainda não estás neste ranking"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">{user.points || 0}</p>
                      <p className="text-xs text-green-700">pontos</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Rest of the leaderboard */}
              {leaderboard.length > 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-green-600" />
                      Classificação
                    </CardTitle>
                    <CardDescription>
                      Os melhores jogadores da plataforma JOGA, em tempo real
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {leaderboard.slice(3).map((player, index) => {
                        const rank = index + 4
                        const isMe = player.id === user?.id
                        return (
                          <div
                            key={player.id}
                            className={`flex items-center justify-between p-3 rounded-lg border hover:shadow-md transition-shadow ${
                              isMe ? "border-green-600 bg-green-50" : ""
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-bold text-sm shrink-0">
                                {rank}
                              </div>
                              <Avatar className="w-10 h-10 shrink-0">
                                <AvatarImage src={player.photoURL} />
                                <AvatarFallback>{getInitials(player)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium truncate">
                                  {player.displayName}
                                  {isMe && (
                                    <Badge
                                      variant="outline"
                                      className="ml-2 text-green-600 border-green-600"
                                    >
                                      Tu
                                    </Badge>
                                  )}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    Nível {player.level || 1}
                                  </Badge>
                                  <span>
                                    {player.wins || 0}V-{player.losses || 0}D-
                                    {player.draws || 0}E
                                  </span>
                                  {(player.mvps || 0) > 0 && (
                                    <span className="flex items-center gap-0.5 text-yellow-600">
                                      <Crown className="w-3 h-3" />
                                      {player.mvps}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <p className="text-lg font-bold text-green-600 shrink-0">
                              {player.points || 0} pts
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
