export const TASK = /^(\s*)[-*] \[( |x|X)\] (.*)$/

/** Ticks or unticks the task list item on a given line of the note. */
export function toggleTask(body: string, lineIndex: number): string {
  const lines = body.split('\n')
  const line = lines[lineIndex]
  if (line === undefined) return body
  const m = TASK.exec(line)
  if (!m) return body
  lines[lineIndex] = `${m[1]}- [${m[2] === ' ' ? 'x' : ' '}] ${m[3]}`
  return lines.join('\n')
}
