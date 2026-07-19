"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, MapPin, Trophy, Star, UserPlus, UserCheck, UserX, Loader2, Users, GamepadIcon, Calendar } from "lucide-react"
import { useAuth } from "@/lib/contexts/AuthContext"
import { useCollection, useCRUD, useQuery } from "@/hooks/useFirestore"
import { User, FriendRequest } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { fetchDocument } from "@/lib/firebase/server"
import { sendFriendRequestEmail, sendFriendAcceptedEmail } from "@/lib/email/emailService"

export default function PlayerSearchScreen() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSport, setSelectedSport] = useState("all")
  const [selectedLocation, setSelectedLocation] = useState("all")
  const [sendingRequest, setSendingRequest] = useState<string | null>(null)
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<User | null>(null)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)

  // Fetch all users with public profiles from the users collection
  const { data: users, loading, error } = useCollection<User>("users")

  // Fetch sent friend requests to check for pending/accepted
  const { data: sentRequests } = useQuery<FriendRequest>(
    "friendRequests",
    [{ field: "senderId", operator: "==", value: user?.id || "" }],
    { enabled: !!user?.id, realtime: true }
  )

  // Fetch received friend requests to check for pending/accepted
  const { data: receivedRequests } = useQuery<FriendRequest>(
    "friendRequests",
    [{ field: "receiverId", operator: "==", value: user?.id || "" }],
    { enabled: !!user?.id, realtime: true }
  )

  // CRUD for friend requests
  const { create: createFriendRequest, update: updateFriendRequest } = useCRUD<FriendRequest>("friendRequests")

  // Get unique locations from users for the filter
  const availableLocations = useMemo(() => {
    if (!users) return []
    const locations = new Set<string>()
    users.forEach((u) => {
      if (u.location) locations.add(u.location)
    })
    return Array.from(locations).sort()
  }, [users])

  // Filter users based on search, sport, and location
  const filteredPlayers = useMemo(() => {
    if (!users) return []

    return users.filter((player) => {
      // Exclude current user from results
      if (player.id === user?.id) return false

      // Only show users with public profiles
      if (player.privacy?.profileVisible === false) return false

      const searchLower = searchTerm.toLowerCase()
      const matchesSearch =
        !searchTerm ||
        player.displayName?.toLowerCase().includes(searchLower) ||
        player.firstName?.toLowerCase().includes(searchLower) ||
        player.lastName?.toLowerCase().includes(searchLower) ||
        player.email?.toLowerCase().includes(searchLower)

      const matchesSport =
        selectedSport === "all" ||
        player.sports?.some((sport) =>
          sport.toLowerCase().includes(selectedSport.toLowerCase())
        )

      const matchesLocation =
        selectedLocation === "all" ||
        player.location?.toLowerCase() === selectedLocation.toLowerCase()

      return matchesSearch && matchesSport && matchesLocation
    })
  }, [users, searchTerm, selectedSport, selectedLocation, user?.id])

  // Check friendship status with a player
  const getFriendshipStatus = (playerId: string): "none" | "pending_sent" | "pending_received" | "accepted" => {
    // Check sent requests
    const sentRequest = sentRequests?.find(
      (r) => r.receiverId === playerId
    )
    if (sentRequest) {
      if (sentRequest.status === "accepted") return "accepted"
      if (sentRequest.status === "pending") return "pending_sent"
    }

    // Check received requests
    const receivedRequest = receivedRequests?.find(
      (r) => r.senderId === playerId
    )
    if (receivedRequest) {
      if (receivedRequest.status === "accepted") return "accepted"
      if (receivedRequest.status === "pending") return "pending_received"
    }

    return "none"
  }

  const handleAddFriend = async (player: User) => {
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Tens de estar autenticado para adicionar amigos.",
        variant: "destructive",
      })
      return
    }

    // Prevent self-invite
    if (player.id === user.id) {
      toast({
        title: "Erro",
        description: "Não podes enviar um pedido de amizade a ti próprio.",
        variant: "destructive",
      })
      return
    }

    // Prevent duplicate requests in either direction (pending or accepted)
    const existingRequest =
      sentRequests?.find((r) => r.receiverId === player.id && r.status !== "rejected") ||
      receivedRequests?.find((r) => r.senderId === player.id && r.status !== "rejected")
    if (existingRequest) {
      toast({
        title: "Pedido já existente",
        description: "Já existe um pedido de amizade entre ti e este jogador.",
        variant: "destructive",
      })
      return
    }

    setSendingRequest(player.id)
    try {
      const requestData: Omit<FriendRequest, "id" | "createdAt"> = {
        senderId: user.id,
        senderName: user.displayName || `${user.firstName} ${user.lastName}`,
        senderPhoto: user.photoURL || "",
        senderLevel: user.level || 1,
        receiverId: player.id,
        receiverName: player.displayName || `${player.firstName} ${player.lastName}`,
        status: "pending",
        mutualFriends: 0,
        favoriteSports: user.sports || [],
      }

      await createFriendRequest(requestData)

      // Notify the receiver by email (fire-and-forget, never blocks the flow)
      sendFriendRequestEmail(player.email, player.firstName || player.displayName, user.displayName)

      toast({
        title: "Pedido enviado!",
        description: `Pedido de amizade enviado para ${player.displayName || player.firstName}!`,
      })
    } catch (err) {
      console.error("Error sending friend request:", err)
      toast({
        title: "Erro",
        description: "Não foi possível enviar o pedido de amizade.",
        variant: "destructive",
      })
    } finally {
      setSendingRequest(null)
    }
  }

  const handleRespondRequest = async (player: User, status: "accepted" | "rejected") => {
    const request = receivedRequests?.find(
      (r) => r.senderId === player.id && r.status === "pending"
    )
    if (!request) {
      toast({
        title: "Erro",
        description: "Não foi possível encontrar o pedido de amizade.",
        variant: "destructive",
      })
      return
    }

    setRespondingTo(player.id)
    try {
      const updates: Partial<FriendRequest> & { acceptedAt?: Date } = { status }
      if (status === "accepted") {
        updates.acceptedAt = new Date()
      }
      await updateFriendRequest(request.id, updates)

      if (status === "accepted") {
        // Notify the original sender by email (fire-and-forget, never blocks the flow)
        fetchDocument("users", request.senderId)
          .then((doc) => {
            const sender = doc as User | null
            sendFriendAcceptedEmail(
              sender?.email,
              sender?.firstName || request.senderName,
              user?.displayName || ""
            )
          })
          .catch((err) => {
            console.warn("Failed to send friend-accepted email:", err)
          })

        toast({
          title: "Pedido aceite",
          description: `${player.displayName || player.firstName} é agora teu amigo!`,
        })
      } else {
        toast({
          title: "Pedido recusado",
          description: "O pedido de amizade foi recusado.",
        })
      }
    } catch (err) {
      console.error("Error responding to friend request:", err)
      toast({
        title: "Erro",
        description: "Não foi possível responder ao pedido de amizade.",
        variant: "destructive",
      })
    } finally {
      setRespondingTo(null)
    }
  }

  const handleViewProfile = (player: User) => {
    setSelectedPlayer(player)
    setProfileDialogOpen(true)
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "online":
        return "bg-green-500"
      case "playing":
        return "bg-yellow-500"
      case "offline":
        return "bg-gray-400"
      default:
        return "bg-gray-400"
    }
  }

  const getStatusText = (status?: string) => {
    switch (status) {
      case "online":
        return "Online"
      case "playing":
        return "Em jogo"
      case "offline":
        return "Offline"
      default:
        return "Offline"
    }
  }

  const calculateWinRate = (wins: number, losses: number, draws: number) => {
    const total = wins + losses + draws
    if (total === 0) return 0
    return Math.round((wins / total) * 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-2" />
          <p className="text-gray-600">A procurar jogadores...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6 text-center">
            <p className="text-red-600">Erro ao carregar jogadores: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Pesquisar Jogadores</h1>
        <p className="text-gray-600">Encontra novos parceiros de jogo na tua área</p>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Procurar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedSport} onValueChange={setSelectedSport}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por desporto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os desportos</SelectItem>
            <SelectItem value="futebol">Futebol</SelectItem>
            <SelectItem value="tenis">Ténis</SelectItem>
            <SelectItem value="basquetebol">Basquetebol</SelectItem>
            <SelectItem value="padel">Padel</SelectItem>
            <SelectItem value="voleibol">Voleibol</SelectItem>
            <SelectItem value="futsal">Futsal</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por localização" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as localizações</SelectItem>
            {availableLocations.map((location) => (
              <SelectItem key={location} value={location}>
                {location}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Players Grid */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Jogadores Encontrados ({filteredPlayers.length})
          </h2>
        </div>

        {/* Empty State */}
        {filteredPlayers.length === 0 && (
          <Card className="bg-gray-50">
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum jogador encontrado
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedSport !== "all" || selectedLocation !== "all"
                  ? "Tenta ajustar os filtros de pesquisa"
                  : "Ainda não há jogadores registados na plataforma"}
              </p>
              {(searchTerm || selectedSport !== "all" || selectedLocation !== "all") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    setSelectedSport("all")
                    setSelectedLocation("all")
                  }}
                >
                  Limpar filtros
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {filteredPlayers.map((player) => {
          const friendshipStatus = getFriendshipStatus(player.id)
          
          return (
            <Card key={player.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={player.photoURL} />
                        <AvatarFallback>
                          {(player.displayName || `${player.firstName} ${player.lastName}`)
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(player.status)}`}
                      />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {player.displayName || `${player.firstName} ${player.lastName}`}
                        <Badge variant="outline">Nível {player.level || 1}</Badge>
                        {friendshipStatus === "accepted" && (
                          <Badge className="bg-green-100 text-green-800">Amigo</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-1">
                        {player.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {player.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Trophy className="w-4 h-4" />
                          {player.wins || 0} vitórias
                        </span>
                        <span className="text-sm">{getStatusText(player.status)}</span>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">
                      {calculateWinRate(player.wins || 0, player.losses || 0, player.draws || 0)}%
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {/* Bio */}
                  {player.bio && <p className="text-sm text-gray-600">{player.bio}</p>}

                  {/* Sports */}
                  {player.sports && player.sports.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Desportos:</p>
                      <div className="flex flex-wrap gap-1">
                        {player.sports.map((sport) => (
                          <Badge key={sport} variant="secondary" className="text-xs">
                            {sport}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>{player.gamesPlayed || 0} jogos</span>
                    <span>{player.wins || 0}V / {player.losses || 0}D / {player.draws || 0}E</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {friendshipStatus === "accepted" ? (
                      <Button size="sm" variant="outline" disabled>
                        <UserPlus className="w-4 h-4 mr-1" />
                        Já são amigos
                      </Button>
                    ) : friendshipStatus === "pending_sent" ? (
                      <Button size="sm" variant="outline" disabled>
                        <Loader2 className="w-4 h-4 mr-1" />
                        Pedido enviado
                      </Button>
                    ) : friendshipStatus === "pending_received" ? (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleRespondRequest(player, "accepted")}
                          disabled={respondingTo === player.id}
                        >
                          {respondingTo === player.id ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <UserCheck className="w-4 h-4 mr-1" />
                          )}
                          Aceitar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleRespondRequest(player, "rejected")}
                          disabled={respondingTo === player.id}
                        >
                          <UserX className="w-4 h-4 mr-1" />
                          Recusar
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleAddFriend(player)}
                        disabled={sendingRequest === player.id}
                      >
                        {sendingRequest === player.id ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <UserPlus className="w-4 h-4 mr-1" />
                        )}
                        Adicionar Amigo
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewProfile(player)}
                    >
                      Ver Perfil
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Player Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedPlayer && (
            <>
              <DialogHeader>
                <DialogTitle>Perfil do Jogador</DialogTitle>
                <DialogDescription>
                  Informações públicas do jogador
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Header */}
                <div className="flex items-center gap-4">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={selectedPlayer.photoURL} />
                    <AvatarFallback className="text-2xl">
                      {(selectedPlayer.displayName || `${selectedPlayer.firstName} ${selectedPlayer.lastName}`)
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-2xl font-bold">
                      {selectedPlayer.displayName || `${selectedPlayer.firstName} ${selectedPlayer.lastName}`}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">Nível {selectedPlayer.level || 1}</Badge>
                      <Badge className={getStatusColor(selectedPlayer.status)}>
                        {getStatusText(selectedPlayer.status)}
                      </Badge>
                    </div>
                    {selectedPlayer.location && (
                      <p className="text-gray-600 flex items-center gap-1 mt-2">
                        <MapPin className="w-4 h-4" />
                        {selectedPlayer.location}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bio */}
                {selectedPlayer.bio && (
                  <div>
                    <h3 className="font-semibold mb-2">Sobre</h3>
                    <p className="text-gray-600">{selectedPlayer.bio}</p>
                  </div>
                )}

                {/* Sports */}
                {selectedPlayer.sports && selectedPlayer.sports.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Desportos</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedPlayer.sports.map((sport) => (
                        <Badge key={sport} variant="secondary">
                          {sport}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats */}
                {(selectedPlayer.privacy?.statsVisible !== false) && (
                  <div>
                    <h3 className="font-semibold mb-3">Estatísticas</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <GamepadIcon className="w-6 h-6 mx-auto text-gray-500 mb-1" />
                          <p className="text-2xl font-bold">{selectedPlayer.gamesPlayed || 0}</p>
                          <p className="text-sm text-gray-600">Jogos</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <Trophy className="w-6 h-6 mx-auto text-green-500 mb-1" />
                          <p className="text-2xl font-bold">{selectedPlayer.wins || 0}</p>
                          <p className="text-sm text-gray-600">Vitórias</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <Star className="w-6 h-6 mx-auto text-yellow-500 mb-1" />
                          <p className="text-2xl font-bold">
                            {calculateWinRate(selectedPlayer.wins || 0, selectedPlayer.losses || 0, selectedPlayer.draws || 0)}%
                          </p>
                          <p className="text-sm text-gray-600">Win Rate</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <Calendar className="w-6 h-6 mx-auto text-blue-500 mb-1" />
                          <p className="text-2xl font-bold">{selectedPlayer.level || 1}</p>
                          <p className="text-sm text-gray-600">Nível</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Detailed Stats */}
                    <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-lg font-semibold text-green-600">{selectedPlayer.wins || 0}</p>
                        <p className="text-sm text-gray-600">Vitórias</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-red-600">{selectedPlayer.losses || 0}</p>
                        <p className="text-sm text-gray-600">Derrotas</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-yellow-600">{selectedPlayer.draws || 0}</p>
                        <p className="text-sm text-gray-600">Empates</p>
                      </div>
                    </div>

                    {/* Sport-specific stats */}
                    <div className="mt-4 grid grid-cols-4 gap-4 text-center text-sm">
                      <div>
                        <p className="font-semibold">{selectedPlayer.goals || 0}</p>
                        <p className="text-gray-600">Golos</p>
                      </div>
                      <div>
                        <p className="font-semibold">{selectedPlayer.assists || 0}</p>
                        <p className="text-gray-600">Assistências</p>
                      </div>
                      <div>
                        <p className="font-semibold">{selectedPlayer.points || 0}</p>
                        <p className="text-gray-600">Pontos</p>
                      </div>
                      <div>
                        <p className="font-semibold">{selectedPlayer.aces || 0}</p>
                        <p className="text-gray-600">Aces</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  {getFriendshipStatus(selectedPlayer.id) === "none" && (
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        handleAddFriend(selectedPlayer)
                        setProfileDialogOpen(false)
                      }}
                      disabled={sendingRequest === selectedPlayer.id}
                    >
                      {sendingRequest === selectedPlayer.id ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4 mr-1" />
                      )}
                      Adicionar Amigo
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setProfileDialogOpen(false)}>
                    Fechar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
