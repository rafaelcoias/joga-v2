"use client"

import { useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  MapPin,
  Clock,
  Users,
  Star,
  Euro,
  Calendar,
  Loader2,
  ArrowLeft,
  Edit2,
  Trophy,
  UserPlus,
  X,
  Plus,
  Zap,
} from "lucide-react"
import { useAuth } from "@/lib/contexts/AuthContext"
import { useDocument, useCRUD } from "@/hooks/useFirestore"
import { Match } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import DashboardLayout from "@/app/components/dashboard-layout"

export default function GameDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const gameId = params.id as string

  // Fetch game data
  const { data: game, loading, error, refresh } = useDocument<Match>("matches", gameId)

  // CRUD operations
  const { update: updateMatch, loading: updateLoading } = useCRUD<Match>("matches")

  // Edit dialogs state
  const [editResultDialogOpen, setEditResultDialogOpen] = useState(false)
  const [addParticipantDialogOpen, setAddParticipantDialogOpen] = useState(false)
  const [joiningMatch, setJoiningMatch] = useState(false)

  // Edit form state
  const [editForm, setEditForm] = useState({
    hasHappened: false,
    resultScore: "",
    resultWinner: "" as "team1" | "team2" | "draw" | "",
    resultNotes: "",
  })

  // New participant form
  const [newParticipantName, setNewParticipantName] = useState("")

  // Helper to calculate price per person
  const calculatePricePerPerson = (totalPrice: number, totalPlayers: number): string => {
    if (totalPlayers <= 0) return "0.00"
    return (totalPrice / totalPlayers).toFixed(2)
  }

  // Check if current user is organizer
  const isOrganizer = useMemo(() => {
    return user?.id && game?.organizerId === user.id
  }, [user?.id, game?.organizerId])

  // Check if current user can edit (organizer or participant after game)
  const canEdit = useMemo(() => {
    if (!user?.id || !game) return false
    return isOrganizer || (game.hasHappened && game.participants?.includes(user.id))
  }, [user?.id, game, isOrganizer])

  // Check if user already joined
  const hasJoined = useMemo(() => {
    return user?.id && game?.participants?.includes(user.id)
  }, [user?.id, game?.participants])

  // Initialize edit form when opening dialog
  const handleOpenEditDialog = () => {
    if (game) {
      setEditForm({
        hasHappened: game.hasHappened || false,
        resultScore: game.result?.score || "",
        resultWinner: game.result?.winner || "",
        resultNotes: game.result?.notes || "",
      })
      setEditResultDialogOpen(true)
    }
  }

  // Save result
  const handleSaveResult = async () => {
    if (!game?.id) return

    try {
      await updateMatch(game.id, {
        hasHappened: editForm.hasHappened,
        ...(editForm.hasHappened
          ? {
              result: {
                score: editForm.resultScore,
                winner: editForm.resultWinner || undefined,
                notes: editForm.resultNotes,
              },
              status: "completed" as const,
            }
          : {
              result: undefined,
            }),
      })

      toast({
        title: "Resultado guardado",
        description: "O resultado do jogo foi atualizado com sucesso.",
      })

      setEditResultDialogOpen(false)
      refresh()
    } catch {
      toast({
        title: "Erro",
        description: "Nao foi possivel guardar o resultado.",
        variant: "destructive",
      })
    }
  }

  // Join match
  const handleJoinMatch = async () => {
    if (!user?.id || !game) return

    setJoiningMatch(true)

    try {
      // Check if already joined
      if (game.participants?.includes(user.id)) {
        toast({
          title: "Ja inscrito",
          description: "Ja estas inscrito neste jogo.",
        })
        return
      }

      // Check if match is full
      const currentPlayers = game.participants?.length || 0
      if (currentPlayers >= game.totalPlayers) {
        toast({
          title: "Jogo cheio",
          description: "Este jogo ja esta completo.",
          variant: "destructive",
        })
        return
      }

      // Add user to participants
      const newParticipants = [...(game.participants || []), user.id]
      const newParticipantNames = [
        ...(game.participantNames || []),
        user.displayName || `${user.firstName} ${user.lastName}`,
      ]
      const newPlayersNeeded = game.playersNeeded - 1

      await updateMatch(game.id, {
        participants: newParticipants,
        participantNames: newParticipantNames,
        playersNeeded: newPlayersNeeded,
        status: newPlayersNeeded <= 0 ? "full" : "open",
      })

      toast({
        title: "Inscricao confirmada!",
        description: "Juntaste-te ao jogo com sucesso.",
      })

      refresh()
    } catch {
      toast({
        title: "Erro",
        description: "Nao foi possivel inscrever-te no jogo.",
        variant: "destructive",
      })
    } finally {
      setJoiningMatch(false)
    }
  }

  // Add participant (by organizer)
  const handleAddParticipant = async () => {
    if (!game?.id || !newParticipantName.trim()) return

    try {
      // Ensure organizer is always first in the list
      // If participantNames is empty/undefined, start with organizer
      let existingNames = game.participantNames || []
      if (existingNames.length === 0 && game.organizer) {
        existingNames = [game.organizer]
      }

      // Add new participant at the end (never at index 0)
      const newParticipantNames = [...existingNames, newParticipantName.trim()]
      const newPlayersNeeded = Math.max(0, game.playersNeeded - 1)

      await updateMatch(game.id, {
        participantNames: newParticipantNames,
        playersNeeded: newPlayersNeeded,
        status: newPlayersNeeded <= 0 ? "full" : "open",
      })

      toast({
        title: "Participante adicionado",
        description: `${newParticipantName} foi adicionado ao jogo.`,
      })

      setNewParticipantName("")
      setAddParticipantDialogOpen(false)
      refresh()
    } catch {
      toast({
        title: "Erro",
        description: "Nao foi possivel adicionar o participante.",
        variant: "destructive",
      })
    }
  }

  // Remove participant (by organizer)
  const handleRemoveParticipant = async (index: number) => {
    if (!game?.id || !isOrganizer) return

    // Don't remove the organizer (first participant)
    if (index === 0) {
      toast({
        title: "Erro",
        description: "Nao podes remover o organizador do jogo.",
        variant: "destructive",
      })
      return
    }

    try {
      const newParticipantNames = game.participantNames?.filter((_, i) => i !== index) || []
      // Only remove from participants array if there's a matching entry
      const newParticipants = game.participants?.filter((_, i) => i !== index) || []
      const newPlayersNeeded = game.playersNeeded + 1

      await updateMatch(game.id, {
        participants: newParticipants,
        participantNames: newParticipantNames,
        playersNeeded: newPlayersNeeded,
        status: "open",
      })

      toast({
        title: "Participante removido",
        description: "O participante foi removido do jogo.",
      })

      refresh()
    } catch {
      toast({
        title: "Erro",
        description: "Nao foi possivel remover o participante.",
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
              <p className="text-red-600 mb-4">Erro ao carregar o jogo ou jogo nao encontrado.</p>
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

  // Ensure participants list always has the organizer first
  // This handles edge cases where participantNames might be empty or missing the organizer
  const displayParticipants = useMemo(() => {
    const names = game.participantNames || []
    // If no participants but we have an organizer, add them
    if (names.length === 0 && game.organizer) {
      return [game.organizer]
    }
    // If first participant isn't the organizer, ensure organizer is first
    if (names.length > 0 && names[0] !== game.organizer && game.organizer) {
      // Check if organizer is already in the list
      const organizerIndex = names.indexOf(game.organizer)
      if (organizerIndex === -1) {
        // Organizer not in list, add them first
        return [game.organizer, ...names]
      } else {
        // Organizer in list but not first, move them
        const reordered = [game.organizer, ...names.filter((_, i) => i !== organizerIndex)]
        return reordered
      }
    }
    return names
  }, [game.participantNames, game.organizer])

  const registeredPlayers = displayParticipants.length || game.participants?.length || 0

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
                Concluido
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
          <CardTitle>Informacoes do Jogo</CardTitle>
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
                <p className="text-gray-600">as {game.time}</p>
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
                <p className="font-medium">Nivel</p>
                <p className="text-gray-600">{game.level}</p>
                {game.mode === "ranked" && game.minLevel && (
                  <p className="text-sm text-gray-500">Nivel minimo: {game.minLevel}</p>
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
                <p className="font-medium">Preco</p>
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
                  Precisas de nivel {game.minLevel} para participar neste jogo Arranca.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Participants Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Participantes ({displayParticipants.length}/{game.totalPlayers})</CardTitle>
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
          {displayParticipants.length > 0 ? (
            <div className="space-y-3">
              {displayParticipants.map((name, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src="/placeholder.svg?height=40&width=40" />
                      <AvatarFallback>
                        {name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{name}</p>
                      {index === 0 && (
                        <Badge variant="outline" className="text-xs">
                          Organizador
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isOrganizer && index > 0 && !game.hasHappened && (
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
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              Ainda nao ha participantes inscritos.
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
                  <span>Vaga disponivel</span>
                </div>
              ))}
              {game.playersNeeded > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  +{game.playersNeeded - 5} vagas disponiveis
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
                {game.result.notes && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Notas</p>
                    <p className="text-gray-700">{game.result.notes}</p>
                  </div>
                )}
              </div>
            ) : game.hasHappened ? (
              <p className="text-gray-500">O jogo terminou mas ainda nao foi inserido o resultado.</p>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 mb-3">
                  Este jogo ainda nao aconteceu. Marca-o como concluido para inserir o resultado.
                </p>
                {canEdit && (
                  <Button variant="outline" onClick={handleOpenEditDialog}>
                    <Edit2 className="w-4 h-4 mr-1" />
                    Marcar como concluido
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Result Dialog */}
      <Dialog open={editResultDialogOpen} onOpenChange={setEditResultDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Resultado</DialogTitle>
            <DialogDescription>
              Marca o jogo como concluido e insere o resultado final.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Game Completed Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasHappened"
                checked={editForm.hasHappened}
                onCheckedChange={(checked: boolean | "indeterminate") =>
                  setEditForm({ ...editForm, hasHappened: checked === true })
                }
              />
              <Label htmlFor="hasHappened" className="font-medium">
                Este jogo ja aconteceu
              </Label>
            </div>

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

                <div className="space-y-2">
                  <Label>Notas do Jogo</Label>
                  <Textarea
                    placeholder="Observacoes sobre o jogo..."
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
              disabled={updateLoading}
            >
              {updateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
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
              Adiciona um jogador que ja confirmou presenca neste jogo.
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
              disabled={updateLoading || !newParticipantName.trim()}
            >
              {updateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  )
}
