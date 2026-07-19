// Client-side helper for the email automation endpoint (/api/email).
//
// Every function is fire-and-forget: emails are a courtesy, so a failure
// (offline, provider not configured, etc.) must never break the app flow
// that triggered it. Errors are logged and swallowed.

type TemplateData = Record<string, string | number | undefined>;

function dispatch(type: string, to: (string | undefined)[], data: TemplateData): void {
  const recipients = to.filter((e): e is string => !!e);
  if (recipients.length === 0) return;

  fetch("/api/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, to: recipients, data }),
  }).catch((err) => {
    console.warn(`[JOGA email] failed to dispatch "${type}":`, err);
  });
}

export function sendWelcomeEmail(to: string, firstName: string): void {
  dispatch("welcome", [to], { firstName });
}

export interface BookingEmailInfo {
  venueName: string;
  date: string;
  time: string;
  duration: string;
  players?: number;
  price: string;
}

export function sendBookingUserEmail(
  to: string | undefined,
  firstName: string,
  booking: BookingEmailInfo,
  status: "pending" | "confirmed"
): void {
  dispatch("booking-user", [to], { firstName, status, ...booking });
}

export function sendBookingOrganizerEmail(
  to: string | undefined,
  organizerName: string,
  userName: string,
  booking: BookingEmailInfo
): void {
  dispatch("booking-organizer", [to], { organizerName, userName, ...booking });
}

export function sendBookingStatusEmail(
  to: string | undefined,
  firstName: string,
  booking: Pick<BookingEmailInfo, "venueName" | "date" | "time" | "price">,
  status: "confirmed" | "cancelled"
): void {
  dispatch("booking-status", [to], { firstName, status, ...booking });
}

export function sendMatchJoinEmail(
  to: string | undefined,
  organizerName: string,
  playerName: string,
  match: { sport: string; date: string; time: string; location: string; spotsLeft: number }
): void {
  dispatch("match-join", [to], { organizerName, playerName, ...match });
}

export function sendMatchResultEmail(
  to: string | undefined,
  firstName: string,
  result: {
    sport: string;
    date: string;
    result: "win" | "loss" | "draw";
    score?: string;
    mvp?: string;
    pointsEarned?: number;
    isMvp?: boolean;
  }
): void {
  dispatch("match-result", [to], {
    firstName,
    sport: result.sport,
    date: result.date,
    result: result.result,
    score: result.score,
    mvp: result.mvp,
    pointsEarned: result.pointsEarned || undefined,
    isMvp: result.isMvp ? "true" : "false",
  });
}

export function sendMatchCancelledEmail(
  to: string | undefined,
  firstName: string,
  match: { sport: string; date: string; time: string; location: string }
): void {
  dispatch("match-cancelled", [to], { firstName, ...match });
}

export function sendFriendRequestEmail(
  to: string | undefined,
  receiverName: string,
  senderName: string
): void {
  dispatch("friend-request", [to], { receiverName, senderName });
}

export function sendFriendAcceptedEmail(
  to: string | undefined,
  senderName: string,
  accepterName: string
): void {
  dispatch("friend-accepted", [to], { senderName, accepterName });
}
