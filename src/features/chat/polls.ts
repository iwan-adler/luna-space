/** Poll metadata stored on a chat message (ADR 0021). */
export interface PollData {
  question: string
  options: string[]
  multi: boolean
}

export function pollOf(metadata: unknown): PollData | null {
  const m = metadata as Partial<PollData> | null
  if (!m || typeof m.question !== 'string' || !Array.isArray(m.options)) return null
  return {
    question: m.question,
    options: m.options.filter((o): o is string => typeof o === 'string'),
    multi: m.multi === true,
  }
}
