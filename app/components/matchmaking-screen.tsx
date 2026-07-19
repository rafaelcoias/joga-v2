"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { MapPin, Clock, Users, Star, Plus, Home, Calendar, Loader2, Zap, X, Euro, Eye, Flame, List } from "lucide-react"
import { useAuth } from "@/lib/contexts/AuthContext"
import { useCollection, useQuery, useCRUD } from "@/hooks/useFirestore"
import { joinMatch, registerLocalGame } from "@/lib/firebase/matchService"
import { Match, LocalGame } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { where } from "firebase/firestore"
import Link from "next/link"
import MatchSwipeDeck from "./match-swipe-deck"

export default function MatchMakingScreen() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [selectedSport, setSelectedSport] = useState("all")
  const [selectedLevel, setSelectedLevel] = useState("all")
  const [selectedMode, setSelectedMode] = useState("normal")
  const [viewMode, setViewMode] = useState<"deck" | "list" | "mine">("deck")
  const [localGameDialogOpen, setLocalGameDialogOpen] = useState(false)
  const [createMatchDialogOpen, setCreateMatchDialogOpen] = useState(false)
  const [joiningMatchId, setJoiningMatchId] = useState<string | null>(null)

  // Fetch matches based on mode (open matches only)
  const { data: allMatches, loading: matchesLoading, error: matchesError } = useCollection<Match>("matches", {
    constraints: [
      where("status", "==", "open"),
    ],
    realtime: true,
  })

  // Sort matches by createdAt client-side (newest first)
  const sortedMatches = useMemo(() => {
    if (!allMatches) return []
    return [...allMatches].sort((a, b) => {
      const dateA = (a.createdAt as { seconds?: number })?.seconds || 0
      const dateB = (b.createdAt as { seconds?: number })?.seconds || 0
      return dateB - dateA
    })
  }, [allMatches])

  // Fetch local games for current user
  const { data: localGames, loading: localGamesLoading } = useQuery<LocalGame>(
    "localGames",
    [{ field: "userId", operator: "==", value: user?.id || "" }],
    { enabled: !!user?.id && selectedMode === "local", realtime: true }
  )

  // Games the user is part of (organized or joined), any status
  const { data: myMatches } = useQuery<Match>(
    "matches",
    [{ field: "participants", operator: "array-contains", value: user?.id || "" }],
    { enabled: !!user?.id, realtime: true }
  )

  // My games sorted: pending-result first, then upcoming by date, then past
  const sortedMyMatches = useMemo(() => {
    if (!myMatches) return []
    const today = new Date().toISOString().slice(0, 10)
    const rank = (m: Match) => {
      if (!m.hasHappened && m.date < today && m.status !== "cancelled") return 0 // needs result
      if (!m.hasHappened && m.status !== "cancelled") return 1 // upcoming
      return 2 // completed / cancelled
    }
    return [...myMatches].sort((a, b) => rank(a) - rank(b) || a.date.localeCompare(b.date))
  }, [myMatches])

  // CRUD operations
  const { create: createMatch } = useCRUD<Match>("matches")

  // Filter matches based on mode, sport, and level
  const filteredMatches = useMemo(() => {
    if (!sortedMatches) return []

    return sortedMatches.filter((match) => {
      const matchesMode = match.mode === selectedMode ||
        (selectedMode === "normal" && match.mode !== "ranked")
      const matchesSport = selectedSport === "all" ||
        match.sport.toLowerCase().includes(selectedSport.toLowerCase())
      const matchesLevel = selectedLevel === "all" ||
        match.level.toLowerCase() === selectedLevel.toLowerCase()

      return matchesMode && matchesSport && matchesLevel
    })
  }, [sortedMatches, selectedMode, selectedSport, selectedLevel])

  // New match form state
  const [newMatch, setNewMatch] = useState({
    sport: "Futebol",
    location: "",
    venueName: "",
    date: "",
    time: "",
    duration: "60",
    totalPlayers: "10",
    level: "Intermédio",
    totalPrice: "150", // Total price for the game
    rankPoints: "",
    minLevel: "",
    // Participants management
    participantNames: [""] as string[],
    // Game completed fields
    hasHappened: false,
    resultScore: "",
    resultNotes: "",
  })

  // Local game form state
  const [localGameForm, setLocalGameForm] = useState({
    sport: "Futebol",
    location: "",
    date: "",
    time: "",
    duration: "",
    participants: [""] as string[],
    hasHappened: false, // Game completed checkbox
    result: "",
    myGoals: "",
    myAssists: "",
    myPoints: "",
    myAces: "",
    notes: "",
  })

  // Helper to calculate price per person
  const calculatePricePerPerson = (totalPrice: number, totalPlayers: number): string => {
    if (totalPlayers <= 0) return "0.00"
    return (totalPrice / totalPlayers).toFixed(2)
  }

  // Add participant input field
  const addParticipantField = () => {
    setNewMatch({
      ...newMatch,
      participantNames: [...newMatch.participantNames, ""]
    })
  }

  // Remove participant input field
  const removeParticipantField = (index: number) => {
    const updated = newMatch.participantNames.filter((_, i) => i !== index)
    setNewMatch({ ...newMatch, participantNames: updated.length > 0 ? updated : [""] })
  }

  // Update participant name
  const updateParticipantName = (index: number, value: string) => {
    const updated = [...newMatch.participantNames]
    updated[index] = value
    setNewMatch({ ...newMatch, participantNames: updated })
  }

  // Local game participant management
  const addLocalParticipant = () => {
    setLocalGameForm({
      ...localGameForm,
      participants: [...localGameForm.participants, ""]
    })
  }

  const removeLocalParticipant = (index: number) => {
    const updated = localGameForm.participants.filter((_, i) => i !== index)
    setLocalGameForm({ ...localGameForm, participants: updated.length > 0 ? updated : [""] })
  }

  const updateLocalParticipant = (index: number, value: string) => {
    const updated = [...localGameForm.participants]
    updated[index] = value
    setLocalGameForm({ ...localGameForm, participants: updated })
  }

  const handleJoinMatch = async (matchId: string) => {
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Precisas de fazer login para te juntares a um jogo.",
        variant: "destructive",
      })
      return
    }

    setJoiningMatchId(matchId)

    try {
      // Transactional join — safe against concurrent joins and roster desync
      await joinMatch(matchId, user)

      toast({
        title: "Inscrição confirmada!",
        description: "Juntaste-te ao jogo com sucesso.",
      })
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Não foi possível inscrever-te no jogo.",
        variant: "destructive",
      })
    } finally {
      setJoiningMatchId(null)
    }
  }

  const handleCreateMatch = async () => {
    if (!user?.id || !newMatch.location || !newMatch.date || !newMatch.time) {
      toast({
        title: "Erro",
        description: "Por favor preenche todos os campos obrigatórios.",
        variant: "destructive",
      })
      return
    }

    try {
      // Filter out empty participant names
      const validParticipantNames = newMatch.participantNames.filter(name => name.trim() !== "")
      const organizerName = user.displayName || `${user.firstName} ${user.lastName}`

      // Roster arrays are index-aligned: guests added by name have "" as id
      const allParticipantNames = [organizerName, ...validParticipantNames]
      const allParticipantIds = [user.id, ...validParticipantNames.map(() => "")]

      // The roster can never exceed the total player count
      const totalPlayers = Math.max(parseInt(newMatch.totalPlayers) || 2, allParticipantNames.length)
      const playersNeeded = Math.max(0, totalPlayers - allParticipantNames.length)

      const matchData = {
        sport: newMatch.sport,
        location: newMatch.location,
        venueName: newMatch.venueName || newMatch.location,
        date: newMatch.date,
        time: newMatch.time,
        duration: parseInt(newMatch.duration) || 60,
        totalPlayers,
        playersNeeded,
        level: newMatch.level,
        organizer: organizerName,
        organizerId: user.id,
        rating: 0,
        mode: selectedMode === "ranked" ? "ranked" as const : "normal" as const,
        status: playersNeeded === 0 ? "full" as const : "open" as const,
        participants: allParticipantIds,
        participantNames: allParticipantNames,
        totalPrice: parseFloat(newMatch.totalPrice) || 0,
        ...(selectedMode === "ranked" ? {
          rankPoints: parseInt(newMatch.rankPoints) || 0,
          minLevel: parseInt(newMatch.minLevel) || 1,
        } : {}),
        // Completed game fields
        hasHappened: newMatch.hasHappened,
        ...(newMatch.hasHappened ? {
          result: {
            score: newMatch.resultScore,
            notes: newMatch.resultNotes,
          }
        } : {}),
      }

      await createMatch(matchData)

      toast({
        title: "Jogo criado!",
        description: "O teu jogo foi criado com sucesso.",
      })

      setCreateMatchDialogOpen(false)
      setNewMatch({
        sport: "Futebol",
        location: "",
        venueName: "",
        date: "",
        time: "",
        duration: "60",
        totalPlayers: "10",
        level: "Intermédio",
        totalPrice: "150",
        rankPoints: "",
        minLevel: "",
        participantNames: [""],
        hasHappened: false,
        resultScore: "",
        resultNotes: "",
      })
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível criar o jogo.",
        variant: "destructive",
      })
    }
  }

  const handleSubmitLocalGame = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Precisas de fazer login para registar um jogo.",
        variant: "destructive",
      })
      return
    }

    try {
      // Filter empty participants
      const validParticipants = localGameForm.participants.filter(p => p.trim() !== "")

      // Map the free-text result to win/loss/draw
      let gameResult: "win" | "loss" | "draw" | undefined
      if (localGameForm.hasHappened && localGameForm.result) {
        const result = localGameForm.result.toLowerCase()
        gameResult = "draw"
        if (result.includes("vitória") || result.includes("vitoria")) {
          gameResult = "win"
        } else if (result.includes("derrota")) {
          gameResult = "loss"
        }
      }

      // Build myStats object only with defined values
      const myStats: Record<string, number> = {}
      if (localGameForm.myGoals) myStats.goals = parseInt(localGameForm.myGoals)
      if (localGameForm.myAssists) myStats.assists = parseInt(localGameForm.myAssists)
      if (localGameForm.myPoints) myStats.points = parseInt(localGameForm.myPoints)
      if (localGameForm.myAces) myStats.aces = parseInt(localGameForm.myAces)

      // Transactional: also updates the user's counters + match history
      // when the game already happened
      await registerLocalGame(user, {
        sport: localGameForm.sport,
        location: localGameForm.location,
        date: localGameForm.date,
        time: localGameForm.time,
        duration: localGameForm.duration,
        participants: validParticipants,
        hasHappened: localGameForm.hasHappened,
        result: gameResult,
        myStats,
        notes: localGameForm.notes,
      })

      toast({
        title: "Jogo registado!",
        description: localGameForm.hasHappened
          ? "Jogo registado e estatísticas atualizadas!"
          : "O teu jogo local foi agendado. Podes adicionar o resultado depois.",
      })

      setLocalGameDialogOpen(false)
      setLocalGameForm({
        sport: "Futebol",
        location: "",
        date: "",
        time: "",
        duration: "",
        participants: [""],
        hasHappened: false,
        result: "",
        myGoals: "",
        myAssists: "",
        myPoints: "",
        myAces: "",
        notes: "",
      })
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível registar o jogo.",
        variant: "destructive",
      })
    }
  }

  const loading = matchesLoading || (selectedMode === "local" && localGamesLoading)

  if (matchesError) {
    console.error("Error fetching matches:", matchesError)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-2" />
          <p className="text-gray-600">A carregar jogos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">MatchMaking</h1>
        <p className="text-gray-600">
          {selectedMode === "ranked"
            ? "Compete em jogos classificados e sobe no ranking global"
            : selectedMode === "local"
              ? "Regista jogos realizados em campos privados para manter as tuas estatísticas atualizadas"
              : "Encontra parceiros para o teu desporto favorito de forma casual"}
        </p>
      </div>

      {/* Mode Selection */}
      <div className="flex justify-center mb-6">
        <div className="bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setSelectedMode("normal")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              selectedMode === "normal" ? "bg-white text-green-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Modo Normal
          </button>
          <button
            onClick={() => setSelectedMode("ranked")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              selectedMode === "ranked" ? "bg-white text-green-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Modo Arranca
          </button>
          <button
            onClick={() => setSelectedMode("local")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              selectedMode === "local" ? "bg-white text-green-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Modo Local
          </button>
        </div>
      </div>

      {selectedMode === "local" ? (
        <div className="space-y-6">
          {/* Local Mode Header */}
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-6 h-6 text-blue-600" />
                Modo Local - Campos Privados
              </CardTitle>
              <CardDescription>
                Tens um campo privado ou jogaste num local não listado? Regista o teu jogo aqui para manter as tuas
                estatísticas completas e precisas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={localGameDialogOpen} onOpenChange={setLocalGameDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Registar Novo Jogo Local
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Registar Jogo Local</DialogTitle>
                    <DialogDescription>
                      Preenche os detalhes do jogo realizado no teu campo privado ou local não listado.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmitLocalGame} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sport">Desporto</Label>
                        <Select
                          value={localGameForm.sport}
                          onValueChange={(value) => setLocalGameForm({ ...localGameForm, sport: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Futebol">Futebol</SelectItem>
                            <SelectItem value="Ténis">Ténis</SelectItem>
                            <SelectItem value="Basquetebol">Basquetebol</SelectItem>
                            <SelectItem value="Padel">Padel</SelectItem>
                            <SelectItem value="Voleibol">Voleibol</SelectItem>
                            <SelectItem value="Futsal">Futsal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location">Localização do Campo</Label>
                        <Input
                          id="location"
                          placeholder="Ex: Campo Privado - Quinta da Marinha"
                          value={localGameForm.location}
                          onChange={(e) => setLocalGameForm({ ...localGameForm, location: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="date">Data</Label>
                        <Input
                          id="date"
                          type="date"
                          value={localGameForm.date}
                          onChange={(e) => setLocalGameForm({ ...localGameForm, date: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="time">Hora</Label>
                        <Input
                          id="time"
                          type="time"
                          value={localGameForm.time}
                          onChange={(e) => setLocalGameForm({ ...localGameForm, time: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="duration">Duração</Label>
                        <Input
                          id="duration"
                          placeholder="Ex: 90 min"
                          value={localGameForm.duration}
                          onChange={(e) => setLocalGameForm({ ...localGameForm, duration: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    {/* Multiple Participants */}
                    <div className="space-y-2">
                      <Label>Participantes</Label>
                      <div className="space-y-2">
                        {localGameForm.participants.map((participant, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              placeholder={`Participante ${index + 1}`}
                              value={participant}
                              onChange={(e) => updateLocalParticipant(index, e.target.value)}
                            />
                            {localGameForm.participants.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => removeLocalParticipant(index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={addLocalParticipant}>
                          <Plus className="w-4 h-4 mr-1" />
                          Adicionar Participante
                        </Button>
                      </div>
                    </div>

                    {/* Game Completed Checkbox */}
                    <div className="border-t pt-4 mt-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="localHasHappened"
                          checked={localGameForm.hasHappened}
                          onCheckedChange={(checked: boolean | "indeterminate") =>
                            setLocalGameForm({ ...localGameForm, hasHappened: checked === true })
                          }
                        />
                        <Label htmlFor="localHasHappened" className="text-sm font-medium">
                          Este jogo já aconteceu
                        </Label>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Ativa esta opção para inserir o resultado e estatísticas do jogo.
                      </p>
                    </div>

                    {/* Conditional Result and Stats Fields - Only show if game has happened */}
                    {localGameForm.hasHappened && (
                      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900">Resultado e Estatísticas</h4>

                        <div className="space-y-2">
                          <Label htmlFor="result">Resultado</Label>
                          <Input
                            id="result"
                            placeholder="Ex: Vitória 4-2, Derrota 1-3, Empate 2-2"
                            value={localGameForm.result}
                            onChange={(e) => setLocalGameForm({ ...localGameForm, result: e.target.value })}
                          />
                        </div>

                        {/* Sport-specific stats */}
                        {(localGameForm.sport === "Futebol" || localGameForm.sport === "Futsal") && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="myGoals">Os Meus Golos</Label>
                              <Input
                                id="myGoals"
                                type="number"
                                min="0"
                                value={localGameForm.myGoals}
                                onChange={(e) => setLocalGameForm({ ...localGameForm, myGoals: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="myAssists">As Minhas Assistências</Label>
                              <Input
                                id="myAssists"
                                type="number"
                                min="0"
                                value={localGameForm.myAssists}
                                onChange={(e) => setLocalGameForm({ ...localGameForm, myAssists: e.target.value })}
                              />
                            </div>
                          </div>
                        )}

                        {(localGameForm.sport === "Ténis" || localGameForm.sport === "Padel") && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="myPoints">Os Meus Pontos</Label>
                              <Input
                                id="myPoints"
                                type="number"
                                min="0"
                                value={localGameForm.myPoints}
                                onChange={(e) => setLocalGameForm({ ...localGameForm, myPoints: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="myAces">Os Meus Aces</Label>
                              <Input
                                id="myAces"
                                type="number"
                                min="0"
                                value={localGameForm.myAces}
                                onChange={(e) => setLocalGameForm({ ...localGameForm, myAces: e.target.value })}
                              />
                            </div>
                          </div>
                        )}

                        {localGameForm.sport === "Basquetebol" && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="myPoints">Os Meus Pontos</Label>
                              <Input
                                id="myPoints"
                                type="number"
                                min="0"
                                value={localGameForm.myPoints}
                                onChange={(e) => setLocalGameForm({ ...localGameForm, myPoints: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="myAssists">As Minhas Assistências</Label>
                              <Input
                                id="myAssists"
                                type="number"
                                min="0"
                                value={localGameForm.myAssists}
                                onChange={(e) => setLocalGameForm({ ...localGameForm, myAssists: e.target.value })}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notas (Opcional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Observações sobre o jogo..."
                        value={localGameForm.notes}
                        onChange={(e) => setLocalGameForm({ ...localGameForm, notes: e.target.value })}
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button type="submit" className="bg-green-600 hover:bg-green-700 flex-1">
                        Registar Jogo
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setLocalGameDialogOpen(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Recent Local Games */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Jogos Locais Recentes
            </h2>

            {localGames && localGames.length > 0 ? (
              localGames.map((game) => (
                <Card key={game.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {game.sport}
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Local
                          </Badge>
                          {/* Only show result badge if game has happened */}
                          {game.hasHappened ? (
                            <Badge
                              className={
                                game.result === "win"
                                  ? "bg-green-100 text-green-800"
                                  : game.result === "loss"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                              }
                            >
                              {game.result === "win" ? "Vitória" : game.result === "loss" ? "Derrota" : "Empate"}
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-700">
                              Agendado
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-2">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {game.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(game.date).toLocaleDateString("pt-PT")} às {game.time}
                          </span>
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">{game.duration}</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Participantes</h4>
                        <div className="flex flex-wrap gap-1">
                          {game.participants?.map((participant, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {participant}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {/* Only show stats section if game has happened */}
                      {game.hasHappened && game.myStats && Object.keys(game.myStats).length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">As Minhas Estatísticas</h4>
                          <div className="space-y-1">
                            {game.myStats?.goals !== undefined && (
                              <div className="flex justify-between text-sm">
                                <span>Golos:</span>
                                <span className="font-medium">{game.myStats.goals}</span>
                              </div>
                            )}
                            {game.myStats?.assists !== undefined && (
                              <div className="flex justify-between text-sm">
                                <span>Assistências:</span>
                                <span className="font-medium">{game.myStats.assists}</span>
                              </div>
                            )}
                            {game.myStats?.points !== undefined && (
                              <div className="flex justify-between text-sm">
                                <span>Pontos:</span>
                                <span className="font-medium">{game.myStats.points}</span>
                              </div>
                            )}
                            {game.myStats?.aces !== undefined && (
                              <div className="flex justify-between text-sm">
                                <span>Aces:</span>
                                <span className="font-medium">{game.myStats.aces}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {/* Show message for scheduled games */}
                      {!game.hasHappened && (
                        <div>
                          <p className="text-sm text-gray-500">
                            Jogo agendado. O resultado e estatísticas podem ser adicionados depois do jogo acontecer.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Home className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum jogo local registado</h3>
                  <p className="text-gray-600 mb-4">
                    Começa a registar os teus jogos em campos privados para manter as estatísticas completas.
                  </p>
                  <Button onClick={() => setLocalGameDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Registar Primeiro Jogo
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Filters for Normal/Ranked modes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Select value={selectedSport} onValueChange={setSelectedSport}>
              <SelectTrigger>
                <SelectValue placeholder="Seleciona o desporto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os desportos</SelectItem>
                <SelectItem value="futebol">Futebol</SelectItem>
                <SelectItem value="tenis">Ténis</SelectItem>
                <SelectItem value="basquetebol">Basquetebol</SelectItem>
                <SelectItem value="voleibol">Voleibol</SelectItem>
                <SelectItem value="padel">Padel</SelectItem>
                <SelectItem value="futsal">Futsal</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Nível de jogo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os níveis</SelectItem>
                <SelectItem value="iniciante">Iniciante</SelectItem>
                <SelectItem value="intermédio">Intermédio</SelectItem>
                <SelectItem value="avançado">Avançado</SelectItem>
                {selectedMode === "ranked" && (
                  <>
                    <SelectItem value="profissional">Profissional</SelectItem>
                    <SelectItem value="elite">Elite</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>

            <Dialog open={createMatchDialogOpen} onOpenChange={setCreateMatchDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Novo Jogo {selectedMode === "ranked" ? "Arranca" : ""}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    Criar Novo Jogo {selectedMode === "ranked" ? "Arranca" : ""}
                  </DialogTitle>
                  <DialogDescription>
                    Preenche os detalhes do jogo que queres criar.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Desporto</Label>
                      <Select
                        value={newMatch.sport}
                        onValueChange={(v) => setNewMatch({ ...newMatch, sport: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Futebol">Futebol</SelectItem>
                          <SelectItem value="Ténis">Ténis</SelectItem>
                          <SelectItem value="Basquetebol">Basquetebol</SelectItem>
                          <SelectItem value="Padel">Padel</SelectItem>
                          <SelectItem value="Voleibol">Voleibol</SelectItem>
                          <SelectItem value="Futsal">Futsal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Nível</Label>
                      <Select
                        value={newMatch.level}
                        onValueChange={(v) => setNewMatch({ ...newMatch, level: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Iniciante">Iniciante</SelectItem>
                          <SelectItem value="Intermédio">Intermédio</SelectItem>
                          <SelectItem value="Avançado">Avançado</SelectItem>
                          {selectedMode === "ranked" && (
                            <>
                              <SelectItem value="Profissional">Profissional</SelectItem>
                              <SelectItem value="Elite">Elite</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Local</Label>
                    <Input
                      placeholder="Ex: Campo do Jamor"
                      value={newMatch.location}
                      onChange={(e) => setNewMatch({ ...newMatch, location: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Data</Label>
                      <Input
                        type="date"
                        value={newMatch.date}
                        onChange={(e) => setNewMatch({ ...newMatch, date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Hora</Label>
                      <Input
                        type="time"
                        value={newMatch.time}
                        onChange={(e) => setNewMatch({ ...newMatch, time: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Duração</Label>
                      <Select
                        value={newMatch.duration}
                        onValueChange={(v) => setNewMatch({ ...newMatch, duration: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 min</SelectItem>
                          <SelectItem value="60">60 min</SelectItem>
                          <SelectItem value="90">90 min</SelectItem>
                          <SelectItem value="120">120 min</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Total Jogadores</Label>
                      <Input
                        type="number"
                        min="2"
                        max="22"
                        value={newMatch.totalPlayers}
                        onChange={(e) => setNewMatch({ ...newMatch, totalPlayers: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Preço Total (€)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={newMatch.totalPrice}
                        onChange={(e) => setNewMatch({ ...newMatch, totalPrice: e.target.value })}
                      />
                      <p className="text-xs text-gray-500">
                        Preço por pessoa: €{calculatePricePerPerson(parseFloat(newMatch.totalPrice) || 0, parseInt(newMatch.totalPlayers) || 1)}
                      </p>
                    </div>
                  </div>

                  {/* Ranked-specific fields */}
                  {selectedMode === "ranked" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Pontos Rank</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="25"
                          value={newMatch.rankPoints}
                          onChange={(e) => setNewMatch({ ...newMatch, rankPoints: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nível Mínimo</Label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="15"
                          value={newMatch.minLevel}
                          onChange={(e) => setNewMatch({ ...newMatch, minLevel: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {/* Multiple Participants */}
                  <div className="space-y-2">
                    <Label>Participantes Adicionais</Label>
                    <p className="text-xs text-gray-500 mb-2">
                      Adiciona outros jogadores que já confirmaram presença (além de ti).
                    </p>
                    <div className="space-y-2">
                      {newMatch.participantNames.map((name, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder={`Participante ${index + 1}`}
                            value={name}
                            onChange={(e) => updateParticipantName(index, e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeParticipantField(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={addParticipantField}>
                        <Plus className="w-4 h-4 mr-1" />
                        Adicionar Participante
                      </Button>
                    </div>
                  </div>

                  {/* Game Completed Checkbox */}
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasHappened"
                        checked={newMatch.hasHappened}
                        onCheckedChange={(checked: boolean | "indeterminate") => setNewMatch({ ...newMatch, hasHappened: checked === true })}
                      />
                      <Label htmlFor="hasHappened" className="text-sm font-medium">
                        Este jogo já aconteceu
                      </Label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Ativa esta opção para inserir o resultado e estatísticas do jogo.
                    </p>
                  </div>

                  {/* Conditional Result/Stats Fields */}
                  {newMatch.hasHappened && (
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900">Resultado do Jogo</h4>
                      <div className="space-y-2">
                        <Label>Resultado</Label>
                        <Input
                          placeholder="Ex: 3-2, 6-4 6-3"
                          value={newMatch.resultScore}
                          onChange={(e) => setNewMatch({ ...newMatch, resultScore: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Notas do Jogo</Label>
                        <Textarea
                          placeholder="Observações sobre o jogo..."
                          value={newMatch.resultNotes}
                          onChange={(e) => setNewMatch({ ...newMatch, resultNotes: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateMatchDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={handleCreateMatch}>
                    Criar Jogo
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Available Matches */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedMode === "ranked" ? "Jogos Arranca Disponíveis" : "Jogos Disponíveis"}
              </h2>
              <div className="bg-gray-100 p-1 rounded-lg flex">
                <button
                  onClick={() => setViewMode("deck")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                    viewMode === "deck" ? "bg-white text-green-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Flame className="w-4 h-4" />
                  Descobrir
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                    viewMode === "list" ? "bg-white text-green-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <List className="w-4 h-4" />
                  Lista
                </button>
                <button
                  onClick={() => setViewMode("mine")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                    viewMode === "mine" ? "bg-white text-green-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Meus Jogos
                  {sortedMyMatches.length > 0 && (
                    <span className="ml-1 bg-green-100 text-green-700 text-xs rounded-full px-1.5">
                      {sortedMyMatches.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {viewMode === "mine" ? (
              sortedMyMatches.length === 0 ? (
                <Card className="bg-gray-50">
                  <CardContent className="p-12 text-center">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Ainda não tens jogos
                    </h3>
                    <p className="text-gray-600">
                      Junta-te a um jogo no Descobrir ou cria o teu próprio jogo.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {sortedMyMatches.map((match) => {
                    const isMatchOrganizer = match.organizerId === user?.id
                    const today = new Date().toISOString().slice(0, 10)
                    const needsResult =
                      !match.hasHappened && match.date < today && match.status !== "cancelled"
                    return (
                      <Card
                        key={match.id}
                        className={`hover:shadow-lg transition-shadow ${
                          needsResult ? "border-yellow-300 bg-yellow-50/50" : ""
                        }`}
                      >
                        <CardContent className="p-4 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900">{match.sport}</span>
                              {match.mode === "ranked" && (
                                <Badge className="bg-yellow-100 text-yellow-800">Arranca</Badge>
                              )}
                              {isMatchOrganizer && (
                                <Badge variant="outline" className="text-xs">Organizador</Badge>
                              )}
                              {match.hasHappened ? (
                                <Badge className="bg-blue-100 text-blue-800">Concluído</Badge>
                              ) : match.status === "cancelled" ? (
                                <Badge className="bg-red-100 text-red-800">Cancelado</Badge>
                              ) : needsResult ? (
                                <Badge className="bg-yellow-100 text-yellow-800">Por concluir</Badge>
                              ) : match.status === "full" ? (
                                <Badge className="bg-orange-100 text-orange-800">Lotado</Badge>
                              ) : (
                                <Badge className="bg-green-100 text-green-800">Aberto</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1 flex items-center gap-3 flex-wrap">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {match.venueName || match.location}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {new Date(match.date).toLocaleDateString("pt-PT")} às {match.time}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {match.totalPlayers - match.playersNeeded}/{match.totalPlayers}
                              </span>
                            </p>
                          </div>
                          <Link href={`/app/game/${match.id}`} className="shrink-0">
                            <Button
                              size="sm"
                              className={
                                needsResult && isMatchOrganizer
                                  ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                                  : "bg-green-600 hover:bg-green-700"
                              }
                            >
                              {needsResult && isMatchOrganizer ? "Inserir resultado" : "Ver jogo"}
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )
            ) : viewMode === "deck" ? (
              <MatchSwipeDeck matches={filteredMatches} user={user} />
            ) : filteredMatches.length === 0 ? (
              <Card className="bg-gray-50">
                <CardContent className="p-12 text-center">
                  <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Nenhum jogo disponível
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Não há jogos disponíveis com os filtros selecionados. Cria um novo jogo!
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredMatches.map((match) => {
                const pricePerPerson = calculatePricePerPerson(match.totalPrice || 0, match.totalPlayers)

                return (
                  <Card key={match.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {match.sport}
                            <Badge variant="outline">{match.level}</Badge>
                            {match.mode === "ranked" && (
                              <Badge className="bg-yellow-100 text-yellow-800">Arranca</Badge>
                            )}
                            {match.hasHappened && (
                              <Badge className="bg-blue-100 text-blue-800">Concluído</Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-4 mt-2">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {match.venueName || match.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {new Date(match.date).toLocaleDateString("pt-PT")} às {match.time}
                            </span>
                          </CardDescription>
                        </div>
                        {match.rating !== undefined && match.rating > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{match.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarFallback>
                              {match.organizer
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{match.organizer}</p>
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {match.totalPlayers - match.playersNeeded}/{match.totalPlayers} jogadores
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 justify-end">
                              <Euro className="w-4 h-4 text-green-600" />
                              <span className="font-medium text-green-600">{pricePerPerson}€</span>
                            </div>
                            <p className="text-sm text-gray-600">por pessoa</p>
                            {match.mode === "ranked" && (
                              <>
                                <Badge className="bg-yellow-100 text-yellow-800">+{match.rankPoints} pts</Badge>
                                <p className="text-xs text-gray-500">Min. Nível {match.minLevel}</p>
                              </>
                            )}
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Link href={`/app/game/${match.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4 mr-1" />
                                Ver
                              </Button>
                            </Link>
                            <Button
                              className="bg-green-600 hover:bg-green-700"
                              size="sm"
                              disabled={
                                (match.mode === "ranked" && (user?.level ?? 0) < (match.minLevel ?? 0)) ||
                                match.participants?.includes(user?.id || "") ||
                                joiningMatchId === match.id
                              }
                              onClick={() => handleJoinMatch(match.id)}
                            >
                              {joiningMatchId === match.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : match.participants?.includes(user?.id || "") ? (
                                "Inscrito"
                              ) : (
                                "Juntar-me"
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}
