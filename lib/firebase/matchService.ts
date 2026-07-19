import {
  collection,
  doc,
  runTransaction,
  Timestamp,
} from "firebase/firestore";

import { db } from "./config";
import { fetchDocument } from "./server";
import { Match, MatchStats, User } from "@/lib/types";
import { sendMatchJoinEmail, sendMatchResultEmail } from "@/lib/email/emailService";

// Points awarded when a ranked match completes
export const MVP_BONUS_POINTS = 15;
const POINTS_PER_LEVEL = 100;

const levelForPoints = (points: number) =>
  Math.max(1, Math.floor(points / POINTS_PER_LEVEL) + 1);

// The roster arrays on a Match are index-aligned:
// participantNames[i] is the display name for participants[i],
// where participants[i] === "" marks a guest added by name only.
const rosterSize = (match: Match) =>
  Math.max(match.participants?.length ?? 0, match.participantNames?.length ?? 0);

const normalizedRoster = (match: Match): { ids: string[]; names: string[] } => {
  const size = rosterSize(match);
  const ids: string[] = [];
  const names: string[] = [];
  for (let i = 0; i < size; i++) {
    ids.push(match.participants?.[i] ?? "");
    names.push(match.participantNames?.[i] ?? match.participants?.[i] ?? "Jogador");
  }
  return { ids, names };
};

const rosterUpdate = (match: Match, ids: string[], names: string[]) => {
  const playersNeeded = Math.max(0, match.totalPlayers - names.length);
  return {
    participants: ids,
    participantNames: names,
    playersNeeded,
    status:
      match.status === "completed" || match.status === "cancelled"
        ? match.status
        : playersNeeded === 0
          ? ("full" as const)
          : ("open" as const),
    updatedAt: Timestamp.fromDate(new Date()),
  };
};

// Atomically join a match. Throws with a user-readable message on failure.
// On success, notifies the organizer by email (fire-and-forget).
export async function joinMatch(matchId: string, user: User): Promise<void> {
  const matchRef = doc(db, "matches", matchId);
  let joined: { match: Match; spotsLeft: number } | null = null;

  await runTransaction(db, async (tx) => {
    joined = null;
    const snap = await tx.get(matchRef);
    if (!snap.exists()) throw new Error("Este jogo já não existe.");
    const match = { id: snap.id, ...snap.data() } as Match;

    if (match.status === "completed" || match.status === "cancelled") {
      throw new Error("Este jogo já não está disponível.");
    }

    const { ids, names } = normalizedRoster(match);
    if (ids.includes(user.id)) {
      throw new Error("Já estás inscrito neste jogo.");
    }
    if (names.length >= match.totalPlayers) {
      throw new Error("Este jogo já está cheio.");
    }
    if (match.minLevel && user.level < match.minLevel) {
      throw new Error(`Este jogo requer nível ${match.minLevel} ou superior.`);
    }

    ids.push(user.id);
    names.push(user.displayName || `${user.firstName} ${user.lastName}`.trim());
    const update = rosterUpdate(match, ids, names);
    tx.update(matchRef, update);
    joined = { match, spotsLeft: update.playersNeeded };
  });

  // Notify the organizer outside the transaction — never blocks the join
  if (joined) {
    const { match, spotsLeft } = joined as { match: Match; spotsLeft: number };
    fetchDocument("users", match.organizerId)
      .then((organizer) => {
        const org = organizer as User | null;
        if (!org?.email || org.id === user.id) return;
        sendMatchJoinEmail(org.email, org.firstName || match.organizer, user.displayName || user.firstName, {
          sport: match.sport,
          date: match.date,
          time: match.time,
          location: match.venueName || match.location,
          spotsLeft,
        });
      })
      .catch(() => {});
  }
}

// Atomically leave a match (registered users only).
export async function leaveMatch(matchId: string, userId: string): Promise<void> {
  const matchRef = doc(db, "matches", matchId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef);
    if (!snap.exists()) throw new Error("Este jogo já não existe.");
    const match = { id: snap.id, ...snap.data() } as Match;

    if (match.organizerId === userId) {
      throw new Error("O organizador não pode sair do próprio jogo.");
    }

    const { ids, names } = normalizedRoster(match);
    const index = ids.indexOf(userId);
    if (index === -1) throw new Error("Não estás inscrito neste jogo.");

    ids.splice(index, 1);
    names.splice(index, 1);
    tx.update(matchRef, rosterUpdate(match, ids, names));
  });
}

