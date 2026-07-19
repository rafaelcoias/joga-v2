"use client"

import { useEffect, useState } from "react"
import DashboardLayout from "../components/dashboard-layout"

// Import all screen components
import HomeScreen from "../components/home-screen"
import MatchMakingScreen from "../components/matchmaking-screen"
import RankingsScreen from "../components/rankings-screen"
import BookingsScreen from "../components/bookings-screen"
import VenuesScreen from "../components/venues-screen"
import MatchHistoryScreen from "../components/match-history-screen"
import PlayerSearchScreen from "../components/player-search-screen"
import FriendsScreen from "../components/friends-screen"
import ProfileScreen from "../components/profile-screen"
import StatsScreen from "../components/stats-screen"
import ArenaManagementScreen from "../components/arena-management-screen"

const SCREENS = [
  "home",
  "matchmaking",
  "rankings",
  "bookings",
  "venues",
  "history",
  "search",
  "friends",
  "stats",
  "profile",
  "arenas",
] as const

type Screen = (typeof SCREENS)[number]

const isScreen = (value: string | null): value is Screen =>
  !!value && (SCREENS as readonly string[]).includes(value)

export default function JogaApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home")

  // Honor deep links like /app?screen=rankings (used by the sidebar when
  // navigating from standalone pages such as the game detail page)
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("screen")
    if (isScreen(param)) {
      setCurrentScreen(param)
    }
  }, [])

  const navigate = (screen: string) => {
    if (!isScreen(screen)) return
    setCurrentScreen(screen)
    // Keep the URL shareable without triggering a Next.js navigation
    window.history.replaceState(null, "", screen === "home" ? "/app" : `/app?screen=${screen}`)
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case "home":
        return <HomeScreen onNavigate={navigate} />
      case "matchmaking":
        return <MatchMakingScreen />
      case "rankings":
        return <RankingsScreen />
      case "bookings":
        return <BookingsScreen />
      case "venues":
        return <VenuesScreen />
      case "history":
        return <MatchHistoryScreen />
      case "search":
        return <PlayerSearchScreen />
      case "friends":
        return <FriendsScreen />
      case "stats":
        return <StatsScreen />
      case "profile":
        return <ProfileScreen />
      case "arenas":
        return <ArenaManagementScreen />
      default:
        return <HomeScreen onNavigate={navigate} />
    }
  }

  return (
    <DashboardLayout activeScreen={currentScreen} onNavigate={navigate}>
      {renderScreen()}
    </DashboardLayout>
  )
}
