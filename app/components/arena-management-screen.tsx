"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Clock, Star, Plus, Edit, Trash2, Loader2, Building2, Calendar, Euro, Users } from "lucide-react"
import { useAuth } from "@/lib/contexts/AuthContext"
import { useQuery, useCRUD } from "@/hooks/useFirestore"
import { Arena, ArenaBooking } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

const AVAILABLE_SPORTS = ["Futebol", "Ténis", "Basquetebol", "Padel", "Voleibol", "Futsal"]
const AVAILABLE_FACILITIES = ["Balneários", "Estacionamento", "Iluminação", "Bar/Cafetaria", "Equipamento para alugar", "Wi-Fi"]

export default function ArenaManagementScreen() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingArena, setEditingArena] = useState<Arena | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [selectedArenaForBookings, setSelectedArenaForBookings] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("arenas")

  // Fetch arenas owned by current user
  const { data: myArenas, loading: arenasLoading } = useQuery<Arena>(
    "arenas",
    [{ field: "organizerId", operator: "==", value: user?.id || "" }],
    { enabled: !!user?.id && user?.role === "organizer", realtime: true }
  )

  // Fetch bookings for selected arena
  const { data: arenaBookings, loading: bookingsLoading } = useQuery<ArenaBooking>(
    "arenaBookings",
    [{ field: "arenaId", operator: "==", value: selectedArenaForBookings || "" }],
    { enabled: !!selectedArenaForBookings, realtime: true }
  )

  // CRUD operations
  const { create: createArena, update: updateArena, remove: removeArena } = useCRUD<Arena>("arenas")
  const { update: updateBooking } = useCRUD<ArenaBooking>("arenaBookings")

  // Arena form state
  const [arenaForm, setArenaForm] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    location: "",
    sports: [] as string[],
    pricePerHour: "",
    openingHours: "08:00",
    closingHours: "22:00",
    facilities: [] as string[],
    phone: "",
    email: "",
    website: "",
  })

  const resetForm = () => {
    setArenaForm({
      name: "",
      description: "",
      address: "",
      city: "",
      location: "",
      sports: [],
      pricePerHour: "",
      openingHours: "08:00",
      closingHours: "22:00",
      facilities: [],
      phone: "",
      email: "",
      website: "",
    })
  }

  const handleCreateArena = async () => {
    if (!user?.id || !arenaForm.name || !arenaForm.address || !arenaForm.city) {
      toast({
        title: "Erro",
        description: "Por favor preenche todos os campos obrigatórios.",
        variant: "destructive",
      })
      return
    }

    try {
      const arenaData: Omit<Arena, "id" | "createdAt"> = {
        name: arenaForm.name,
        description: arenaForm.description,
        address: arenaForm.address,
        city: arenaForm.city,
        location: `${arenaForm.city}, Portugal`,
        organizerId: user.id,
        organizerName: user.displayName || `${user.firstName} ${user.lastName}`,
        sports: arenaForm.sports,
        pricePerHour: parseFloat(arenaForm.pricePerHour) || 0,
        openingHours: arenaForm.openingHours,
        closingHours: arenaForm.closingHours,
        facilities: arenaForm.facilities,
        amenities: arenaForm.facilities,
        images: [],
        phone: arenaForm.phone || "",
        email: arenaForm.email || "",
        website: arenaForm.website || "",
        rating: 0,
        totalReviews: 0,
        isActive: true,
      }

      await createArena(arenaData)

      toast({
        title: "Arena criada!",
        description: "A tua arena foi criada com sucesso.",
      })

      setCreateDialogOpen(false)
      resetForm()
    } catch (err) {
      console.error("Error creating arena:", err)
      toast({
        title: "Erro",
        description: "Não foi possível criar a arena.",
        variant: "destructive",
      })
    }
  }

  const handleEditArena = async () => {
    if (!editingArena) return

    try {
      const updateData: Partial<Arena> = {
        name: arenaForm.name,
        description: arenaForm.description,
        address: arenaForm.address,
        city: arenaForm.city,
        location: `${arenaForm.city}, Portugal`,
        sports: arenaForm.sports,
        pricePerHour: parseFloat(arenaForm.pricePerHour) || 0,
        openingHours: arenaForm.openingHours,
        closingHours: arenaForm.closingHours,
        facilities: arenaForm.facilities,
        amenities: arenaForm.facilities,
        phone: arenaForm.phone || undefined,
        email: arenaForm.email || undefined,
        website: arenaForm.website || undefined,
      }

      await updateArena(editingArena.id, updateData)

      toast({
        title: "Arena atualizada!",
        description: "As alterações foram guardadas com sucesso.",
      })

      setEditingArena(null)
      resetForm()
    } catch (err) {
      console.error("Error updating arena:", err)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a arena.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteArena = async (arenaId: string) => {
    setProcessingId(arenaId)
    try {
      await removeArena(arenaId)
      toast({
        title: "Arena eliminada",
        description: "A arena foi eliminada com sucesso.",
      })
    } catch (err) {
      console.error("Error deleting arena:", err)
      toast({
        title: "Erro",
        description: "Não foi possível eliminar a arena.",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleToggleArenaActive = async (arena: Arena) => {
    try {
      await updateArena(arena.id, { isActive: !arena.isActive })
      toast({
        title: arena.isActive ? "Arena desativada" : "Arena ativada",
        description: arena.isActive 
          ? "A arena já não está visível para reservas."
          : "A arena está agora disponível para reservas.",
      })
    } catch (err) {
      console.error("Error toggling arena:", err)
      toast({
        title: "Erro",
        description: "Não foi possível alterar o estado da arena.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateBookingStatus = async (bookingId: string, status: ArenaBooking["status"]) => {
    try {
      await updateBooking(bookingId, { status })
      toast({
        title: "Reserva atualizada",
        description: `O estado da reserva foi alterado para ${status}.`,
      })
    } catch (err) {
      console.error("Error updating booking:", err)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a reserva.",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (arena: Arena) => {
    setArenaForm({
      name: arena.name,
      description: arena.description,
      address: arena.address,
      city: arena.city,
      location: arena.location,
      sports: arena.sports,
      pricePerHour: arena.pricePerHour.toString(),
      openingHours: arena.openingHours,
      closingHours: arena.closingHours,
      facilities: arena.facilities,
      phone: arena.phone || "",
      email: arena.email || "",
      website: arena.website || "",
    })
    setEditingArena(arena)
  }

  const toggleSport = (sport: string) => {
    setArenaForm(prev => ({
      ...prev,
      sports: prev.sports.includes(sport)
        ? prev.sports.filter(s => s !== sport)
        : [...prev.sports, sport]
    }))
  }

  const toggleFacility = (facility: string) => {
    setArenaForm(prev => ({
      ...prev,
      facilities: prev.facilities.includes(facility)
        ? prev.facilities.filter(f => f !== facility)
        : [...prev.facilities, facility]
    }))
  }

  // Stats for dashboard
  const totalArenas = myArenas?.length || 0
  const activeArenas = myArenas?.filter(a => a.isActive).length || 0
  const totalBookings = arenaBookings?.length || 0
  const pendingBookings = arenaBookings?.filter(b => b.status === "pending").length || 0

  // Check if user is an organizer
  if (user?.role !== "organizer") {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6 text-center">
            <Building2 className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Acesso Restrito
            </h3>
            <p className="text-gray-600 mb-4">
              Esta área é exclusiva para organizadores. Se geres arenas ou campos desportivos,
              contacta o suporte para atualizar a tua conta.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (arenasLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-2" />
          <p className="text-gray-600">A carregar arenas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestão de Arenas</h1>
        <p className="text-gray-600">Gere as tuas arenas e visualiza as reservas</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <Building2 className="w-8 h-8 mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold">{totalArenas}</p>
            <p className="text-sm text-gray-600">Total Arenas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <p className="text-2xl font-bold">{activeArenas}</p>
            <p className="text-sm text-gray-600">Ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="w-8 h-8 mx-auto text-purple-600 mb-2" />
            <p className="text-2xl font-bold">{totalBookings}</p>
            <p className="text-sm text-gray-600">Reservas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 mx-auto text-yellow-600 mb-2" />
            <p className="text-2xl font-bold">{pendingBookings}</p>
            <p className="text-sm text-gray-600">Pendentes</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="arenas">As Minhas Arenas</TabsTrigger>
          <TabsTrigger value="bookings">Reservas</TabsTrigger>
        </TabsList>

        <TabsContent value="arenas" className="space-y-6">
          {/* Create Arena Button */}
          <div className="flex justify-end">
            <Dialog open={createDialogOpen} onOpenChange={(open) => {
              setCreateDialogOpen(open)
              if (!open) resetForm()
            }}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Nova Arena
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Criar Nova Arena</DialogTitle>
                  <DialogDescription>
                    Preenche os detalhes da tua nova arena desportiva.
                  </DialogDescription>
                </DialogHeader>
                <ArenaForm
                  form={arenaForm}
                  setForm={setArenaForm}
                  toggleSport={toggleSport}
                  toggleFacility={toggleFacility}
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={handleCreateArena}>
                    Criar Arena
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Arenas List */}
          {(!myArenas || myArenas.length === 0) ? (
            <Card className="bg-gray-50">
              <CardContent className="p-12 text-center">
                <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Sem arenas
                </h3>
                <p className="text-gray-600 mb-4">
                  Ainda não criaste nenhuma arena. Começa por criar a tua primeira!
                </p>
                <Button onClick={() => setCreateDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Arena
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {myArenas.map((arena) => (
                <Card key={arena.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {arena.name}
                          <Badge className={arena.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                            {arena.isActive ? "Ativa" : "Inativa"}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-2">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {arena.address}, {arena.city}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {arena.openingHours} - {arena.closingHours}
                          </span>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {arena.rating > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{arena.rating.toFixed(1)}</span>
                            <span className="text-sm text-gray-500">({arena.totalReviews})</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Description */}
                      {arena.description && (
                        <p className="text-sm text-gray-600">{arena.description}</p>
                      )}

                      {/* Sports */}
                      <div className="flex flex-wrap gap-1">
                        {arena.sports.map((sport) => (
                          <Badge key={sport} variant="secondary" className="text-xs">
                            {sport}
                          </Badge>
                        ))}
                      </div>

                      {/* Price */}
                      <div className="flex items-center gap-2">
                        <Euro className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-600">€{arena.pricePerHour}/hora</span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedArenaForBookings(arena.id)
                            setActiveTab("bookings")
                          }}
                        >
                          <Calendar className="w-4 h-4 mr-1" />
                          Ver Reservas
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(arena)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        <div className="flex items-center gap-2 ml-auto">
                          <Switch
                            checked={arena.isActive}
                            onCheckedChange={() => handleToggleArenaActive(arena)}
                          />
                          <span className="text-sm text-gray-600">
                            {arena.isActive ? "Ativa" : "Inativa"}
                          </span>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              disabled={processingId === arena.id}
                            >
                              {processingId === arena.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminar Arena</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tens a certeza que queres eliminar "{arena.name}"? Esta ação não pode ser revertida.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => handleDeleteArena(arena.id)}
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bookings" className="space-y-6">
          {/* Arena Selector */}
          <div className="flex items-center gap-4">
            <Label>Selecionar Arena:</Label>
            <Select
              value={selectedArenaForBookings || ""}
              onValueChange={(value) => setSelectedArenaForBookings(value)}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Escolhe uma arena" />
              </SelectTrigger>
              <SelectContent>
                {myArenas?.map((arena) => (
                  <SelectItem key={arena.id} value={arena.id}>
                    {arena.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bookings List */}
          {!selectedArenaForBookings ? (
            <Card className="bg-gray-50">
              <CardContent className="p-12 text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Seleciona uma arena
                </h3>
                <p className="text-gray-600">
                  Escolhe uma arena para ver as suas reservas.
                </p>
              </CardContent>
            </Card>
          ) : bookingsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
          ) : (!arenaBookings || arenaBookings.length === 0) ? (
            <Card className="bg-gray-50">
              <CardContent className="p-12 text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Sem reservas
                </h3>
                <p className="text-gray-600">
                  Esta arena ainda não tem reservas.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {arenaBookings.map((booking) => (
                <Card key={booking.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{booking.userName}</h3>
                          <p className="text-sm text-gray-600">
                            {booking.sport} • {booking.players} jogadores
                          </p>
                          <p className="text-sm text-gray-600">
                            {booking.date} às {booking.time} ({booking.duration} min)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium text-green-600">€{booking.totalPrice}</p>
                          <Badge className={
                            booking.status === "confirmed" ? "bg-green-100 text-green-800" :
                            booking.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                            booking.status === "cancelled" ? "bg-red-100 text-red-800" :
                            "bg-gray-100 text-gray-800"
                          }>
                            {booking.status === "confirmed" ? "Confirmada" :
                             booking.status === "pending" ? "Pendente" :
                             booking.status === "cancelled" ? "Cancelada" :
                             "Concluída"}
                          </Badge>
                        </div>
                        {booking.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleUpdateBookingStatus(booking.id, "confirmed")}
                            >
                              Confirmar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                              onClick={() => handleUpdateBookingStatus(booking.id, "cancelled")}
                            >
                              Cancelar
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Arena Dialog */}
      <Dialog open={!!editingArena} onOpenChange={(open) => {
        if (!open) {
          setEditingArena(null)
          resetForm()
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Arena</DialogTitle>
            <DialogDescription>
              Atualiza os detalhes da tua arena.
            </DialogDescription>
          </DialogHeader>
          <ArenaForm
            form={arenaForm}
            setForm={setArenaForm}
            toggleSport={toggleSport}
            toggleFacility={toggleFacility}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingArena(null)}>
              Cancelar
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleEditArena}>
              Guardar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Arena Form Component
function ArenaForm({
  form,
  setForm,
  toggleSport,
  toggleFacility,
}: {
  form: {
    name: string;
    description: string;
    address: string;
    city: string;
    location: string;
    sports: string[];
    pricePerHour: string;
    openingHours: string;
    closingHours: string;
    facilities: string[];
    phone: string;
    email: string;
    website: string;
  };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  toggleSport: (sport: string) => void;
  toggleFacility: (facility: string) => void;
}) {
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome da Arena *</Label>
        <Input
          id="name"
          placeholder="Ex: Arena Sport Lisboa"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          placeholder="Descreve a tua arena..."
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="address">Morada *</Label>
          <Input
            id="address"
            placeholder="Ex: Rua do Desporto, 123"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Cidade *</Label>
          <Input
            id="city"
            placeholder="Ex: Lisboa"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Desportos Disponíveis</Label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_SPORTS.map((sport) => (
            <Badge
              key={sport}
              variant={form.sports.includes(sport) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleSport(sport)}
            >
              {sport}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="pricePerHour">Preço por Hora (€)</Label>
          <Input
            id="pricePerHour"
            type="number"
            min="0"
            placeholder="25"
            value={form.pricePerHour}
            onChange={(e) => setForm({ ...form, pricePerHour: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="openingHours">Abertura</Label>
          <Input
            id="openingHours"
            type="time"
            value={form.openingHours}
            onChange={(e) => setForm({ ...form, openingHours: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="closingHours">Fecho</Label>
          <Input
            id="closingHours"
            type="time"
            value={form.closingHours}
            onChange={(e) => setForm({ ...form, closingHours: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Instalações e Comodidades</Label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_FACILITIES.map((facility) => (
            <Badge
              key={facility}
              variant={form.facilities.includes(facility) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleFacility(facility)}
            >
              {facility}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+351 912 345 678"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="arena@exemplo.pt"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            type="url"
            placeholder="https://..."
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />
        </div>
      </div>
    </div>
  )
}