// Atomically add a guest (name-only participant) to the roster.
export async function addGuestToMatch(matchId: string, guestName: string): Promise<void> {
  const matchRef = doc(db, "matches", matchId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef);
    if (!snap.exists()) throw new Error("Este jogo já não existe.");
    const match = { id: snap.id, ...snap.data() } as Match;

    const { ids, names } = normalizedRoster(match);
    if (names.length >= match.totalPlayers) {
      throw new Error("Este jogo já está cheio.");
    }

    ids.push("");
    names.push(guestName.trim());
    tx.update(matchRef, rosterUpdate(match, ids, names));
  });
}

// Atomically remove the roster entry at `index` (both arrays stay aligned).
export async function removeParticipantAt(matchId: string, index: number): Promise<void> {
  const matchRef = doc(db, "matches", matchId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef);
    if (!snap.exists()) throw new Error("Este jogo já não existe.");
    const match = { id: snap.id, ...snap.data() } as Match;

    const { ids, names } = normalizedRoster(match);
    if (index < 0 || index >= names.length) return;
    if (ids[index] === match.organizerId) {
      throw new Error("O organizador não pode ser removido.");
    }

    ids.splice(index, 1);
    names.splice(index, 1);
    tx.update(matchRef, rosterUpdate(match, ids, names));
  });
}

export interface LocalGameInput {
  sport: string;
  location: string;
  date: string;
  time: string;
  duration: string;
  participants: string[]; // display names
  hasHappened: boolean;
  result?: "win" | "loss" | "draw";
  myStats?: MatchStats;
  notes?: string;
}

// Registers a local (private-field) game. When the game already happened,
// the user's counters and match history are updated in the same transaction,
// so local games count towards stats. Local games never award ranked points.
export async function registerLocalGame(user: User, game: LocalGameInput): Promise<void> {
  const userRef = doc(db, "users", user.id);
  const localGameRef = doc(collection(db, "localGames"));

  await runTransaction(db, async (tx) => {
    const applyStats = game.hasHappened && !!game.result;
    const userSnap = applyStats ? await tx.get(userRef) : null;

    tx.set(localGameRef, {
      userId: user.id,
      sport: game.sport,
      location: game.location,
      date: game.date,
      time: game.time,
      duration: game.duration,
      participants: game.participants,
      hasHappened: game.hasHappened,
      ...(game.result ? { result: game.result } : {}),
      ...(game.myStats && Object.keys(game.myStats).length > 0 ? { myStats: game.myStats } : {}),
      ...(game.notes ? { notes: game.notes } : {}),
      createdAt: Timestamp.fromDate(new Date()),
    });

    if (!applyStats || !userSnap?.exists()) return;

    const userData = userSnap.data() as User;
    const result = game.result as "win" | "loss" | "draw";
    const stats = game.myStats ?? {};

    tx.update(userRef, {
      gamesPlayed: (userData.gamesPlayed || 0) + 1,
      wins: (userData.wins || 0) + (result === "win" ? 1 : 0),
      losses: (userData.losses || 0) + (result === "loss" ? 1 : 0),
      draws: (userData.draws || 0) + (result === "draw" ? 1 : 0),
      goals: (userData.goals || 0) + (stats.goals || 0),
      assists: (userData.assists || 0) + (stats.assists || 0),
      aces: (userData.aces || 0) + (stats.aces || 0),
      updatedAt: Timestamp.fromDate(new Date()),
    });

    const historyRef = doc(collection(db, "matchHistory"));
    tx.set(historyRef, {
      userId: user.id,
      sport: game.sport,
      location: game.location,
      venue: game.location,
      date: game.date,
      time: game.time,
      duration: game.duration || "60 min",
      result,
      score: "",
      participants: [user.displayName || `${user.firstName} ${user.lastName}`.trim(), ...game.participants],
      playerCount: game.participants.length + 1,
      myStats: stats,
      mode: "local",
      rankPoints: 0,
      notes: game.notes || "",
      mvp: "",
      hasRecording: false,
      createdAt: Timestamp.fromDate(new Date()),
    });
  });
}

export interface MatchResultInput {
  score?: string;
  winner?: "team1" | "team2" | "draw";
  notes?: string;
  mvp?: string; // display name
  mvpId?: string; // user id ("" for guests)
  teams?: Record<string, "team1" | "team2">;
}

