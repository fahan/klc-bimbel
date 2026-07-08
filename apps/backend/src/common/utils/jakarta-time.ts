/**
 * Jakarta (WIB, UTC+7) "now" as a UTC-shifted Date.
 * Read its fields with getUTC* accessors (getUTCHours(), getUTCDay(), ...) —
 * local accessors would re-apply the server's own timezone offset.
 */
export function jakartaNow(): Date {
  return new Date(Date.now() + 7 * 60 * 60 * 1000)
}
