"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  MapPin,
  Clock,
  Users,
  Euro,
  Zap,
  X,
  Check,
  Eye,
  RotateCcw,
  PartyPopper,
} from "lucide-react"
import { Match, User } from "@/lib/types"
import { joinMatch } from "@/lib/firebase/matchService"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface MatchSwipeDeckProps {
  matches: Match[]
  user: User | null
}

const SWIPE_THRESHOLD = 110

// Tinder-style deck over open matches: swipe right (or ✓) to join,
// swipe left (or ✕) to pass. Passes are session-only.
export default function MatchSwipeDeck({ matches, user }: MatchSwipeDeckProps) {
  const { toast } = useToast()
  const [passedIds, setPassedIds] = useState<string[]>([])
  const [joinedIds, setJoinedIds] = useState<string[]>([])
  const [joining, setJoining] = useState(false)
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [leaving, setLeaving] = useState<"left" | "right" | null>(null)
  const startX = useRef(0)

  // Candidates: matches the user can actually join
  const deck = useMemo(
    () =>
      matches.filter(
        (m) =>
          m.status === "open" &&
          !m.hasHappened &&
          m.organizerId !== user?.id &&
          !(user?.id && m.participants?.includes(user.id)) &&
          !passedIds.includes(m.id) &&
          !joinedIds.includes(m.id)
      ),
    [matches, user?.id, passedIds, joinedIds]
  )

  const current = deck[0]
  const next = deck[1]

  const levelBlocked =
    !!current &&
    current.mode === "ranked" &&
    (user?.level ?? 0) < (current.minLevel ?? 0)

  const resetCard = () => {
    setDx(0)
    setDragging(false)
    setLeaving(null)
  }

  const passCurrent = () => {
    if (!current) return
    setLeaving("left")
    const id = current.id
    setTimeout(() => {
      setPassedIds((prev) => [...prev, id])
      resetCard()
    }, 200)
  }

  const joinCurrent = async () => {
    if (!current || !user || joining) return
    if (levelBlocked) {
      toast({
        title: "Nível insuficiente",
        description: `Precisas de nível ${current.minLevel} para este jogo Arranca.`,
        variant: "destructive",
      })
      resetCard()
      return
    }

    setJoining(true)
    const id = current.id
    const sport = current.sport
    try {
      await joinMatch(id, user)
      setLeaving("right")
      setTimeout(() => {
        setJoinedIds((prev) => [...prev, id])
        resetCard()
      }, 200)
      toast({
        title: "É um match! 🎉",
        description: `Estás inscrito no jogo de ${sport}. Boa sorte!`,
      })
    } catch (err) {
      resetCard()
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Não foi possível inscrever-te no jogo.",
        variant: "destructive",
      })
    } finally {
      setJoining(false)
    }
  }

  // Keyboard support: ← pass, → join
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!current || joining || leaving) return
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        passCurrent()
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        joinCurrent()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
    // passCurrent/joinCurrent are stable enough for this listener's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, joining, leaving])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (joining || leaving) return
    setDragging(true)
    startX.current = e.clientX
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || leaving) return
    setDx(e.clientX - startX.current)
  }

  const handlePointerUp = () => {
    if (!dragging || leaving) return
    setDragging(false)
    if (dx > SWIPE_THRESHOLD) {
      joinCurrent()
    } else if (dx < -SWIPE_THRESHOLD) {
      passCurrent()
    } else {
      setDx(0)
    }
  }

  if (!current) {
    return (
      <Card className="bg-gray-50">
        <CardContent className="p-12 text-center">
          <PartyPopper className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {joinedIds.length > 0 || passedIds.length > 0
              ? "Viste todos os jogos!"
              : "Nenhum jogo para descobrir"}
          </h3>
          <p className="text-gray-600 mb-4">
            {joinedIds.length > 0
              ? `Inscreveste-te em ${joinedIds.length} ${joinedIds.length === 1 ? "jogo" : "jogos"}. `
              : ""}
            Volta mais tarde ou cria o teu próprio jogo.
          </p>
          {passedIds.length > 0 && (
            <Button variant="outline" onClick={() => setPassedIds([])}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Rever jogos ignorados
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  const rotation = dx / 18
  const opacity = leaving ? 0 : 1
  const translate = leaving === "left" ? -500 : leaving === "right" ? 500 : dx

  const pricePerPerson =
    current.totalPlayers > 0
      ? ((current.totalPrice || 0) / current.totalPlayers).toFixed(2)
      : "0.00"
  const filledSlots = Math.max(0, current.totalPlayers - current.playersNeeded)

  return (
    <div className="max-w-md mx-auto select-none">
      <div className="relative h-[430px]">
        {/* Next card peeking behind */}
        {next && (
          <div className="absolute inset-0 translate-y-2 scale-[0.97]">
            <div className="h-full rounded-2xl border bg-white shadow-sm" />
          </div>
        )}

        {/* Top card */}
        <div
          className={cn(
            "absolute inset-0 touch-none cursor-grab",
            dragging && "cursor-grabbing"
          )}
          style={{
            transform: `translateX(${translate}px) rotate(${rotation}deg)`,
            opacity,
            transition: dragging ? "none" : "transform 0.2s ease, opacity 0.2s ease",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="h-full rounded-2xl border bg-white shadow-lg overflow-hidden flex flex-col">
            {/* Swipe hints */}
            <div
              className="absolute top-6 left-6 border-4 border-green-500 text-green-500 font-bold text-2xl px-3 py-1 rounded-lg rotate-[-15deg] pointer-events-none"
              style={{ opacity: Math.min(1, Math.max(0, dx / SWIPE_THRESHOLD)) }}
            >
              JOGO!
            </div>
            <div
              className="absolute top-6 right-6 border-4 border-red-500 text-red-500 font-bold text-2xl px-3 py-1 rounded-lg rotate-[15deg] pointer-events-none"
              style={{ opacity: Math.min(1, Math.max(0, -dx / SWIPE_THRESHOLD)) }}
            >
              PASSO
            </div>

            {/* Header band */}
            <div
              className={cn(
                "p-6 text-white",
                current.mode === "ranked"
                  ? "bg-gradient-to-br from-yellow-500 to-orange-500"
                  : "bg-gradient-to-br from-green-600 to-emerald-500"
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">{current.sport}</h3>
                {current.mode === "ranked" && (
                  <Badge className="bg-white/20 text-white border-0">
                    <Zap className="w-4 h-4 mr-1" />
                    Arranca
                  </Badge>
                )}
              </div>
              <p className="text-white/90 mt-1">Nível: {current.level}</p>
            </div>

            {/* Details */}
            <div className="p-6 flex-1 space-y-3">
              <p className="flex items-center gap-2 text-gray-700">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                {current.venueName || current.location}
              </p>
              <p className="flex items-center gap-2 text-gray-700">
                <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                {new Date(current.date).toLocaleDateString("pt-PT")} às {current.time}
              </p>
              <p className="flex items-center gap-2 text-gray-700">
                <Users className="w-4 h-4 text-gray-400 shrink-0" />
                {filledSlots}/{current.totalPlayers} jogadores — faltam {current.playersNeeded}
              </p>
              <p className="flex items-center gap-2 text-gray-700">
                <Euro className="w-4 h-4 text-gray-400 shrink-0" />
                {pricePerPerson}€ por pessoa
              </p>
              {current.mode === "ranked" && (
                <p className="flex items-center gap-2 text-yellow-700 text-sm">
                  <Zap className="w-4 h-4 shrink-0" />
                  +{current.rankPoints} pontos · nível mínimo {current.minLevel}
                </p>
              )}
              <p className="text-sm text-gray-500">
                Organizado por <span className="font-medium text-gray-700">{current.organizer}</span>
              </p>
              {levelBlocked && (
                <p className="text-sm text-red-500">
                  Precisas de nível {current.minLevel} para te juntares a este jogo.
                </p>
              )}
            </div>

            {/* Detail link */}
            <div className="px-6 pb-4">
              <Link
                href={`/app/game/${current.id}`}
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <Eye className="w-4 h-4 mr-1" />
                Ver detalhes
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-center gap-6 mt-6">
        <Button
          variant="outline"
          size="lg"
          className="rounded-full w-16 h-16 border-2 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
          onClick={passCurrent}
          disabled={joining || !!leaving}
          aria-label="Passar este jogo"
        >
          <X className="w-7 h-7" />
        </Button>
        <Button
          size="lg"
          className="rounded-full w-16 h-16 bg-green-600 hover:bg-green-700"
          onClick={joinCurrent}
          disabled={joining || !!leaving || levelBlocked}
          aria-label="Juntar-me a este jogo"
        >
          <Check className="w-7 h-7" />
        </Button>
      </div>
      <p className="text-center text-xs text-gray-400 mt-3">
        Arrasta (ou usa as setas ← →) — direita para te juntares, esquerda para passar
      </p>
    </div>
  )
}
