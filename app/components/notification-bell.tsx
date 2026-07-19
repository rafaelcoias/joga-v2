"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/contexts/AuthContext"
import { useQuery } from "@/hooks/useFirestore"
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/firebase/notificationService"
import { Notification } from "@/lib/types"
import { cn, formatDate } from "@/lib/utils"

const TYPE_ICON: Record<string, string> = {
  match_invite: "⚡",
  match_update: "📣",
  friend_request: "🤝",
  booking: "🏟️",
  message: "💬",
  game_reminder: "⏰",
  system: "🔔",
}

interface NotificationBellProps {
  // When rendered inside /app, navigating switches the screen in place;
  // standalone pages fall back to a router push.
  onNavigate?: (screen: string) => void
}

export default function NotificationBell({ onNavigate }: NotificationBellProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const { data: notifications } = useQuery<Notification>(
    "notifications",
    [{ field: "userId", operator: "==", value: user?.id || "" }],
    { enabled: !!user?.id, realtime: true }
  )

  const sorted = useMemo(() => {
    if (!notifications) return []
    return [...notifications]
      .sort((a, b) => {
        const sa = (a.createdAt as { seconds?: number })?.seconds || 0
        const sb = (b.createdAt as { seconds?: number })?.seconds || 0
        return sb - sa
      })
      .slice(0, 15)
  }, [notifications])

  const unreadCount = useMemo(
    () => (notifications || []).filter((n) => !n.read).length,
    [notifications]
  )

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  const handleItemClick = (n: Notification) => {
    if (!n.read) {
      markNotificationRead(n.id).catch(() => {})
    }
    setOpen(false)
    if (!n.actionUrl) return

    const screenMatch = n.actionUrl.match(/^\/app\?screen=([a-z]+)$/)
    if (screenMatch && onNavigate) {
      onNavigate(screenMatch[1])
    } else {
      router.push(n.actionUrl)
    }
  }

  const handleMarkAll = async () => {
    const unreadIds = (notifications || []).filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length === 0) return
    setMarkingAll(true)
    try {
      await markAllNotificationsRead(unreadIds)
    } catch {
      // realtime listener will reflect whatever succeeded
    } finally {
      setMarkingAll(false)
    }
  }

  if (!user) return null

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} por ler)` : ""}`}
        onClick={() => setOpen((v) => !v)}
        className="relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <p className="font-semibold text-gray-900 text-sm">Notificações</p>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                disabled={markingAll}
                className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
              >
                {markingAll ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                Marcar tudo como lido
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {sorted.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8 px-4">
                Ainda não tens notificações.
              </p>
            ) : (
              sorted.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 transition-colors flex gap-3",
                    !n.read && "bg-green-50/60"
                  )}
                >
                  <span className="text-lg leading-none mt-0.5">
                    {TYPE_ICON[n.type] || "🔔"}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-900 truncate">
                      {n.title}
                      {!n.read && (
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500 ml-2 align-middle" />
                      )}
                    </span>
                    <span className="block text-xs text-gray-600 line-clamp-2">{n.content}</span>
                    <span className="block text-[11px] text-gray-400 mt-0.5">
                      {formatDate(n.createdAt)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
