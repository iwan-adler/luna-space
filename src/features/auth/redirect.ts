/** Where to send the browser back to after email links (confirmation, magic link, reset). */
export function authRedirectUrl(path = '/auth/callback') {
  return `${window.location.origin}${path}`
}
