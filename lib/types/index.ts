import { Timestamp } from "firebase/firestore";

// Firestore timestamp type - can be either Timestamp object or serialized Date
type FirestoreTimestamp = Timestamp | Date | string;

// User Role Types
export type UserRole = "user" | "organizer" | "admin";

// User Types
export interface User {
  id: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  photoURL?: string;
  bio?: string;
  location: string;
  phone?: string;
  level: number;
  wins: number;
  losses: number;
  draws: number;
  goals: number;
  assists: number;
  points: number;
  aces: number;
  gamesPlayed: number;
  role: UserRole; // User role for permissions
  sports?: string[]; // Sports the user plays
  status?: "online" | "offline" | "playing"; // Online status
  lastActive?: FirestoreTimestamp;
  createdAt: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
  preferences?: UserPreferences;
  privacy?: PrivacySettings;
}

export interface UserPreferences {
  notifications: {
    matchInvites: boolean;
    newMessages: boolean;
    gameReminders: boolean;
    weeklyStats: boolean;
  };
  language: string;
  theme: string;
}

export interface PrivacySettings {
  profileVisible: boolean;
  statsVisible: boolean;
  onlineStatus: boolean;
}

// Match Types
export interface Match {
  id: string;
  sport: string;
  location: string;
  venue?: string;
  venueName?: string;
  time: string;
  date: string;
  playersNeeded: number;
  totalPlayers: number;
  level: string;
  organizer: string;
  organizerId: string;
  rating?: number;
  mode: "normal" | "ranked" | "local";
  totalPrice: number; // Total price in euros
  rankPoints?: number; // Points for ranked mode
  minLevel?: number;
  status: "open" | "full" | "completed" | "cancelled";
  participants: string[]; // User IDs
  participantNames?: string[]; // Display names for participants
  // Completed game fields
  hasHappened?: boolean; // Whether the game has already happened
  result?: {
    score?: string;
    winner?: "team1" | "team2" | "draw";
    notes?: string;
  };
  playerStats?: Record<string, MatchStats>; // Stats per participant userId
  createdAt: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

// Booking Types
export interface Booking {
  id: string;
  userId: string;
  matchId?: string;
  sport: string;
  venue: string;
  date: string;
  time: string;
  duration: string;
  players: number;
  status: "confirmed" | "pending" | "cancelled";
  price: string;
  createdAt: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

// Venue Types
export interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  location: string;
  sports: string[];
  rating: number;
  pricePerHour: string;
  openingHours: string;
  facilities: string[];
  amenities: string[];
  image?: string;
  phone?: string;
  email?: string;
  website?: string;
  distance?: string;
  availability?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  createdAt: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

// Match History Types
export interface MatchHistory {
  id: string;
  userId: string;
  matchId?: string;
  sport: string;
  location: string;
  venue?: string;
  date: string;
  time: string;
  duration: string;
  result: "win" | "loss" | "draw";
  score?: string;
  participants: string[];
  participantIds?: string[];
  playerCount?: number;
  myStats: MatchStats;
  mode: "normal" | "ranked" | "local";
  rankPoints?: number;
  notes?: string;
  mvp?: string;
  hasRecording?: boolean;
  createdAt: FirestoreTimestamp;
}

export interface MatchStats {
  goals?: number;
  assists?: number;
  points?: number;
  aces?: number;
  rebounds?: number;
  blocks?: number;
  steals?: number;
  rating?: number;
}

// Friend Types
export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  friendName: string;
  friendPhoto?: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: FirestoreTimestamp;
  acceptedAt?: FirestoreTimestamp;
}

// Ranking Types
export interface Ranking {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  sport: string;
  rank: number;
  points: number;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  level: number;
  gamesPlayed: number;
  winRate: number;
  // Sport-specific stats
  goals?: number;
  assists?: number;
  aces?: number;
  winners?: number;
  blocks?: number;
  updatedAt: FirestoreTimestamp;
}

// Local Game Types (for private field games)
export interface LocalGame {
  id: string;
  userId: string;
  sport: string;
  location: string;
  date: string;
  time: string;
  duration: string;
  participants: string[];
  hasHappened?: boolean; // Whether the game has already happened
  result?: string; // Only set if hasHappened is true
  myStats?: MatchStats; // Only set if hasHappened is true
  notes?: string;
  createdAt: FirestoreTimestamp;
}

// Message Types
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: FirestoreTimestamp;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: "match_invite" | "message" | "game_reminder" | "friend_request" | "system";
  title: string;
  content: string;
  read: boolean;
  actionUrl?: string;
  createdAt: FirestoreTimestamp;
}

// User Statistics Types (aggregated per user)
export interface UserStats {
  id: string;
  userId: string;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  totalHours: number;
  currentStreak: number;
  bestStreak: number;
  level: number;
  totalPoints: number;
  sportStats: Record<string, SportStats>;
  updatedAt: FirestoreTimestamp;
}

export interface SportStats {
  sport: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  hours: number;
  // Sport-specific stats
  goals?: number;
  assists?: number;
  points?: number;
  aces?: number;
  winners?: number;
  blocks?: number;
  rebounds?: number;
  steals?: number;
}

// Monthly Progress for statistics
export interface MonthlyProgress {
  id: string;
  userId: string;
  month: string;
  year: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: FirestoreTimestamp;
}

// Achievement Types
export interface Achievement {
  id: string;
  userId: string;
  name: string;
  description: string;
  icon?: string;
  completed: boolean;
  progress?: number;
  maxProgress?: number;
  unlockedAt?: FirestoreTimestamp;
  createdAt: FirestoreTimestamp;
}

// Friend Request (extends Friend with additional fields)
export interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  senderLevel: number;
  receiverId: string;
  receiverName: string;
  status: "pending" | "accepted" | "rejected";
  mutualFriends: number;
  favoriteSports: string[];
  createdAt: FirestoreTimestamp;
}

// Player (for search results - public user view)
export interface Player {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  photoURL?: string;
  level: number;
  location: string;
  sports: string[];
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  bio?: string;
  status: "online" | "offline" | "playing";
  lastActive?: FirestoreTimestamp;
}

// Arena Types (managed by organizers)
export interface Arena {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  location: string;
  organizerId: string; // The organizer who owns this arena
  organizerName: string;
  sports: string[];
  pricePerHour: number;
  openingHours: string;
  closingHours: string;
  facilities: string[];
  amenities: string[];
  images: string[];
  phone?: string;
  email?: string;
  website?: string;
  rating: number;
  totalReviews: number;
  isActive: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
  availability?: ArenaAvailability[];
  createdAt: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

export interface ArenaAvailability {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

// Arena Booking (links bookings to arenas for organizers)
export interface ArenaBooking {
  id: string;
  arenaId: string;
  arenaName: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  matchId?: string;
  sport: string;
  date: string;
  time: string;
  endTime: string;
  duration: number; // in minutes
  players: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  totalPrice: number;
  paymentStatus: "pending" | "paid" | "refunded";
  notes?: string;
  organizerId: string; // For querying by organizer
  createdAt: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}
