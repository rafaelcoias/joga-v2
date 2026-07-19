import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "./config";
import { ArenaBooking } from "@/lib/types";

const toMinutes = (time: string): number => {
  const [h, m] = time.split(":").map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
};

export const minutesToTime = (total: number): string => {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

// Returns the conflicting booking if the requested slot overlaps an existing
// non-cancelled booking for the same arena and date, or null if free.
//
// Note: this is a best-effort pre-check (Firestore transactions cannot run
// queries), so two truly simultaneous submissions can still both pass — the
// organizer resolves those on confirmation.
export async function findSlotConflict(
  arenaId: string,
  date: string,
  startTime: string,
  durationMinutes: number
): Promise<ArenaBooking | null> {
  const q = query(
    collection(db, "arenaBookings"),
    where("arenaId", "==", arenaId),
    where("date", "==", date)
  );
  const snapshot = await getDocs(q);

  const requestedStart = toMinutes(startTime);
  const requestedEnd = requestedStart + durationMinutes;

  for (const docSnap of snapshot.docs) {
    const booking = { id: docSnap.id, ...docSnap.data() } as ArenaBooking;
    if (booking.status === "cancelled") continue;

    const existingStart = toMinutes(booking.time);
    const existingEnd = booking.endTime
      ? toMinutes(booking.endTime)
      : existingStart + (booking.duration || 60);

    if (requestedStart < existingEnd && existingStart < requestedEnd) {
      return booking;
    }
  }
  return null;
}
