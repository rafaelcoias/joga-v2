"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet"
import { MapPin, Star, Euro, Search, Loader2, Clock, Phone, Mail, Calendar, SlidersHorizontal, X } from "lucide-react"
import { useCollection, useCRUD, useQuery } from "@/hooks/useFirestore"
import { Arena, ArenaBooking, User, Venue } from "@/lib/types"
import { useAuth } from "@/lib/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { findSlotConflict } from "@/lib/firebase/bookingService"
import { fetchDocument } from "@/lib/firebase/server"
import { sendBookingOrganizerEmail, sendBookingUserEmail } from "@/lib/email/emailService"
import Image from "next/image"

export default function VenuesScreen() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSport, setSelectedSport] = useState("all")
  const [selectedCity, setSelectedCity] = useState("all")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100])
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false)
  const [selectedArena, setSelectedArena] = useState<Arena | null>(null)
  const [bookingForm, setBookingForm] = useState({
    date: "",
    time: "",
    duration: "60",
    sport: "",
    players: "2",
  })
  const [bookingLoading, setBookingLoading] = useState(false)

  const { user } = useAuth()
  const { toast } = useToast()

  // Fetch ALL arenas from Firebase (filter isActive on client side)
  const { data: arenas, loading: arenasLoading } = useCollection<Arena>(
    "arenas",
    { realtime: true }
  )

  // Also fetch legacy venues if any
  const { data: legacyVenues, loading: venuesLoading } = useQuery<Venue>(
    "venues",
    [],
    { realtime: true }
  )

  const loading = arenasLoading || venuesLoading

  // CRUD for bookings
  const { create: createBooking } = useCRUD<ArenaBooking>("arenaBookings")

  // Convert legacy venues to arena format for unified display.
  // Legacy venues keep their free-text availability as a display label.
  const allVenues = useMemo(() => {
    const arenaList: (Arena & { availabilityLabel?: string })[] = arenas || []
    const venueList = (legacyVenues || []).map((v) => {
      const { availability, ...rest } = v
      return {
        ...rest,
        organizerId: "",
        organizerName: "",
        pricePerHour: parseFloat(v.pricePerHour) || 0,
        openingHours: v.openingHours || "08:00",
        closingHours: "22:00",
        isActive: true,
        totalReviews: 0,
        images: v.image ? [v.image] : [],
        availabilityLabel: availability,
      } as Arena & { availabilityLabel?: string }
    })

    return [...arenaList, ...venueList]
  }, [arenas, legacyVenues])

  // Filter venues based on search, sport, city, price, and availability
  const filteredVenues = useMemo(() => {
    if (!allVenues) return []

    return allVenues.filter((venue) => {
      // Only show active arenas (or those without isActive field set)
      if (showOnlyAvailable && venue.isActive === false) return false

      const matchesSearch =
        venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.city?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesSport =
        selectedSport === "all" ||
        venue.sports?.some((sport) =>
          sport.toLowerCase().includes(selectedSport.toLowerCase())
        )

      const matchesCity =
        selectedCity === "all" ||
        venue.city?.toLowerCase() === selectedCity.toLowerCase()

      const matchesPrice =
        venue.pricePerHour >= priceRange[0] && venue.pricePerHour <= priceRange[1]

      return matchesSearch && matchesSport && matchesCity && matchesPrice
    })
  }, [allVenues, searchTerm, selectedSport, selectedCity, priceRange, showOnlyAvailable])

  // Get unique sports from all venues for the filter
  const availableSports = useMemo(() => {
    if (!allVenues) return []
    const sports = new Set<string>()
    allVenues.forEach((venue) => {
      venue.sports?.forEach((sport) => sports.add(sport))
    })
    return Array.from(sports).sort()
  }, [allVenues])

  // Get unique cities from all venues for the filter
  const availableCities = useMemo(() => {
    if (!allVenues) return []
    const cities = new Set<string>()
    allVenues.forEach((venue) => {
      if (venue.city) cities.add(venue.city)
    })
    return Array.from(cities).sort()
  }, [allVenues])

  // Get max price for slider
  const maxPrice = useMemo(() => {
    if (!allVenues || allVenues.length === 0) return 100
    return Math.max(...allVenues.map(v => v.pricePerHour || 0), 100)
  }, [allVenues])

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (selectedCity !== "all") count++
    if (priceRange[0] > 0 || priceRange[1] < maxPrice) count++
    if (!showOnlyAvailable) count++
    return count
  }, [selectedCity, priceRange, maxPrice, showOnlyAvailable])

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm("")
    setSelectedSport("all")
    setSelectedCity("all")
    setPriceRange([0, maxPrice])
    setShowOnlyAvailable(true)
  }

  const openBookingDialog = (arena: Arena) => {
    setSelectedArena(arena)
    setBookingForm({
      date: "",
      time: arena.openingHours || "10:00",
      duration: "60",
      sport: arena.sports?.[0] || "",
      players: "2",
    })
    setBookingDialogOpen(true)
  }

  const handleCreateBooking = async () => {
    if (!selectedArena || !user || !bookingForm.date || !bookingForm.time) {
      toast({
        title: "Erro",
        description: "Por favor preenche todos os campos obrigatórios.",
        variant: "destructive",
      })
      return
    }

    setBookingLoading(true)
    try {
      const durationMinutes = parseInt(bookingForm.duration)
      const pricePerHour = selectedArena.pricePerHour || 0
      const totalPrice = (pricePerHour * durationMinutes) / 60

      // Calculate end time
      const [hours, minutes] = bookingForm.time.split(":").map(Number)
      const endHours = hours + Math.floor((minutes + durationMinutes) / 60)
      const endMinutes = (minutes + durationMinutes) % 60
      const endTime = `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`

      // Block double-bookings: check the slot before creating
      const conflict = await findSlotConflict(
        selectedArena.id,
        bookingForm.date,
        bookingForm.time,
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

      const bookingData: Omit<ArenaBooking, "id" | "createdAt" | "updatedAt"> = {
        arenaId: selectedArena.id,
        arenaName: selectedArena.name,
        organizerId: selectedArena.organizerId,
        userId: user.id,
        userName: user.displayName || `${user.firstName} ${user.lastName}`,
        userEmail: user.email,
        userPhone: user.phone || "",
        date: bookingForm.date,
        time: bookingForm.time,
        endTime,
        duration: durationMinutes,
        sport: bookingForm.sport,
        players: parseInt(bookingForm.players),
        status: "pending",
        totalPrice,
        paymentStatus: "pending",
      }

      await createBooking(bookingData)

      // Email automations (fire-and-forget)
      const emailInfo = {
        venueName: selectedArena.name,
        date: bookingForm.date,
        time: bookingForm.time,
        duration: `${durationMinutes} min`,
        players: parseInt(bookingForm.players),
        price: `€${totalPrice.toFixed(2)}`,
      }
      const userName = user.displayName || `${user.firstName} ${user.lastName}`
      sendBookingUserEmail(user.email, user.firstName, emailInfo, "pending")

      const arena = selectedArena
      if (arena.email) {
        sendBookingOrganizerEmail(arena.email, arena.organizerName || "Organizador", userName, emailInfo)
      } else if (arena.organizerId) {
        fetchDocument("users", arena.organizerId)
          .then((docData) => {
            const organizer = docData as User | null
            if (organizer?.email) {
              sendBookingOrganizerEmail(
                organizer.email,
                arena.organizerName || organizer.firstName || "Organizador",
                userName,
                emailInfo
              )
            }
          })
          .catch(() => {
            // Email is a courtesy — never block the booking flow
          })
      }

      toast({
        title: "Reserva enviada!",
        description: "A tua reserva foi enviada e aguarda confirmação do organizador.",
      })

      setBookingDialogOpen(false)
      setSelectedArena(null)
    } catch (err) {
      console.error("Error creating booking:", err)
      toast({
        title: "Erro",
        description: "Não foi possível criar a reserva.",
        variant: "destructive",
      })
    } finally {
      setBookingLoading(false)
    }
  }

  if (loading) {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Arenas</h1>
        <p className="text-gray-600">Descobre e reserva os melhores campos da tua área</p>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Procurar por nome ou localização..."
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
            {availableSports.map((sport) => (
              <SelectItem key={sport} value={sport.toLowerCase()}>
                {sport}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2 bg-transparent relative">
              <SlidersHorizontal className="w-4 h-4" />
              Mais Filtros
              {activeFiltersCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-green-600">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filtros Avançados</SheetTitle>
              <SheetDescription>
                Refine a sua pesquisa de arenas
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 py-6">
              {/* City Filter */}
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as cidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as cidades</SelectItem>
                    {availableCities.map((city) => (
                      <SelectItem key={city} value={city.toLowerCase()}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range Filter */}
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label>Preço por hora</Label>
                  <span className="text-sm text-gray-600">
                    €{priceRange[0]} - €{priceRange[1]}
                  </span>
                </div>
                <div className="px-2">
                  <Slider
                    min={0}
                    max={maxPrice}
                    step={5}
                    value={priceRange}
                    onValueChange={(value) => setPriceRange(value as [number, number])}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Availability Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Apenas disponíveis</Label>
                  <p className="text-sm text-gray-500">Mostrar apenas arenas ativas</p>
                </div>
                <Switch
                  checked={showOnlyAvailable}
                  onCheckedChange={setShowOnlyAvailable}
                />
              </div>
            </div>
            <SheetFooter className="flex gap-2">
              <Button variant="outline" onClick={resetFilters} className="flex-1">
                <X className="w-4 h-4 mr-2" />
                Limpar Tudo
              </Button>
              <Button onClick={() => setFiltersOpen(false)} className="flex-1 bg-green-600 hover:bg-green-700">
                Aplicar Filtros
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* Map Placeholder */}
      <Card className="mb-8">
        <CardContent className="p-0">
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Mapa dos campos próximos</p>
              <p className="text-sm text-gray-500">Mapa interativo em breve</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {filteredVenues.length === 0 && !loading && (
        <Card className="bg-gray-50">
          <CardContent className="p-12 text-center">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhuma arena encontrada
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedSport !== "all"
                ? "Tenta ajustar os filtros de pesquisa"
                : "Ainda não existem arenas registadas"}
            </p>
            {(searchTerm || selectedSport !== "all") && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setSelectedSport("all")
                }}
              >
                Limpar filtros
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Venues Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredVenues.map((venue) => (
          <Card key={venue.id} className="hover:shadow-lg transition-shadow">
            <div className="relative">
              <div className="w-full h-48 relative bg-gray-200 rounded-t-lg overflow-hidden">
                {venue.images?.[0] ? (
                  <Image
                    src={venue.images[0]}
                    alt={venue.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <MapPin className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>
              {venue.isActive !== false && (
                <Badge className="absolute top-3 right-3 bg-green-500 hover:bg-green-600">
                  {venue.availabilityLabel || "Disponível"}
                </Badge>
              )}
            </div>

            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{venue.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <MapPin className="w-4 h-4" />
                    {venue.address}, {venue.city}
                  </CardDescription>
                  <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                    <Clock className="w-3 h-3" />
                    {venue.openingHours} - {venue.closingHours}
                  </div>
                </div>
                {venue.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{venue.rating.toFixed(1)}</span>
                    {venue.totalReviews > 0 && (
                      <span className="text-sm text-gray-500">({venue.totalReviews})</span>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                {/* Description */}
                {venue.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{venue.description}</p>
                )}

                {/* Sports */}
                {venue.sports && venue.sports.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Desportos disponíveis:</p>
                    <div className="flex flex-wrap gap-1">
                      {venue.sports.map((sport) => (
                        <Badge key={sport} variant="outline" className="text-xs">
                          {sport}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Amenities */}
                {(venue.amenities?.length > 0 || venue.facilities?.length > 0) && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Comodidades:</p>
                    <div className="flex flex-wrap gap-1">
                      {(venue.amenities || venue.facilities || []).slice(0, 4).map((amenity) => (
                        <Badge key={amenity} variant="secondary" className="text-xs">
                          {amenity}
                        </Badge>
                      ))}
                      {(venue.amenities?.length || 0) + (venue.facilities?.length || 0) > 4 && (
                        <Badge variant="secondary" className="text-xs">
                          +{(venue.amenities?.length || 0) + (venue.facilities?.length || 0) - 4}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Contact info */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  {venue.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {venue.phone}
                    </span>
                  )}
                  {venue.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {venue.email}
                    </span>
                  )}
                </div>

                {/* Price and Actions */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="flex items-center gap-1">
                    <Euro className="w-4 h-4 text-green-600" />
                    <span className="font-bold text-green-600">€{venue.pricePerHour}</span>
                    <span className="text-sm text-gray-600">/hora</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => openBookingDialog(venue)}
                      disabled={!user}
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      Reservar
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Booking Dialog */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reservar Arena</DialogTitle>
            <DialogDescription>
              {selectedArena?.name} - €{selectedArena?.pricePerHour}/hora
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="booking-date">Data *</Label>
              <Input
                id="booking-date"
                type="date"
                value={bookingForm.date}
                onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="booking-time">Hora *</Label>
                <Input
                  id="booking-time"
                  type="time"
                  value={bookingForm.time}
                  onChange={(e) => setBookingForm({ ...bookingForm, time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-duration">Duração</Label>
                <Select
                  value={bookingForm.duration}
                  onValueChange={(v) => setBookingForm({ ...bookingForm, duration: v })}
                >
                  <SelectTrigger id="booking-duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1h 30min</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="booking-sport">Desporto *</Label>
                <Select
                  value={bookingForm.sport}
                  onValueChange={(v) => setBookingForm({ ...bookingForm, sport: v })}
                >
                  <SelectTrigger id="booking-sport">
                    <SelectValue placeholder="Escolhe..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedArena?.sports?.map((sport) => (
                      <SelectItem key={sport} value={sport}>
                        {sport}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-players">Jogadores</Label>
                <Select
                  value={bookingForm.players}
                  onValueChange={(v) => setBookingForm({ ...bookingForm, players: v })}
                >
                  <SelectTrigger id="booking-players">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} jogadores
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Price Preview */}
            {bookingForm.date && bookingForm.time && selectedArena && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Preço estimado:</span>
                  <span className="text-xl font-bold text-green-600">
                    €{((selectedArena.pricePerHour * parseInt(bookingForm.duration)) / 60).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleCreateBooking}
              disabled={bookingLoading || !bookingForm.date || !bookingForm.time || !bookingForm.sport}
            >
              {bookingLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Calendar className="w-4 h-4 mr-2" />
              )}
              Confirmar Reserva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
