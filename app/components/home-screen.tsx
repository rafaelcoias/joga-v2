"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Zap,
  Trophy,
  MapPin,
  Clock,
  Users,
  Crown,
  Flame,
  CalendarDays,
  BarChart3,
  ArrowRight,
  AlertTriangle,
} from "lucide-react"
import { useAuth } from "@/lib/contexts/AuthContext"
import { useQuery } from "@/hooks/useFirestore"
import { Match, MatchHistory } from "@/lib/types"

interface HomeScreenProps {
  onNavigate?: (screen: string) => void
}

export default function HomeScreen({ onNavigate }: HomeScreenProps) {
  const { user } = useAuth()

  const { data: myMatches } = useQuery<Match>(
    "matches",
    [{ field: "participants", operator: "array-contains", value: user?.id || "" }],
    { enabled: !!user?.id, realtime: true }
  )

  const { data: history } = useQuery<MatchHistory>(
    "matchHistory",
    [{ field: "userId", operator: "==", value: user?.id || "" }],
    { enabled: !!user?.id, realtime: true }
  )

  const today = new Date().toISOString().slice(0, 10)

  // Next upcoming game the user is part of
  const nextGame = useMemo(() => {
    if (!myMatches) return null
    return (
      [...myMatches]
        .filter((m) => !m.hasHappened && m.status !== "cancelled" && m.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))[0] ?? null
    )
  }, [myMatches, today])

  // Games organized by the user that already happened but have no result yet
  const pendingResults = useMemo(() => {
    if (!myMatches || !user?.id) return []
    return myMatches.filter(
      (m) =>
        m.organizerId === user.id &&
        !m.hasHappened &&
        m.status !== "cancelled" &&
        m.date < today
    )
  }, [myMatches, user?.id, today])

  // Last 5 results, most recent first (W/L/D form guide)
  const recentForm = useMemo(() => {
    if (!history) return []
    return [...history]
      .sort((a, b) => {
        const sa = (a.createdAt as { seconds?: number })?.seconds || 0
        const sb = (b.createdAt as { seconds?: number })?.seconds || 0
        return sb - sa
      })
      .slice(0, 5)
  }, [history])

  const winRate = user?.gamesPlayed
    ? Math.round(((user.wins || 0) / user.gamesPlayed) * 100)
    : 0

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 7) return "Boa madrugada"
    if (h < 13) return "Bom dia"
    if (h < 20) return "Boa tarde"
    return "Boa noite"
  })()

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {greeting}, {user?.firstName || "atleta"}! 👋
        </h1>
        <p className="text-gray-600 mt-1">
          {nextGame
            ? "Tens jogo marcado — prepara-te!"
            : "Pronto para o próximo jogo? Descobre jogos perto de ti."}
        </p>
      </div>

      {/* Pending results alert */}
      {pendingResults.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
              <p className="text-sm text-yellow-800">
                Tens {pendingResults.length}{" "}
                {pendingResults.length === 1 ? "jogo à espera" : "jogos à espera"} de resultado.
                Insere-o para atualizar as estatísticas de todos.
              </p>
            </div>
            <Link href={`/app/game/${pendingResults[0].id}`} className="shrink-0">
              <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-white">
                Inserir resultado
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{user?.gamesPlayed || 0}</p>
            <p className="text-sm text-gray-500">Jogos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{winRate}%</p>
            <p className="text-sm text-gray-500">Vitórias</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600 flex items-center justify-center gap-1">
              <Crown className="w-5 h-5" />
              {user?.mvps || 0}
            </p>
            <p className="text-sm text-gray-500">MVPs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">Nv. {user?.level || 1}</p>
            <p className="text-sm text-gray-500">{user?.points || 0} pontos</p>
          </CardContent>
        </Card>
      </div>

      {/* Next game */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-green-600" />
            Próximo Jogo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nextGame ? (
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-lg text-gray-900">{nextGame.sport}</span>
                  {nextGame.mode === "ranked" && (
                    <Badge className="bg-yellow-100 text-yellow-800">
                      <Zap className="w-3 h-3 mr-1" />
                      Arranca
                    </Badge>
                  )}
                  {nextGame.organizerId === user?.id && (
                    <Badge variant="outline" className="text-xs">Organizador</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-2 flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {nextGame.venueName || nextGame.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {new Date(nextGame.date).toLocaleDateString("pt-PT", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}{" "}
                    às {nextGame.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {nextGame.totalPlayers - nextGame.playersNeeded}/{nextGame.totalPlayers}
                  </span>
                </p>
              </div>
              <Link href={`/app/game/${nextGame.id}`} className="shrink-0">
                <Button className="bg-green-600 hover:bg-green-700">
                  Ver jogo
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500 mb-4">Não tens jogos marcados.</p>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => onNavigate?.("matchmaking")}
              >
                <Flame className="w-4 h-4 mr-2" />
                Descobrir jogos
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent form */}
      {recentForm.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              Forma Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {recentForm.map((m) => (
                <div
                  key={m.id}
                  title={`${m.sport} — ${new Date(m.date).toLocaleDateString("pt-PT")}`}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                    m.result === "win"
                      ? "bg-green-500"
                      : m.result === "loss"
                        ? "bg-red-500"
                        : "bg-gray-400"
                  }`}
                >
                  {m.result === "win" ? "V" : m.result === "loss" ? "D" : "E"}
                </div>
              ))}
              <button
                onClick={() => onNavigate?.("history")}
                className="ml-2 text-sm text-green-600 hover:text-green-700 font-medium"
              >
                Ver histórico →
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate?.("matchmaking")}
          className="text-left rounded-xl border bg-gradient-to-br from-green-600 to-emerald-500 text-white p-5 hover:shadow-lg transition-shadow"
        >
          <Flame className="w-6 h-6 mb-2" />
          <p className="font-semibold">Descobrir Jogos</p>
          <p className="text-sm text-white/80">Desliza e junta-te num toque</p>
        </button>
        <button
          onClick={() => onNavigate?.("venues")}
          className="text-left rounded-xl border bg-white p-5 hover:shadow-lg transition-shadow"
        >
          <MapPin className="w-6 h-6 mb-2 text-green-600" />
          <p className="font-semibold text-gray-900">Reservar Campo</p>
          <p className="text-sm text-gray-500">Encontra arenas perto de ti</p>
        </button>
        <button
          onClick={() => onNavigate?.("rankings")}
          className="text-left rounded-xl border bg-white p-5 hover:shadow-lg transition-shadow"
        >
          <Trophy className="w-6 h-6 mb-2 text-yellow-500" />
          <p className="font-semibold text-gray-900">Rankings</p>
          <p className="text-sm text-gray-500">Vê a tua posição na comunidade</p>
        </button>
      </div>
    </div>
  )
}
