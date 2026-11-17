/** Formats an ISO instant in the viewer's locale and time zone, e.g. "24 Nov 2026, 18:30". */
export function formatDateTime(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(iso))
}

/** Formats an ISO instant as a date only, e.g. "24 Nov 2026". */
export function formatDate(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone,
  }).format(new Date(iso))
}
