"use client"

import { useState, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  MapPin,
  Users,
  Star,
  Euro,
  Calendar,
  Loader2,
  ArrowLeft,
  Edit2,
  Trophy,
  UserPlus,
  UserMinus,
  X,
  Plus,
  Zap,
  Crown,
} from "lucide-react"
import { useAuth } from "@/lib/contexts/AuthContext"
import { useDocument } from "@/hooks/useFirestore"
import {
  joinMatch,
  leaveMatch,
  addGuestToMatch,
  removeParticipantAt,
  completeMatchWithStats,
  cancelMatch,
} from "@/lib/firebase/matchService"
import { Match } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import DashboardLayout from "@/app/components/dashboard-layout"

interface RosterEntry {
  id: string // user id, "" for guests added by name
  name: string
}

export default function GameDetailPage() {
  const params = useParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const gameId = params.id as string

  // Fetch game data
  const { data: game, loading, error, refresh } = useDocument<Match>("matches", gameId)

  // Dialogs state
  const [editResultDialogOpen, setEditResultDialogOpen] = useState(false)
  const [addParticipantDialogOpen, setAddParticipantDialogOpen] = useState(false)
  const [joiningMatch, setJoiningMatch] = useState(false)
  const [leavingMatch, setLeavingMatch] = useState(false)
  const [cancellingMatch, setCancellingMatch] = useState(false)
  const [savingResult, setSavingResult] = useState(false)
  const [addingParticipant, setAddingParticipant] = useState(false)

  // Result form state
  const [editForm, setEditForm] = useState({
    hasHappened: false,
    resultScore: "",
    resultWinner: "" as "team1" | "team2" | "draw" | "",
    resultNotes: "",
    mvpIndex: -1,
  })
  const [teamAssignments, setTeamAssignments] = useState<Record<string, "team1" | "team2">>({})

  // New participant form
  const [newParticipantName, setNewParticipantName] = useState("")

  // The roster arrays are index-aligned: participantNames[i] belongs to
  // participants[i], where "" marks a guest without an account.
  const roster: RosterEntry[] = useMemo(() => {
    if (!game) return []
    const size = Math.max(game.participants?.length ?? 0, game.participantNames?.length ?? 0)
    const entries: RosterEntry[] = []
    for (let i = 0; i < size; i++) {
      entries.push({
        id: game.participants?.[i] ?? "",
        name: game.participantNames?.[i] ?? game.participants?.[i] ?? "Jogador",
      })
    }
    // Legacy matches may not have the organizer in the roster
    if (entries.length === 0 && game.organizer) {
      entries.push({ id: game.organizerId, name: game.organizer })
    }
    return entries
  }, [game])

  const isOrganizer = !!user?.id && game?.organizerId === user.id
  const hasJoined = !!user?.id && roster.some((p) => p.id === user.id)
  const canEdit = !!user?.id && !!game && (isOrganizer || (!!game.hasHappened && hasJoined))
  const registeredPlayers = roster.length

  const calculatePricePerPerson = (totalPrice: number, totalPlayers: number): string => {
    if (totalPlayers <= 0) return "0.00"
    return (totalPrice / totalPlayers).toFixed(2)
  }

  const handleOpenEditDialog = () => {
    if (!game) return
    const mvpIndex = roster.findIndex(
      (p) => (game.result?.mvpId && p.id === game.result.mvpId) || (game.result?.mvp && p.name === game.result.mvp)
    )
    setEditForm({
      hasHappened: game.hasHappened || false,
      resultScore: game.result?.score || "",
      resultWinner: game.result?.winner || "",
      resultNotes: game.result?.notes || "",
      mvpIndex,
    })
    setTeamAssignments(game.teams || {})
    setEditResultDialogOpen(true)
  }

  const handleSaveResult = async () => {
    if (!game?.id) return

    setSavingResult(true)
    try {
      if (editForm.hasHappened) {
        const mvpEntry = editForm.mvpIndex >= 0 ? roster[editForm.mvpIndex] : undefined
        await completeMatchWithStats(game.id, {
          score: editForm.resultScore,
          winner: editForm.resultWinner || "draw",
          notes: editForm.resultNotes,
          mvp: mvpEntry?.name,
          mvpId: mvpEntry?.id,
          teams: teamAssignments,
        })
        toast({
          title: "Resultado guardado",
          description: game.statsApplied
            ? "O resultado do jogo foi atualizado."
            : "Resultado guardado e estatísticas dos jogadores atualizadas!",
        })
      } else {
        // Nothing to complete — the game simply hasn't happened yet.
        setEditResultDialogOpen(false)
        setSavingResult(false)
        return
      }

      setEditResultDialogOpen(false)
      refresh()
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Não foi possível guardar o resultado.",
        variant: "destructive",
      })
    } finally {
      setSavingResult(false)
    }
  }

  const handleJoinMatch = async () => {
    if (!user || !game?.id) return

    setJoiningMatch(true)
    try {
      await joinMatch(game.id, user)
      toast({
        title: "Inscrição confirmada!",
        description: "Juntaste-te ao jogo com sucesso.",
      })
      refresh()
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Não foi possível inscrever-te no jogo.",
        variant: "destructive",
      })
    } finally {
      setJoiningMatch(false)
    }
  }

  const handleLeaveMatch = async () => {
    if (!user?.id || !game?.id) return

    setLeavingMatch(true)
    try {
      await leaveMatch(game.id, user.id)
      toast({
        title: "Saíste do jogo",
        description: "A tua vaga foi libertada.",
      })
      refresh()
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Não foi possível sair do jogo.",
        variant: "destructive",
      })
    } finally {
      setLeavingMatch(false)
    }
  }

  const handleCancelMatch = async () => {
    if (!user?.id || !game?.id) return

    setCancellingMatch(true)
    try {
      await cancelMatch(game.id, user.id)
      toast({
        title: "Jogo cancelado",
        description: "Os participantes foram notificados.",
      })
      refresh()
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Não foi possível cancelar o jogo.",
        variant: "destructive",
      })
    } finally {
      setCancellingMatch(false)
    }
  }

  const handleAddParticipant = async () => {
    if (!game?.id || !newParticipantName.trim()) return

    setAddingParticipant(true)
    try {
      await addGuestToMatch(game.id, newParticipantName)
      toast({
        title: "Participante adicionado",
        description: `${newParticipantName} foi adicionado ao jogo.`,
      })
      setNewParticipantName("")
      setAddParticipantDialogOpen(false)
      refresh()
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Não foi possível adicionar o participante.",
        variant: "destructive",
      })
    } finally {
      setAddingParticipant(false)
    }
  }

  const handleRemoveParticipant = async (index: number) => {
    if (!game?.id || !isOrganizer) return

    try {
      await removeParticipantAt(game.id, index)
      toast({
        title: "Participante removido",
        description: "O participante foi removido do jogo.",
      })
      refresh()
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Não foi possível remover o participante.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-2" />
            <p className="text-gray-600">A carregar jogo...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !game) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-4xl mx-auto">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-6 text-center">
              <p className="text-red-600 mb-4">Erro ao carregar o jogo ou jogo não encontrado.</p>
              <Link href="/app">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  const pricePerPerson = calculatePricePerPerson(game.totalPrice || 0, game.totalPlayers)
  const registeredRoster = roster.filter((p) => p.id !== "")

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/app" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao MatchMaking
        </Link>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              {game.sport}
              {game.mode === "ranked" && (
                <Badge className="bg-yellow-100 text-yellow-800 text-sm">
                  <Zap className="w-4 h-4 mr-1" />
                  Arranca
                </Badge>
              )}
              {game.mode === "local" && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-sm">
                  Local
                </Badge>
              )}
            </h1>
            <p className="text-gray-600 mt-1">
              Organizado por <span className="font-medium">{game.organizer}</span>
            </p>
          </div>

          {/* Status Badge */}
          <div className="text-right">
            {game.hasHappened ? (
              <Badge className="bg-blue-100 text-blue-800 text-lg px-4 py-2">
                <Trophy className="w-5 h-5 mr-2" />
                Concluído
              </Badge>
            ) : game.status === "full" ? (
              <Badge className="bg-orange-100 text-orange-800 text-lg px-4 py-2">Lotado</Badge>
            ) : game.status === "cancelled" ? (
              <Badge className="bg-red-100 text-red-800 text-lg px-4 py-2">Cancelado</Badge>
            ) : (
              <Badge className="bg-green-100 text-green-800 text-lg px-4 py-2">Aberto</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Informações do Jogo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Date & Time */}
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-500 mt-1" />
              <div>
                <p className="font-medium">Data e Hora</p>
                <p className="text-gray-600">
                  {new Date(game.date).toLocaleDateString("pt-PT", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="text-gray-600">
                  às {game.time} · {game.duration || 60} min
                </p>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-500 mt-1" />
              <div>
                <p className="font-medium">Local</p>
                <p className="text-gray-600">{game.venueName || game.location}</p>
                {game.venue && game.venue !== game.venueName && (
                  <p className="text-sm text-gray-500">{game.venue}</p>
                )}
              </div>
            </div>

            {/* Level */}
            <div className="flex items-start gap-3">
              <Star className="w-5 h-5 text-gray-500 mt-1" />
              <div>
                <p className="font-medium">Nível</p>
                <p className="text-gray-600">{game.level}</p>
                {game.mode === "ranked" && game.minLevel && (
                  <p className="text-sm text-gray-500">Nível mínimo: {game.minLevel}</p>
                )}
              </div>
            </div>

            {/* Players */}
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-gray-500 mt-1" />
              <div>
                <p className="font-medium">Jogadores</p>
                <p className="text-gray-600">
                  {registeredPlayers}/{game.totalPlayers} inscritos
                </p>
                <p className="text-sm text-gray-500">
                  {game.playersNeeded > 0 ? `Faltam ${game.playersNeeded} jogadores` : "Equipa completa"}
                </p>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-start gap-3">
              <Euro className="w-5 h-5 text-gray-500 mt-1" />
              <div>
                <p className="font-medium">Preço</p>
                <p className="text-green-600 font-semibold text-lg">{pricePerPerson}€ / pessoa</p>
                <p className="text-sm text-gray-500">Total: {game.totalPrice}€</p>
              </div>
            </div>

            {/* Ranked Points */}
            {game.mode === "ranked" && game.rankPoints && (
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-yellow-500 mt-1" />
                <div>
                  <p className="font-medium">Pontos Rank</p>
                  <p className="text-yellow-600 font-semibold">+{game.rankPoints} pts</p>
                </div>
              </div>
            )}
          </div>

          {/* Join Button (for non-participants) */}
          {!hasJoined && game.status === "open" && !game.hasHappened && (
            <div className="mt-6 pt-6 border-t">
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
                onClick={handleJoinMatch}
                disabled={
                  joiningMatch ||
                  (game.mode === "ranked" && (user?.level ?? 0) < (game.minLevel ?? 0))
                }
              >
                {joiningMatch ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    A inscrever...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" />
                    Juntar-me a este jogo
                  </>
                )}
              </Button>
              {game.mode === "ranked" && (user?.level ?? 0) < (game.minLevel ?? 0) && (
                <p className="text-sm text-red-500 mt-2 text-center">
                  Precisas de nível {game.minLevel} para participar neste jogo Arranca.
                </p>
              )}
            </div>
          )}

          {/* Cancel button (organizer, before completion) */}
          {isOrganizer && !game.hasHappened && game.status !== "cancelled" && (
            <div className="mt-6 pt-6 border-t">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    disabled={cancellingMatch}
                  >
                    {cancellingMatch ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <X className="w-5 h-5 mr-2" />
                    )}
                    Cancelar jogo
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancelar este jogo?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Todos os jogadores inscritos vão ser notificados. Esta ação não pode ser revertida.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700"
                      onClick={handleCancelMatch}
                    >
                      Sim, cancelar jogo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {/* Leave button (participants who are not the organizer) */}
          {hasJoined && !isOrganizer && !game.hasHappened && game.status !== "cancelled" && (
            <div className="mt-6 pt-6 border-t">
              <Button
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={handleLeaveMatch}
                disabled={leavingMatch}
              >
                {leavingMatch ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    A sair...
                  </>
                ) : (
                  <>
                    <UserMinus className="w-5 h-5 mr-2" />
                    Sair deste jogo
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Participants Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Participantes ({registeredPlayers}/{game.totalPlayers})</CardTitle>
            {isOrganizer && !game.hasHappened && game.playersNeeded > 0 && (
              <Button variant="outline" size="sm" onClick={() => setAddParticipantDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            )}
          </div>
          <CardDescription>Lista de jogadores inscritos neste jogo</CardDescription>
        </CardHeader>
        <CardContent>
          {roster.length > 0 ? (
            <div className="space-y-3">
              {roster.map((participant, index) => {
                const isEntryOrganizer =
                  participant.id === game.organizerId ||
                  (participant.id === "" && index === 0 && participant.name === game.organizer)
                const isMvp =
                  !!game.result?.mvp &&
                  (game.result.mvpId
                    ? participant.id === game.result.mvpId && participant.id !== ""
                    : participant.name === game.result.mvp)
                return (
                  <div
                    key={`${participant.id}-${index}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {participant.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          {participant.name}
                          {isMvp && (
                            <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                              <Crown className="w-3 h-3 mr-1" />
                              MVP
                            </Badge>
                          )}
                        </p>
                        <div className="flex gap-1">
                          {isEntryOrganizer && (
                            <Badge variant="outline" className="text-xs">
                              Organizador
                            </Badge>
                          )}
                          {participant.id === "" && !isEntryOrganizer && (
                            <Badge variant="outline" className="text-xs text-gray-500">
                              Convidado
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {isOrganizer && !isEntryOrganizer && !game.hasHappened && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRemoveParticipant(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              Ainda não há participantes inscritos.
            </p>
          )}

          {/* Empty slots */}
          {game.playersNeeded > 0 && (
            <div className="mt-4 space-y-2">
              {Array.from({ length: Math.min(game.playersNeeded, 5) }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-400"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <span>Vaga disponível</span>
                </div>
              ))}
              {game.playersNeeded > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  +{game.playersNeeded - 5} vagas disponíveis
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result Card (if game has happened or user can edit) */}
      {(game.hasHappened || canEdit) && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Resultado do Jogo
              </CardTitle>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={handleOpenEditDialog}>
                  <Edit2 className="w-4 h-4 mr-1" />
                  Editar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {game.hasHappened && game.result ? (
              <div className="space-y-4">
                {game.result.score && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Resultado</p>
                    <p className="text-3xl font-bold text-gray-900">{game.result.score}</p>
                  </div>
                )}
                {game.result.winner && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Vencedor</p>
                    <Badge
                      className={
                        game.result.winner === "team1"
                          ? "bg-blue-100 text-blue-800"
                          : game.result.winner === "team2"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }
                    >
                      {game.result.winner === "team1"
                        ? "Equipa 1"
                        : game.result.winner === "team2"
                        ? "Equipa 2"
                        : "Empate"}
                    </Badge>
                  </div>
                )}
                {game.result.mvp && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">MVP do Jogo</p>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      <Crown className="w-4 h-4 mr-1" />
                      {game.result.mvp}
                    </Badge>
                  </div>
                )}
                {game.result.notes && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Notas</p>
                    <p className="text-gray-700">{game.result.notes}</p>
                  </div>
                )}
                {game.statsApplied && (
                  <p className="text-xs text-gray-400">
                    As estatísticas dos jogadores registados foram atualizadas com este resultado.
                  </p>
                )}
              </div>
            ) : game.hasHappened ? (
              <p className="text-gray-500">O jogo terminou mas ainda não foi inserido o resultado.</p>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 mb-3">
                  Este jogo ainda não aconteceu. Marca-o como concluído para inserir o resultado.
                </p>
                {canEdit && (
                  <Button variant="outline" onClick={handleOpenEditDialog}>
                    <Edit2 className="w-4 h-4 mr-1" />
                    Marcar como concluído
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Result Dialog */}
      <Dialog open={editResultDialogOpen} onOpenChange={setEditResultDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Resultado</DialogTitle>
            <DialogDescription>
              Marca o jogo como concluído e insere o resultado final. As estatísticas dos
              jogadores registados são atualizadas automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Game Completed Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasHappened"
                checked={editForm.hasHappened}
                disabled={game.statsApplied}
                onCheckedChange={(checked: boolean | "indeterminate") =>
                  setEditForm({ ...editForm, hasHappened: checked === true })
                }
              />
              <Label htmlFor="hasHappened" className="font-medium">
                Este jogo já aconteceu
              </Label>
            </div>
            {game.statsApplied && (
              <p className="text-xs text-gray-500">
                As estatísticas já foram aplicadas — o jogo não pode voltar a &quot;por acontecer&quot;.
              </p>
            )}

            {/* Conditional Result Fields */}
            {editForm.hasHappened && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <Label>Resultado</Label>
                  <Input
                    placeholder="Ex: 3-2, 6-4 6-3"
                    value={editForm.resultScore}
                    onChange={(e) => setEditForm({ ...editForm, resultScore: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Vencedor</Label>
                  <Select
                    value={editForm.resultWinner}
                    onValueChange={(v) =>
                      setEditForm({ ...editForm, resultWinner: v as "team1" | "team2" | "draw" | "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleciona o vencedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team1">Equipa 1</SelectItem>
                      <SelectItem value="team2">Equipa 2</SelectItem>
                      <SelectItem value="draw">Empate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Team assignment — needed to credit wins/losses per player */}
                {(editForm.resultWinner === "team1" || editForm.resultWinner === "team2") &&
                  registeredRoster.length > 0 && (
                    <div className="space-y-2">
                      <Label>Equipas</Label>
                      <p className="text-xs text-gray-500">
                        Atribui cada jogador registado a uma equipa para contabilizar vitórias e derrotas.
                      </p>
                      <div className="space-y-2">
                        {registeredRoster.map((p) => (
                          <div key={p.id} className="flex items-center justify-between gap-2">
                            <span className="text-sm truncate">{p.name}</span>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant={teamAssignments[p.id] === "team1" ? "default" : "outline"}
                                className={teamAssignments[p.id] === "team1" ? "bg-blue-600 hover:bg-blue-700" : ""}
                                onClick={() =>
                                  setTeamAssignments({ ...teamAssignments, [p.id]: "team1" })
                                }
                              >
                                Equipa 1
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={teamAssignments[p.id] === "team2" ? "default" : "outline"}
                                className={teamAssignments[p.id] === "team2" ? "bg-red-600 hover:bg-red-700" : ""}
                                onClick={() =>
                                  setTeamAssignments({ ...teamAssignments, [p.id]: "team2" })
                                }
                              >
                                Equipa 2
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* MVP selection */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    MVP do Jogo
                  </Label>
                  <Select
                    value={editForm.mvpIndex >= 0 ? String(editForm.mvpIndex) : "none"}
                    onValueChange={(v) =>
                      setEditForm({ ...editForm, mvpIndex: v === "none" ? -1 : Number(v) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleciona o melhor jogador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem MVP</SelectItem>
                      {roster.map((p, i) => (
                        <SelectItem key={`${p.id}-${i}`} value={String(i)}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Notas do Jogo</Label>
                  <Textarea
                    placeholder="Observações sobre o jogo..."
                    value={editForm.resultNotes}
                    onChange={(e) => setEditForm({ ...editForm, resultNotes: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditResultDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleSaveResult}
              disabled={savingResult}
            >
              {savingResult ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Participant Dialog */}
      <Dialog open={addParticipantDialogOpen} onOpenChange={setAddParticipantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Participante</DialogTitle>
            <DialogDescription>
              Adiciona um jogador que já confirmou presença neste jogo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Participante</Label>
              <Input
                placeholder="Nome do jogador"
                value={newParticipantName}
                onChange={(e) => setNewParticipantName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddParticipantDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleAddParticipant}
              disabled={addingParticipant || !newParticipantName.trim()}
            >
              {addingParticipant ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  )
}
