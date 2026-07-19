# JOGA! — Architecture & Implementation Summary

Status: **all screens are wired to Firebase**. This document describes how the app is put together.

## Stack

- Next.js 15 (App Router, Turbopack), React 19, TypeScript
- Firebase Web SDK: Auth, Firestore, Storage
- Tailwind CSS 4 + shadcn/ui (Radix primitives)
- react-hook-form + zod (auth forms), lucide-react icons

## Data layer

### `lib/firebase/config.ts`
Firebase initialization from `NEXT_PUBLIC_FIREBASE_*` env vars. Placeholder fallbacks keep `next build` working without credentials (a console warning fires in the browser when they're missing).

### `lib/firebase/server.ts`
Generic helpers: `fetchDocument(s)`, `getDocWithQuery`, `handleAddDoc` / `handleSetDoc` / `handleEditDoc` / `handleDeleteDoc`, `uploadImage`, `deleteFile`. All writes are sanitized with a deep `undefined`-strip (Firestore rejects `undefined` field values) and stamped with `createdAt` / `updatedAt`.

### `lib/firebase/matchService.ts`
The core of matchmaking, stats and MVP:

- **Roster model** — `Match.participants[i]` (user id, `""` for name-only guests) is index-aligned with `Match.participantNames[i]`. All roster mutations go through Firestore **transactions**:
  - `joinMatch(matchId, user)` — validates open/full/level/duplicate and appends to both arrays
  - `leaveMatch`, `addGuestToMatch`, `removeParticipantAt` — same alignment guarantees
- **`completeMatchWithStats(matchId, result)`** — marks the match completed and, exactly once (guarded by `statsApplied`), for every registered player:
  - increments `gamesPlayed`, and `wins`/`losses`/`draws` based on the winner + the `teams` map (`Record<uid, "team1"|"team2">`)
  - awards ranked points (`rankPoints` to winners, half on draw) and the **MVP bonus** (+15), recomputing `level` (100 points/level)
  - creates a `matchHistory` entry per player (with score, mode, points earned and MVP name)

### `hooks/useFirestore.ts`
`useCollection` (optional realtime), `useDocument`, `useQuery` (filters; empty filter list = whole collection; realtime option), `useCRUD`. Filter changes are tracked via a serialized key to avoid effect loops.

## Auth

`lib/contexts/AuthContext.tsx` — sign up/in/out, Firestore profile auto-provisioning, `updateUserProfile` (persists + refreshes context), `updateUserEmail`, `updateUserPassword`, `refreshUser`. Protected routes live under `app/app/` (`layout.tsx` redirects unauthenticated users to `/login`).

## Screens (`app/components/` unless noted)

| Screen | Data | Notes |
|---|---|---|
| `home-screen` | `matches`, `matchHistory` (realtime) | Default screen: greeting, quick stats, next game, pending-result alert, recent form (V/D/E), quick actions |
| `matchmaking-screen` | `matches` (realtime), `localGames` | Normal / Arranca (ranked) / Local modes; create dialog writes the aligned roster; **Descobrir** swipe deck (`match-swipe-deck.tsx`, with ← → keyboard support) + list view + **Meus Jogos** view (joined/organized games with pending-result CTA); local games with results feed user stats via `registerLocalGame` |
| `app/app/game/[id]/page` | `matches` doc | Join/leave (transactional), organizer roster management, result dialog with score, winner, **team assignment** and **MVP election** → `completeMatchWithStats` |
| `bookings-screen` | `bookings`, `venues` + `arenas` | Real per-venue pricing (pricePerHour × duration), stores `venueId`, edit + cancel dialogs |
| `venues-screen` | `arenas` (realtime) + legacy `venues` | Booking creates `arenaBookings` entries |
| `rankings-screen` | `users` (realtime) | Live leaderboard (points/wins) with top-3 podium, sport filter, current-user highlight |
| `stats-screen` | `users` doc + `matchHistory` (realtime) | All derived live: per-sport breakdown, monthly progress, computed achievements, MVP count |
| `match-history-screen` | `matchHistory` (realtime) | Aggregates, links back to the game page |
| `player-search-screen` | `users`, `friendRequests` | Friend requests with inline accept/reject |
| `friends-screen` | `friendRequests` | Live friend profiles (photo/status), Timestamp-safe dates |
| `profile-screen` | `users` via AuthContext | Photo upload to Storage, settings, password change, organizer upgrade |
| `arena-management-screen` | `arenas`, `arenaBookings` | Organizer-only; dashboard totals across all arenas |

## Firestore collections

`users`, `matches`, `localGames`, `bookings`, `venues` (legacy), `arenas`, `arenaBookings`, `matchHistory`, `friendRequests`, `rankings`, `userStats`, `monthlyProgress`, `achievements`.

## Email automations

`app/api/email/route.ts` is a Next.js server route that sends transactional emails through the **Resend** REST API (`RESEND_API_KEY` + `EMAIL_FROM` in `.env.local`; without a key the endpoint no-ops and logs, so every flow still works). Only fixed, branded pt-PT templates can be sent — the client submits structured data via `lib/email/emailService.ts` (fire-and-forget: an email failure never breaks the triggering flow).

Automations wired in:

| Trigger | Recipient(s) | Template |
|---|---|---|
| Registration | new user | `welcome` |
| Booking created (bookings/venues screens) | user + arena organizer | `booking-user`, `booking-organizer` (with price) |
| Organizer confirms/cancels a booking | user | `booking-status` |
| Player joins a match | organizer | `match-join` |
| Match completed (first time) | every registered player | `match-result` (result, score, MVP, points earned) |
| Friend request sent | receiver | `friend-request` |
| Friend request accepted | original sender | `friend-accepted` |

Booking integrity: `lib/firebase/bookingService.ts` (`findSlotConflict`) blocks double-booking an arena slot (best-effort pre-check; the organizer confirms bookings and resolves rare races). Bookings made from "As Minhas Reservas" for an arena also create a linked `arenaBookings` entry so the organizer sees them.

Users can switch match and friend emails off in the profile ("Configurações" → notification toggles: `matchInvites` gates join/result/cancellation emails, `newMessages` gates friend emails). Booking emails are transactional and always sent.

## In-app notifications

`lib/firebase/notificationService.ts` + the bell in the dashboard header (`app/components/notification-bell.tsx`, realtime unread badge, mark-as-read, deep links). Notifications fire alongside every email trigger except welcome: match joins, match cancellations, match results, bookings created/confirmed/cancelled, friend requests/acceptances. Match cancellation is a new organizer action on the game page (`cancelMatch` — confirm dialog, notifies and emails all registered players).

## Security

Rules live in `FIREBASE_SECURITY_RULES.md` and mirror the client flows, including field-restricted cross-user updates for the stats write-back (`onlyStatsFields`) and roster updates by non-organizers (`onlyRosterOrResultFields`).

> **Production note:** client-driven stats write-back is convenient but not tamper-proof. For a hardened deployment, move `completeMatchWithStats` into a Cloud Function triggered by the match update and drop the cross-user branches from the rules.

## Known limitations / next steps

- Messaging ("Mensagem" between friends) is not implemented — the types exist (`Message`, `Notification`) but no UI
- Venue map is a placeholder ("Mapa interativo em breve")
- Match duration is assumed 60 min in history entries (matches don't capture duration yet)
- The legacy `rankings`, `userStats`, `monthlyProgress` and `achievements` collections are no longer read — rankings and stats derive live from `users` and `matchHistory`
