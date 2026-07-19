"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, MapPin, Users, Edit, Trash2, Loader2, Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/contexts/AuthContext"
import { useQuery, useCRUD, useCollection } from "@/hooks/useFirestore"
import { Booking, Venue, Arena, ArenaBooking, User } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { findSlotConflict, minutesToTime } from "@/lib/firebase/bookingService"
import { fetchDocument } from "@/lib/firebase/server"
import { sendBookingOrganizerEmail, sendBookingUserEmail } from "@/lib/email/emailService"

export default function BookingsScreen() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [bookingToCancel, setBookingToCancel] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newBooking, setNewBooking] = useState({
    sport: "",
    venue: "",
    venueId: "",
    date: "",
    time: "",
    duration: "60",
    players: "2",
  })
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [editForm, setEditForm] = useState({
    date: "",
    time: "",
    duration: "60",
    players: "2",
  })

  // Fetch user's bookings
  const { data: bookings, loading, error } = useQuery<Booking>(
    "bookings",
    [{ field: "userId", operator: "==", value: user?.id || "" }],
    { enabled: !!user?.id, realtime: true }
  )

  // Fetch venues for the booking form (both legacy venues and new arenas)
  const { data: legacyVenues } = useCollection<Venue>("venues")
  const { data: arenas } = useCollection<Arena>("arenas")
  
  // Combine venues and arenas into a unified list for selection
  const allVenues = useMemo(() => {
    const combined: {
      id: string
      name: string
      location: string
      sports: string[]
      pricePerHour: number
      type: "arena" | "venue"
      organizerId?: string
      organizerName?: string
      organizerEmail?: string
    }[] = []

    // Add legacy venues
    legacyVenues?.forEach((venue) => {
      combined.push({
        id: venue.id,
        name: venue.name,
        location: venue.location,
        sports: venue.sports || [],
        pricePerHour: parseFloat(venue.pricePerHour) || 0,
        type: "venue",
      })
    })

    // Add new arenas (only active ones)
    arenas?.filter(a => a.isActive)?.forEach((arena) => {
      combined.push({
        id: arena.id,
        name: arena.name,
        location: arena.location,
        sports: arena.sports || [],
        pricePerHour: arena.pricePerHour || 0,
        type: "arena",
        organizerId: arena.organizerId,
        organizerName: arena.organizerName,
        organizerEmail: arena.email,
      })
    })

    return combined
  }, [legacyVenues, arenas])

  // CRUD operations
  const { create, update, loading: crudLoading } = useCRUD<Booking>("bookings")
  const { create: createArenaBooking, update: updateArenaBooking } = useCRUD<ArenaBooking>("arenaBookings")

  // Calculate stats
  const stats = useMemo(() => {
    if (!bookings) return { upcomingGames: 0, totalHours: 0 }

    const now = new Date()
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const upcomingGames = bookings.filter((b) => {
      const bookingDate = new Date(b.date)
      return bookingDate >= now && bookingDate <= oneWeekFromNow && b.status !== "cancelled"
    }).length

    const totalHours = bookings
      .filter((b) => {
        const bookingDate = new Date(b.date)
        return bookingDate >= now && bookingDate <= oneWeekFromNow && b.status !== "cancelled"
      })
      .reduce((acc, b) => {
        const duration = parseInt(b.duration) || 60
        return acc + duration / 60
      }, 0)

    return { upcomingGames, totalHours: Math.round(totalHours) }
  }, [bookings])

  // Sort bookings by date (upcoming first)
  const sortedBookings = useMemo(() => {
    if (!bookings) return []
    return [...bookings]
      .filter((b) => b.status !== "cancelled")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [bookings])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmado"
      case "pending":
        return "Pendente"
      case "cancelled":
        return "Cancelado"
      default:
        return status
    }
  }

  const handleCancelBooking = async () => {
    if (!bookingToCancel) return

    try {
      const booking = bookings?.find((b) => b.id === bookingToCancel)
      await update(bookingToCancel, { status: "cancelled" })

      // Keep the organizer's dashboard in sync with the linked arena booking
      if (booking?.arenaBookingId) {
        try {
          await updateArenaBooking(booking.arenaBookingId, { status: "cancelled" })
        } catch (err) {
          console.error("Error cancelling linked arena booking:", err)
        }
      }

      toast({
        title: "Reserva cancelada",
        description: "A tua reserva foi cancelada com sucesso.",
      })
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível cancelar a reserva.",
        variant: "destructive",
      })
    } finally {
      setCancelDialogOpen(false)
      setBookingToCancel(null)
    }
  }

  const handleCreateBooking = async () => {
    if (!user?.id || !newBooking.sport || !newBooking.venueId || !newBooking.date || !newBooking.time) {
      toast({
        title: "Erro",
        description: "Por favor preenche todos os campos.",
        variant: "destructive",
      })
      return
    }

    try {
      const selectedVenue = allVenues.find((v) => v.id === newBooking.venueId)
      const durationMinutes = parseInt(newBooking.duration) || 60
      const amount = ((selectedVenue?.pricePerHour || 0) * durationMinutes) / 60
      const players = parseInt(newBooking.players) || 2
      const priceStr = `€${amount.toFixed(2)}`
      const userName = user.displayName || `${user.firstName} ${user.lastName}`

      let arenaBookingId: string | undefined

      if (selectedVenue?.type === "arena") {
        // Block double-bookings on arenas: check the slot before creating
        const conflict = await findSlotConflict(
          selectedVenue.id,
          newBooking.date,
          newBooking.time,
          durationMinutes
        )
        if (conflict) {
          toast({
            title: "Horário indisponível",
            description: `Esse horário já está reservado (${conflict.time}–${conflict.endTime}). Escolhe outro horário.`,
            variant: "destructive",
          })
          return
        }

        const [startH, startM] = newBooking.time.split(":").map(Number)
        const endTime = minutesToTime((startH || 0) * 60 + (startM || 0) + durationMinutes)

        // Create the linked arena booking so the organizer sees it too
        const arenaBooking = await createArenaBooking({
          arenaId: selectedVenue.id,
          arenaName: selectedVenue.name,
          userId: user.id,
          userName,
          userEmail: user.email || "",
          userPhone: user.phone || "",
          sport: newBooking.sport,
          date: newBooking.date,
          time: newBooking.time,
          endTime,
          duration: durationMinutes,
          players,
          status: "pending",
          totalPrice: amount,
          paymentStatus: "pending",
          organizerId: selectedVenue.organizerId || "",
        })
        arenaBookingId = arenaBooking.id
      }

      await create({
        userId: user.id,
        sport: newBooking.sport,
        venue: newBooking.venue,
        venueId: newBooking.venueId,
        date: newBooking.date,
        time: newBooking.time,
        duration: `${newBooking.duration} min`,
        players,
        status: "pending",
        price: priceStr,
        ...(selectedVenue ? { venueType: selectedVenue.type } : {}),
        ...(arenaBookingId ? { arenaBookingId } : {}),
      })

      // Email automations (fire-and-forget)
      const emailInfo = {
        venueName: newBooking.venue,
        date: newBooking.date,
        time: newBooking.time,
        duration: `${durationMinutes} min`,
        players,
        price: priceStr,
      }
      sendBookingUserEmail(user.email, user.firstName, emailInfo, "pending")

      if (selectedVenue?.type === "arena") {
        if (selectedVenue.organizerEmail) {
          sendBookingOrganizerEmail(
            selectedVenue.organizerEmail,
            selectedVenue.organizerName || "Organizador",
            userName,
            emailInfo
          )
        } else if (selectedVenue.organizerId) {
          fetchDocument("users", selectedVenue.organizerId)
            .then((docData) => {
              const organizer = docData as User | null
              if (organizer?.email) {
                sendBookingOrganizerEmail(
                  organizer.email,
                  selectedVenue.organizerName || organizer.firstName || "Organizador",
                  userName,
                  emailInfo
                )
              }
            })
            .catch(() => {
              // Email is a courtesy — never block the booking flow
            })
        }
      }

      toast({
        title: "Reserva criada",
        description: "A tua reserva foi criada com sucesso.",
      })

      setCreateDialogOpen(false)
      setNewBooking({
        sport: "",
        venue: "",
        venueId: "",
        date: "",
        time: "",
        duration: "60",
        players: "2",
      })
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível criar a reserva.",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (booking: Booking) => {
    if (booking.status !== "pending" && booking.status !== "confirmed") return
    setEditingBooking(booking)
    setEditForm({
      date: booking.date,
      time: booking.time,
      duration: String(parseInt(booking.duration) || 60),
      players: String(booking.players || 2),
    })
    setEditDialogOpen(true)
  }

  const handleEditBooking = async () => {
    if (!editingBooking) return

    if (!editForm.date || !editForm.time) {
      toast({
        title: "Erro",
        description: "Por favor preenche todos os campos.",
        variant: "destructive",
      })
      return
    }

    try {
      const newDuration = parseInt(editForm.duration) || 60
      const venueInfo =
        allVenues.find((v) => v.id === editingBooking.venueId) ||
        allVenues.find((v) => v.name === editingBooking.venue)

      // For arena bookings, verify the new slot is free (own booking doesn't block)
      if (editingBooking.arenaBookingId && editingBooking.venueId) {
        const conflict = await findSlotConflict(
          editingBooking.venueId,
          editForm.date,
          editForm.time,
          newDuration
        )
        if (conflict && conflict.id !== editingBooking.arenaBookingId) {
          toast({
            title: "Horário indisponível",
            description: `Esse horário já está reservado (${conflict.time}–${conflict.endTime}). Escolhe outro horário.`,
            variant: "destructive",
          })
          return
        }
      }

      const updates: Partial<Booking> = {
        date: editForm.date,
        time: editForm.time,
        duration: `${editForm.duration} min`,
        players: parseInt(editForm.players) || 1,
      }

      // Recompute the price if the duration changed and we know the venue's rate
      const previousDuration = parseInt(editingBooking.duration) || 60
      if (newDuration !== previousDuration && venueInfo) {
        const amount = (venueInfo.pricePerHour * newDuration) / 60
        updates.price = `€${amount.toFixed(2)}`
      }

      await update(editingBooking.id, updates)

      // Keep the linked arena booking in sync for the organizer
      if (editingBooking.arenaBookingId) {
        const [startH, startM] = editForm.time.split(":").map(Number)
        const endTime = minutesToTime((startH || 0) * 60 + (startM || 0) + newDuration)
        const arenaUpdates: Partial<ArenaBooking> = {
          date: editForm.date,
          time: editForm.time,
          endTime,
          duration: newDuration,
          players: parseInt(editForm.players) || 1,
        }
        if (venueInfo) {
          arenaUpdates.totalPrice = (venueInfo.pricePerHour * newDuration) / 60
        }
        try {
          await updateArenaBooking(editingBooking.arenaBookingId, arenaUpdates)
        } catch (err) {
          console.error("Error updating linked arena booking:", err)
        }
      }

      toast({
        title: "Reserva atualizada",
        description: "A tua reserva foi atualizada com sucesso.",
      })

      setEditDialogOpen(false)
      setEditingBooking(null)
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a reserva.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-2" />
          <p className="text-gray-600">A carregar reservas...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6 text-center">
            <p className="text-red-600">Erro ao carregar reservas</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
        <p className="text-gray-600">Gere as tuas reservas de campos e jogos marcados</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximos Jogos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingGames}</div>
            <p className="text-xs text-muted-foreground">Esta semana</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Reservadas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHours}h</div>
            <p className="text-xs text-muted-foreground">Esta semana</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Bookings */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Próximas Reservas</h2>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Nova Reserva
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Reserva</DialogTitle>
                <DialogDescription>Cria uma nova reserva de campo</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Desporto</Label>
                  <Select
                    value={newBooking.sport}
                    onValueChange={(v) => setNewBooking({ ...newBooking, sport: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleciona um desporto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Futebol">Futebol</SelectItem>
                      <SelectItem value="Ténis">Ténis</SelectItem>
                      <SelectItem value="Basquetebol">Basquetebol</SelectItem>
                      <SelectItem value="Padel">Padel</SelectItem>
                      <SelectItem value="Voleibol">Voleibol</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Local</Label>
                  <Select
                    value={newBooking.venueId}
                    onValueChange={(id) => {
                      const selected = allVenues.find((v) => v.id === id)
                      setNewBooking({ ...newBooking, venueId: id, venue: selected?.name || "" })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleciona um local" />
                    </SelectTrigger>
                    <SelectContent>
                      {allVenues?.map((venue) => (
                        <SelectItem key={venue.id} value={venue.id}>
                          {venue.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input
                      type="date"
                      value={newBooking.date}
                      onChange={(e) => setNewBooking({ ...newBooking, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora</Label>
                    <Input
                      type="time"
                      value={newBooking.time}
                      onChange={(e) => setNewBooking({ ...newBooking, time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duração (min)</Label>
                    <Select
                      value={newBooking.duration}
                      onValueChange={(v) => setNewBooking({ ...newBooking, duration: v })}
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
                  <div className="space-y-2">
                    <Label>Jogadores</Label>
                    <Input
                      type="number"
                      min="1"
                      max="22"
                      value={newBooking.players}
                      onChange={(e) => setNewBooking({ ...newBooking, players: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleCreateBooking}
                  disabled={crudLoading}
                >
                  {crudLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Reserva"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Empty State */}
        {sortedBookings.length === 0 && (
          <Card className="bg-gray-50">
            <CardContent className="p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Sem reservas
              </h3>
              <p className="text-gray-600 mb-4">
                Ainda não tens nenhuma reserva. Cria uma nova reserva para começar!
              </p>
            </CardContent>
          </Card>
        )}

        {sortedBookings.map((booking) => (
          <Card key={booking.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {booking.sport}
                    <Badge className={getStatusColor(booking.status)}>
                      {getStatusLabel(booking.status)}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {booking.venue}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(booking.date).toLocaleDateString("pt-PT")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {booking.time} ({booking.duration})
                    </span>
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">{booking.price}</div>
                  <p className="text-sm text-gray-600">por pessoa</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-600">{booking.players} jogadores</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(booking)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 bg-transparent"
                    onClick={() => {
                      setBookingToCancel(booking.id)
                      setCancelDialogOpen(true)
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Booking Dialog */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open)
          if (!open) setEditingBooking(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Reserva</DialogTitle>
            <DialogDescription>
              {editingBooking ? `${editingBooking.sport} em ${editingBooking.venue}` : "Altera os detalhes da tua reserva"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={editForm.time}
                  onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duração (min)</Label>
                <Select
                  value={editForm.duration}
                  onValueChange={(v) => setEditForm({ ...editForm, duration: v })}
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
              <div className="space-y-2">
                <Label>Jogadores</Label>
                <Input
                  type="number"
                  min="1"
                  max="22"
                  value={editForm.players}
                  onChange={(e) => setEditForm({ ...editForm, players: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleEditBooking}
              disabled={crudLoading}
            >
              {crudLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Reserva</AlertDialogTitle>
            <AlertDialogDescription>
              Tens a certeza que queres cancelar esta reserva? Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não, manter</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleCancelBooking}
            >
              Sim, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
