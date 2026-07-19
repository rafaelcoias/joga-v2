import { addDoc, collection, doc, Timestamp, writeBatch } from "firebase/firestore";

import { db } from "./config";
import { NotificationType } from "@/lib/types";

// In-app notifications. Creation is fire-and-forget: a notification is a
// courtesy, so failures are logged and swallowed — they must never break
// the flow that triggered them.
export function pushNotification(
  userId: string | undefined,
  type: NotificationType,
  title: string,
  content: string,
  actionUrl?: string
): void {
  if (!userId) return;
  addDoc(collection(db, "notifications"), {
    userId,
    type,
    title,
    content,
    read: false,
    ...(actionUrl ? { actionUrl } : {}),
    createdAt: Timestamp.fromDate(new Date()),
  }).catch((err) => {
    console.warn("[JOGA notifications] failed to create notification:", err);
  });
}

export async function markNotificationRead(id: string): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, "notifications", id), { read: true });
  await batch.commit();
}

export async function markAllNotificationsRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const batch = writeBatch(db);
  // Firestore batches cap at 500 writes; the bell only surfaces recent items
  ids.slice(0, 450).forEach((id) => {
    batch.update(doc(db, "notifications", id), { read: true });
  });
  await batch.commit();
}
