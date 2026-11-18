/** Maps backend error codes to plain-language messages (TRD §20). */
const CODE_MESSAGES: Record<string, string> = {
  INVITE_INVALID:
    'This invitation is no longer valid. Ask the person who invited you for a new link.',
  ROOM_FULL: 'This room is full. Ask a project admin to make space.',
  EMAIL_UNCONFIRMED: 'Confirm your email address first, then open the link again.',
  MEMBERS_ONLY_ADMIN: 'Only workspace members can invite project admins.',
  ROOM_NOT_SHAREABLE: 'Private or archived projects cannot have guests.',
  NOT_FOUND: 'That no longer exists.',
  WORKSPACE_FULL: 'This workspace already has two members.',
  ALREADY_IN_WORKSPACE:
    'You already belong to a workspace. One account can be in only one workspace.',
  ALREADY_MEMBER: 'You are already a member of this workspace.',
  RATE_LIMITED: 'Too many attempts. Please wait a while and try again.',
  NOT_MEMBER: 'You are not a member of a workspace yet.',
  NOT_SIGNED_IN: 'Please sign in first.',
  '23505': 'That already exists.',
  '23514': 'Some values are not allowed.',
  '22023': 'Some values are not valid.',
  '42501': "You don't have permission to do that.",
}

export class AppError extends Error {
  readonly code: string | undefined
  constructor(message: string, code?: string) {
    super(message)
    this.name = 'AppError'
    this.code = code
  }
}

export function messageForCode(code: string | undefined, fallback = 'Something went wrong.') {
  return (code && CODE_MESSAGES[code]) || fallback
}

/** Normalises Supabase/PostgREST errors and thrown values into an AppError. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error
  if (error && typeof error === 'object') {
    const e = error as { code?: unknown; hint?: unknown; message?: unknown }
    const code =
      typeof e.hint === 'string' && CODE_MESSAGES[e.hint]
        ? e.hint
        : typeof e.code === 'string'
          ? e.code
          : undefined
    const message = typeof e.message === 'string' ? e.message : undefined
    return new AppError(messageForCode(code, message ?? 'Something went wrong.'), code)
  }
  return new AppError('Something went wrong.')
}
