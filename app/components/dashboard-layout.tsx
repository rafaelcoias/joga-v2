"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Menu,
  Trophy,
  Calendar,
  MapPin,
  History,
  User,
  LogOut,
  Zap,
  Search,
  Heart,
  BarChart3,
  Building2,
  Home,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/contexts/AuthContext"
import NotificationBell from "./notification-bell"

interface DashboardLayoutProps {
  children: React.ReactNode
  activeScreen?: string
  onNavigate?: (screen: string) => void
}

export default function DashboardLayout({
  children,
  activeScreen,
  onNavigate,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut()
    router.push("/login")
  }

  const handleNavigation = (id: string) => {
    if (onNavigate) {
      onNavigate(id)
    } else {
      // Standalone pages (e.g. game detail) navigate back to the app,
      // preserving the target screen via query param
      router.push(id === "home" ? "/app" : `/app?screen=${id}`)
    }
    setSidebarOpen(false)
  }

  const menuItems = [
    { id: "home", label: "Início", icon: Home },
    { id: "matchmaking", label: "MatchMaking", icon: Zap },
    { id: "rankings", label: "Rankings", icon: Trophy },
    { id: "venues", label: "Arenas", icon: MapPin },
    { id: "bookings", label: "As Minhas Reservas", icon: Calendar },
    { id: "history", label: "Histórico de Jogos", icon: History },
    { id: "search", label: "Pesquisar Jogadores", icon: Search },
    { id: "friends", label: "Amigos", icon: Heart },
    { id: "stats", label: "As Minhas Estatísticas", icon: BarChart3 },
    { id: "profile", label: "Perfil", icon: User },
    // Organizer-only menu items
    ...(user?.role === "organizer"
      ? [{ id: "arenas", label: "Gerir Arenas", icon: Building2 }]
      : []),
  ]

  const Sidebar = ({ mobile = false }) => (
    <div
      className={`${
        mobile ? "w-full" : "w-64"
      } h-full bg-gradient-to-b from-green-600 to-green-800 text-white flex flex-col`}
    >
      {/* Header */}
      <div className="p-6 border-b border-green-500">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <span className="text-green-600 font-bold text-lg">J!</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">JOGA!</h1>
            <p className="text-green-200 text-sm">Find Your Game</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-green-500">
        <div className="flex items-center gap-3">
          <Avatar>
            {user?.photoURL ? <AvatarImage src={user.photoURL} /> : null}
            <AvatarFallback className="text-green-700">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user?.displayName || "Utilizador"}</p>
            <Badge variant="secondary" className="bg-green-500 text-white">
              Nível {user?.level || 1}
            </Badge>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleNavigation(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeScreen === item.id
                      ? "bg-white text-green-600"
                      : "text-green-100 hover:bg-green-700"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-green-500">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-green-100 hover:bg-green-700 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Desktop top bar */}
        <div className="hidden lg:flex items-center justify-end bg-white border-b border-gray-200 px-6 py-1.5">
          <NotificationBell onNavigate={onNavigate} />
        </div>

        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">J!</span>
              </div>
              <h1 className="text-lg font-bold text-green-600">JOGA!</h1>
            </div>
            <div className="flex items-center gap-1">
              <NotificationBell onNavigate={onNavigate} />
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="w-6 h-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-80">
                  <Sidebar mobile />
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        {/* Screen Content */}
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  )
}
