import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Converts any of the shapes a Firestore timestamp can arrive in
// (Timestamp instance, serialized {seconds}, Date, ISO string) into a Date.
export function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === "object") {
    const v = value as { toDate?: () => Date; seconds?: number }
    if (typeof v.toDate === "function") return v.toDate()
    if (typeof v.seconds === "number") return new Date(v.seconds * 1000)
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

export function formatDate(value: unknown, locale = "pt-PT"): string {
  const d = toDate(value)
  return d ? d.toLocaleDateString(locale) : "—"
}
