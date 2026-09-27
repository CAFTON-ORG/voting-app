// Every voter and admin in this system is at University of Baguio, in the
// Philippines - there's no per-user timezone preference to respect, so
// display always pins to Asia/Manila explicitly rather than trusting the
// ambient runtime timezone. That ambient default is only safe on the
// client (a voter's own browser already reflects wherever they are), but
// most of these calls happen inside Server Components, which render once
// on the server and never re-run on the client to correct themselves - a
// server whose own OS/process timezone is UTC (the common case once this
// is deployed, and possible even in local dev) would otherwise render an
// event scheduled for 2pm Manila time as "6:00 AM" permanently, with no
// hydration ever fixing it. Pinning the timezone here makes the output
// identical regardless of where the code happens to run.
const MANILA_TIME_ZONE = "Asia/Manila";

export function formatDateTime(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleString("en-PH", { timeZone: MANILA_TIME_ZONE, ...options });
}

export function formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString("en-PH", { timeZone: MANILA_TIME_ZONE, ...options });
}

/** The long-date/short-time pairing used everywhere a voter or admin sees
 * a voting-window boundary (opens/closes at ...). */
export function formatSchedule(date: Date): string {
  return formatDateTime(date, { dateStyle: "long", timeStyle: "short" });
}
