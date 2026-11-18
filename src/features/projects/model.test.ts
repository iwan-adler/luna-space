import { describe, expect, it } from 'vitest'
import {
  checklistProgress,
  dueInDays,
  groupByStatus,
  positionAt,
  projectLinks,
  storagePath,
  type Task,
} from './model'

const task = (over: Partial<Task>): Task =>
  ({
    id: 'x',
    status: 'todo',
    position: 0,
    parent_task_id: null,
    deleted_at: null,
    ...over,
  }) as Task

describe('positionAt', () => {
  const col = [{ position: 1024 }, { position: 2048 }]
  it('handles empty columns and both ends', () => {
    expect(positionAt([], 0)).toBe(1024)
    expect(positionAt(col, 0)).toBe(0)
    expect(positionAt(col, 2)).toBe(3072)
  })
  it('uses the midpoint between neighbours', () => {
    expect(positionAt(col, 1)).toBe(1536)
  })
})

describe('groupByStatus', () => {
  it('sorts by position and leaves out subtasks and deleted tasks', () => {
    const g = groupByStatus([
      task({ id: 'b', position: 2 }),
      task({ id: 'a', position: 1 }),
      task({ id: 'sub', parent_task_id: 'a' }),
      task({ id: 'gone', deleted_at: '2026-11-01T00:00:00Z' }),
      task({ id: 'd', status: 'done' }),
    ])
    expect(g.todo.map((t) => t.id)).toEqual(['a', 'b'])
    expect(g.done.map((t) => t.id)).toEqual(['d'])
    expect(g.backlog).toEqual([])
  })
})

describe('helpers', () => {
  it('counts days to a date-only due date in the viewer zone', () => {
    const now = new Date('2026-11-18T20:00:00Z') // 19 Nov in Kolkata, 18 Nov in Los Angeles
    expect(dueInDays('2026-11-20', 'Asia/Kolkata', now)).toBe(1)
    expect(dueInDays('2026-11-20', 'America/Los_Angeles', now)).toBe(2)
  })
  it('computes checklist progress', () => {
    expect(checklistProgress([{ is_done: true }, { is_done: false }])).toEqual({
      done: 1,
      total: 2,
      percent: 50,
    })
    expect(checklistProgress([]).percent).toBe(0)
  })
  it('builds safe storage paths', () => {
    expect(storagePath('ws', 'id', '../My Deck (final).pdf')).toBe('ws/id/My-Deck-final-.pdf')
    expect(storagePath('ws', 'id', '...')).toBe('ws/id/file')
  })
  it('reads links defensively', () => {
    expect(projectLinks({ links: [{ label: 'Site', url: 'https://a.example' }, 3, null] })).toEqual(
      [{ label: 'Site', url: 'https://a.example' }],
    )
    expect(projectLinks({ links: {} })).toEqual([])
  })
})