// Marks a match as completed and, exactly once, writes back player stats:
// - users: gamesPlayed / wins / losses / draws, ranked points, level, MVP count
// - matchHistory: one entry per registered player with a team (or all on draw)
// Re-running on an already-applied match only updates the result fields.
export async function completeMatchWithStats(
  matchId: string,
  result: MatchResultInput
): Promise<void> {
  const matchRef = doc(db, "matches", matchId);
  let resultEmails: {
    email: string;
    firstName: string;
    sport: string;
    date: string;
    outcome: "win" | "loss" | "draw";
    score: string;
    mvp: string;
    pointsEarned: number;
    isMvp: boolean;
  }[] = [];

  await runTransaction(db, async (tx) => {
    resultEmails = []; // reset on transaction retry
    const snap = await tx.get(matchRef);
    if (!snap.exists()) throw new Error("Este jogo já não existe.");
    const match = { id: snap.id, ...snap.data() } as Match;

    const teams = result.teams ?? match.teams ?? {};
    const { ids, names } = normalizedRoster(match);
    const registeredIds = ids.filter((id) => id !== "");

    const resultPayload = {
      score: result.score || "",
      winner: result.winner || "draw",
      notes: result.notes || "",
      mvp: result.mvp || "",
      mvpId: result.mvpId || "",
    };

    const alreadyApplied = match.statsApplied === true;

    // All reads must happen before writes in a Firestore transaction.
    const userSnaps = alreadyApplied
      ? []
      : await Promise.all(
          registeredIds.map((id) => tx.get(doc(db, "users", id)))
        );

    tx.update(matchRef, {
      status: "completed",
      hasHappened: true,
      result: resultPayload,
      teams,
      statsApplied: true,
      updatedAt: Timestamp.fromDate(new Date()),
    });

    if (alreadyApplied) return;

    const winner = resultPayload.winner;
    const isRanked = match.mode === "ranked";
    const rankPoints = match.rankPoints ?? 25;

    userSnaps.forEach((userSnap, i) => {
      if (!userSnap.exists()) return;
      const uid = registeredIds[i];
      const userData = userSnap.data() as User;
      const team = teams[uid];

      // Outcome for this player: draws apply to everyone; team results only
      // to players with a team assignment.
      let outcome: "win" | "loss" | "draw" | null = null;
      if (winner === "draw") outcome = "draw";
      else if (team) outcome = team === winner ? "win" : "loss";

      const isMvp = !!result.mvpId && result.mvpId === uid;
      let pointsEarned = 0;
      if (isRanked) {
        if (outcome === "win") pointsEarned += rankPoints;
        else if (outcome === "draw") pointsEarned += Math.floor(rankPoints / 2);
      }
      if (isMvp) pointsEarned += MVP_BONUS_POINTS;

      const newPoints = (userData.points || 0) + pointsEarned;
      tx.update(doc(db, "users", uid), {
        gamesPlayed: (userData.gamesPlayed || 0) + 1,
        wins: (userData.wins || 0) + (outcome === "win" ? 1 : 0),
        losses: (userData.losses || 0) + (outcome === "loss" ? 1 : 0),
        draws: (userData.draws || 0) + (outcome === "draw" ? 1 : 0),
        mvps: (userData.mvps || 0) + (isMvp ? 1 : 0),
        points: newPoints,
        level: Math.max(userData.level || 1, levelForPoints(newPoints)),
        updatedAt: Timestamp.fromDate(new Date()),
      });

      if (outcome && userData.email) {
        resultEmails.push({
          email: userData.email,
          firstName: userData.firstName || "jogador",
          sport: match.sport,
          date: match.date,
          outcome,
          score: resultPayload.score,
          mvp: resultPayload.mvp,
          pointsEarned,
          isMvp,
        });
      }

      if (outcome) {
        const historyRef = doc(collection(db, "matchHistory"));
        tx.set(historyRef, {
          userId: uid,
          matchId: match.id,
          sport: match.sport,
          location: match.location,
          venue: match.venueName || match.venue || "",
          date: match.date,
          time: match.time,
          duration: "60 min", // matches don't track duration yet; standard slot
          result: outcome,
          score: resultPayload.score,
          participants: names,
          participantIds: registeredIds,
          playerCount: names.length,
          myStats: match.playerStats?.[uid] ?? {},
          mode: match.mode,
          rankPoints: isRanked ? pointsEarned : 0,
          notes: resultPayload.notes,
          mvp: resultPayload.mvp,
          hasRecording: false,
          createdAt: Timestamp.fromDate(new Date()),
        });
      }
    });
  });

  // Result emails go out only when stats were applied (first completion),
  // outside the transaction so they never block or retry it
  resultEmails.forEach((r) =>
    sendMatchResultEmail(r.email, r.firstName, {
      sport: r.sport,
      date: r.date,
      result: r.outcome,
      score: r.score,
      mvp: r.mvp,
      pointsEarned: r.pointsEarned,
      isMvp: r.isMvp,
    })
  );
}
