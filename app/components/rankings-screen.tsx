"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trophy, Target, Users, TrendingUp, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/contexts/AuthContext"
import { useQuery, useDocument } from "@/hooks/useFirestore"
import { Ranking, UserStats } from "@/lib/types"

export default function RankingsScreen() {
  const { user } = useAuth()
  const [selectedSport, setSelectedSport] = useState("Futebol")

  // Fetch user's stats
  const { data: userStats, loading: statsLoading } = useDocument<UserStats>(
    "userStats",
    user?.id || null
  )

  // Fetch rankings for selected sport
  const { data: rankings, loading: rankingsLoading } = useQuery<Ranking>(
    "rankings",
    [{ field: "sport", operator: "==", value: selectedSport }],
    { enabled: true, realtime: true }
  )

  // Sort rankings by rank
  const sortedRankings = useMemo(() => {
    if (!rankings) return []
    return [...rankings].sort((a, b) => a.rank - b.rank)
  }, [rankings])

  // Calculate user rank info
  const userRankInfo = useMemo(() => {
    if (!rankings || !user?.id) return { rank: "-", totalPlayers: 0 }
    const userRanking = rankings.find(r => r.userId === user.id)
    return {
      rank: userRanking?.rank || "-",
      totalPlayers: rankings.length
    }
  }, [rankings, user?.id])

  // Get stats for current sport
  const currentSportStats = useMemo(() => {
    if (!userStats?.sportStats) return null
    return userStats.sportStats[selectedSport.toLowerCase()] || null
  }, [userStats, selectedSport])

  const getSportIcon = (sport: string) => {
    switch (sport.toLowerCase()) {
      case "futebol":
        return "⚽"
      case "ténis":
      case "tenis":
        return "🎾"
      case "basquetebol":
        return "🏀"
      case "padel":
        return "🏓"
      case "voleibol":
        return "🏐"
      case "futsal":
        return "⚽"
      default:
        return "⚽"
    }
  }

  const getSportStats = (player: Ranking, sport: string) => {
    const sportLower = sport.toLowerCase()
    switch (sportLower) {
      case "futebol":
      case "futsal":
        return (
          <div className="text-xs text-gray-600 space-y-1">
            <div>
              {player.goals || 0} golos • {player.assists || 0} assistências
            </div>
            <div>
              {player.wins}V - {player.losses}D
            </div>
          </div>
        )
      case "ténis":
      case "tenis":
        return (
          <div className="text-xs text-gray-600 space-y-1">
            <div>
              {player.aces || 0} aces • {player.points || 0} pontos
            </div>
            <div>
              {player.wins}V - {player.losses}D
            </div>
          </div>
        )
      case "basquetebol":
        return (
          <div className="text-xs text-gray-600 space-y-1">
            <div>
              {player.points || 0} pontos • {player.assists || 0} assistências
            </div>
            <div>
              {player.wins}V - {player.losses}D
            </div>
          </div>
        )
      case "padel":
        return (
          <div className="text-xs text-gray-600 space-y-1">
            <div>
              {player.winners || 0} winners • {player.points || 0} pontos
            </div>
            <div>
              {player.wins}V - {player.losses}D
            </div>
          </div>
        )
      case "voleibol":
        return (
          <div className="text-xs text-gray-600 space-y-1">
            <div>
              {player.points || 0} pontos • {player.blocks || 0} bloqueios
            </div>
            <div>
              {player.wins}V - {player.losses}D
            </div>
          </div>
        )
      default:
        return (
          <div className="text-xs text-gray-600">
            {player.wins}V - {player.losses}D
          </div>
        )
    }
  }

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
                  <p className="text-green-100">Faceit Level System</p>
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
          {/* Sport Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Selecionar Desporto</CardTitle>
              <CardDescription>Escolhe o desporto para ver os melhores jogadores</CardDescription>
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

          {/* Rankings List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getSportIcon(selectedSport)} Top Jogadores - {selectedSport}
              </CardTitle>
              <CardDescription>Os melhores jogadores de {selectedSport} da plataforma JOGA!</CardDescription>
            </CardHeader>
            <CardContent>
              {rankingsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                </div>
              ) : sortedRankings.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Ainda não há rankings para {selectedSport}</p>
                  <p className="text-sm text-gray-500">Joga partidas ranqueadas para aparecer aqui!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedRankings.map((player) => (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between p-4 rounded-lg border hover:shadow-md transition-shadow ${
                        player.userId === user?.id ? "bg-green-50 border-green-200" : ""
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-white ${
                            player.rank === 1
                              ? "bg-yellow-500"
                              : player.rank === 2
                                ? "bg-gray-400"
                                : player.rank === 3
                                  ? "bg-amber-600"
                                  : "bg-gray-300 text-gray-700"
                          }`}
                        >
                          {player.rank}
                        </div>
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={player.userPhoto} />
                          <AvatarFallback>
                            {player.userName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-lg">
                            {player.userName}
                            {player.userId === user?.id && (
                              <Badge variant="outline" className="ml-2 text-green-600 border-green-600">
                                Tu
                              </Badge>
                            )}
                          </p>
                          {getSportStats(player, selectedSport)}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-2">
                          Nível {player.level}
                        </Badge>
                        <p className="text-lg font-bold text-green-600">{player.rating} pts</p>
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
