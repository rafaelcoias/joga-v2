"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Search, UserMinus, UserCheck, UserX, Loader2, Users } from "lucide-react"
import { useAuth } from "@/lib/contexts/AuthContext"
import { useQuery, useCRUD } from "@/hooks/useFirestore"
import { fetchDocument } from "@/lib/firebase/server"
import { FriendRequest, User } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { sendFriendAcceptedEmail } from "@/lib/email/emailService"
import { formatDate } from "@/lib/utils"

// Helper type for displaying friends
interface FriendDisplay {
  id: string;
  friendId: string;
  friendName: string;
  friendPhoto?: string;
  acceptedAt: unknown;
  createdAt: unknown;
}

// Cached profile info for a friend (photo + online status)
interface FriendProfile {
  photoURL?: string;
  status?: User["status"];
  showStatus: boolean;
}

export default function FriendsScreen() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [friendProfiles, setFriendProfiles] = useState<Record<string, FriendProfile>>({})
  const fetchedProfileIds = useRef<Set<string>>(new Set())

  // Fetch sent friend requests (where user is sender)
  const { data: sentRequests, loading: sentLoading } = useQuery<FriendRequest>(
    "friendRequests",
    [{ field: "senderId", operator: "==", value: user?.id || "" }],
    { enabled: !!user?.id, realtime: true }
  )

  // Fetch received friend requests (where user is receiver)
  const { data: receivedRequests, loading: receivedLoading } = useQuery<FriendRequest>(
    "friendRequests",
    [{ field: "receiverId", operator: "==", value: user?.id || "" }],
    { enabled: !!user?.id, realtime: true }
  )

  // CRUD operations
  const { update: updateRequest, remove: removeRequest } = useCRUD<FriendRequest>("friendRequests")

  // Derive pending sent requests
  const pendingSentRequests = useMemo(() => {
    return sentRequests?.filter(r => r.status === "pending") || []
  }, [sentRequests])

  // Derive pending incoming requests
  const pendingIncomingRequests = useMemo(() => {
    return receivedRequests?.filter(r => r.status === "pending") || []
  }, [receivedRequests])

  // Derive accepted friends from both sent and received
  const acceptedFriends = useMemo(() => {
    const friends: FriendDisplay[] = []
    
    // Friends where I sent the request
    sentRequests?.filter(r => r.status === "accepted").forEach(r => {
      friends.push({
        id: r.id,
        friendId: r.receiverId,
        friendName: r.receiverName,
        friendPhoto: undefined, // We don't have receiver photo in request
        acceptedAt: (r as FriendRequest & { acceptedAt?: unknown }).acceptedAt ?? r.createdAt,
        createdAt: r.createdAt,
      })
    })

    // Friends where I received the request
    receivedRequests?.filter(r => r.status === "accepted").forEach(r => {
      friends.push({
        id: r.id,
        friendId: r.senderId,
        friendName: r.senderName,
        friendPhoto: r.senderPhoto,
        acceptedAt: (r as FriendRequest & { acceptedAt?: unknown }).acceptedAt ?? r.createdAt,
        createdAt: r.createdAt,
      })
    })

    return friends
  }, [sentRequests, receivedRequests])

  // Stable key of friend ids so the profile fetch only runs when the list changes
  const friendIdsKey = useMemo(
    () => Array.from(new Set(acceptedFriends.map(f => f.friendId))).sort().join(","),
    [acceptedFriends]
  )

  // Fetch each friend's user document once to get real photo and online status
  useEffect(() => {
    const ids = friendIdsKey ? friendIdsKey.split(",") : []
    const missing = ids.filter(id => !fetchedProfileIds.current.has(id))
    if (missing.length === 0) return

    missing.forEach(id => fetchedProfileIds.current.add(id))
    let cancelled = false

    Promise.all(
      missing.map(async (id) => {
        const doc = (await fetchDocument("users", id)) as User | null
        return [id, doc] as const
      })
    ).then((results) => {
      if (cancelled) return
      setFriendProfiles(prev => {
        const next = { ...prev }
        results.forEach(([id, doc]) => {
          if (doc) {
            next[id] = {
              photoURL: doc.photoURL,
              status: doc.status,
              showStatus: doc.privacy?.onlineStatus !== false,
            }
          }
        })
        return next
      })
    })

    return () => {
      cancelled = true
    }
  }, [friendIdsKey])

  // Filter friends by search term
  const filteredFriends = useMemo(() => {
    if (!searchTerm) return acceptedFriends
    return acceptedFriends.filter((friend) =>
      friend.friendName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [acceptedFriends, searchTerm])

  const handleAcceptRequest = async (request: FriendRequest) => {
    setProcessingId(request.id)
    try {
      // Update the request status to accepted and record when
      const updates: Partial<FriendRequest> & { acceptedAt: Date } = {
        status: "accepted",
        acceptedAt: new Date(),
      }
      await updateRequest(request.id, updates)

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
        description: `${request.senderName} é agora teu amigo!`,
      })
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível aceitar o pedido.",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectRequest = async (request: FriendRequest) => {
    setProcessingId(request.id)
    try {
      await updateRequest(request.id, { status: "rejected" })
      toast({
        title: "Pedido recusado",
        description: "O pedido de amizade foi recusado.",
      })
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível recusar o pedido.",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleCancelRequest = async (request: FriendRequest) => {
    setProcessingId(request.id)
    try {
      await removeRequest(request.id)
      toast({
        title: "Pedido cancelado",
        description: "O pedido de amizade foi cancelado.",
      })
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível cancelar o pedido.",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleRemoveFriend = async (friend: FriendDisplay) => {
    setProcessingId(friend.id)
    try {
      await removeRequest(friend.id)
      toast({
        title: "Amigo removido",
        description: `${friend.friendName} foi removido da tua lista de amigos.`,
      })
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível remover o amigo.",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusColor = (status: string) => {
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

  const loading = sentLoading || receivedLoading

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-2" />
          <p className="text-gray-600">A carregar amigos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Amigos</h1>
        <p className="text-gray-600">Gere os teus amigos e pedidos de amizade</p>
      </div>

      <Tabs defaultValue="friends" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="friends">Amigos ({filteredFriends.length})</TabsTrigger>
          <TabsTrigger value="requests">Pedidos ({pendingIncomingRequests.length})</TabsTrigger>
          <TabsTrigger value="sent">Enviados ({pendingSentRequests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Procurar amigos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Empty State */}
          {filteredFriends.length === 0 && (
            <Card className="bg-gray-50">
              <CardContent className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchTerm ? "Nenhum amigo encontrado" : "Ainda não tens amigos"}
                </h3>
                <p className="text-gray-600">
                  {searchTerm
                    ? "Tenta uma pesquisa diferente"
                    : "Procura jogadores e envia pedidos de amizade!"}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Friends List */}
          <div className="space-y-4">
            {filteredFriends.map((friend) => {
              const profile = friendProfiles[friend.friendId]
              return (
              <Card key={friend.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={profile?.photoURL || friend.friendPhoto} />
                          <AvatarFallback>
                            {friend.friendName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        {profile?.showStatus && (
                          <div
                            className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(profile.status || "offline")}`}
                          />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{friend.friendName}</h3>
                        </div>
                        <p className="text-sm text-gray-600">
                          Amigos desde {formatDate(friend.acceptedAt ?? friend.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleRemoveFriend(friend)}
                        disabled={processingId === friend.id}
                      >
                        {processingId === friend.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <UserMinus className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          {/* Empty State */}
          {pendingIncomingRequests.length === 0 && (
            <Card className="bg-gray-50">
              <CardContent className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Sem pedidos pendentes
                </h3>
                <p className="text-gray-600">
                  Não tens pedidos de amizade pendentes de momento.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {pendingIncomingRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={request.senderPhoto} />
                        <AvatarFallback>
                          {request.senderName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{request.senderName}</h3>
                          <Badge variant="outline" className="text-xs">
                            Nível {request.senderLevel}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Pedido recebido {formatDate(request.createdAt)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {request.mutualFriends > 0 && (
                            <span className="text-xs text-gray-500">
                              {request.mutualFriends} amigos em comum
                            </span>
                          )}
                          {request.favoriteSports && request.favoriteSports.length > 0 && (
                            <div className="flex gap-1">
                              {request.favoriteSports.map((sport) => (
                                <Badge key={sport} variant="secondary" className="text-xs">
                                  {sport}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleAcceptRequest(request)}
                        disabled={processingId === request.id}
                      >
                        {processingId === request.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4 mr-1" />
                            Aceitar
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleRejectRequest(request)}
                        disabled={processingId === request.id}
                      >
                        <UserX className="w-4 h-4 mr-1" />
                        Recusar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          {/* Empty State */}
          {pendingSentRequests.length === 0 && (
            <Card className="bg-gray-50">
              <CardContent className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Sem pedidos enviados
                </h3>
                <p className="text-gray-600">
                  Não tens pedidos de amizade pendentes de resposta.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {pendingSentRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback>
                          {request.receiverName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{request.receiverName}</h3>
                        </div>
                        <p className="text-sm text-gray-600">
                          Pedido enviado {formatDate(request.createdAt)}
                        </p>
                        {request.favoriteSports && request.favoriteSports.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {request.favoriteSports.map((sport) => (
                              <Badge key={sport} variant="secondary" className="text-xs">
                                {sport}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-yellow-600">
                        Pendente
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleCancelRequest(request)}
                        disabled={processingId === request.id}
                      >
                        {processingId === request.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Cancelar"
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
