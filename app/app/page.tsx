"use client"

import { useState } from "react"
import DashboardLayout from "../components/dashboard-layout"

// Import all screen components
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

type Screen =
  | "matchmaking"
  | "rankings"
  | "bookings"
  | "venues"
  | "history"
  | "search"
  | "friends"
  | "stats"
  | "profile"
  | "arenas"

export default function JogaApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("matchmaking")

  const renderScreen = () => {
    switch (currentScreen) {
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
        return <MatchMakingScreen />
    }
  }

  return (
    <DashboardLayout
      activeScreen={currentScreen}
      onNavigate={(screen) => setCurrentScreen(screen as Screen)}
    >
      {renderScreen()}
    </DashboardLayout>
  )
}
