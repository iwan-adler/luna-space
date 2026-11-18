import { describe, expect, it } from 'vitest'
import { daysLeft, exportFileName, restoredHref } from './model'

describe('recycle bin', () => {
  it('counts whole days until the purge', () => {
    const now = new Date('2026-11-19T12:00:00Z')
    expect(daysLeft('2026-11-29T12:00:00Z', now)).toBe(10)
    expect(daysLeft('2026-11-19T18:00:00Z', now)).toBe(1)
    expect(daysLeft('2026-11-18T12:00:00Z', now)).toBe(0)
  })

  it('opens restored items where they live', () => {
    expect(restoredHref({ kind: 'task', id: 't', project_id: 'p' })).toBe('/projects/p/board')
    expect(restoredHref({ kind: 'note', id: 'n', project_id: null })).toBe('/notes/n')
    expect(restoredHref({ kind: 'folder', id: 'f', project_id: null })).toBe('/vault/f')
  })
})

describe('export', () => {
  it('names the file after the workspace and date', () => {
    expect(exportFileName('Luna & Co!', '2026-11-19')).toBe('luna-space-luna-co-2026-11-19.json')
    expect(exportFileName('!!!', '2026-11-19')).toBe('luna-space-workspace-2026-11-19.json')
  })
})
