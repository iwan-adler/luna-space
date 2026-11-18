import { describe, expect, it } from 'vitest'
import { hitHref, parseHighlights, plainText, type SearchHit } from './model'

const hit = (patch: Partial<SearchHit>): SearchHit => ({
  kind: 'note',
  id: 'n1',
  title: null,
  snippet: null,
  project_id: null,
  folder_id: null,
  rank: 1,
  updated_at: '2026-11-18T10:00:00Z',
  ...patch,
})

describe('search highlights', () => {
  it('splits marked matches into segments', () => {
    expect(parseHighlights('a ⟦lunar⟧ rover ⟦hack⟧')).toEqual([
      { text: 'a ', hit: false },
      { text: 'lunar', hit: true },
      { text: ' rover ', hit: false },
      { text: 'hack', hit: true },
    ])
    expect(parseHighlights(null)).toEqual([])
    expect(plainText('⟦Ro⟧ver')).toBe('Rover')
  })
})

describe('result links', () => {
  it('opens each kind where it lives', () => {
    expect(hitHref(hit({}))).toBe('/notes/n1')
    expect(hitHref(hit({ kind: 'bookmark', folder_id: 'f1' }))).toBe('/vault/f1?tab=links')
    expect(hitHref(hit({ kind: 'file', project_id: 'p1' }))).toBe('/projects/p1/files')
    expect(hitHref(hit({ kind: 'file' }))).toBe('/vault?tab=files')
    expect(hitHref(hit({ kind: 'task', project_id: 'p1' }))).toBe('/projects/p1/board')
    expect(hitHref(hit({ kind: 'message' }))).toBe('/chat')
  })
})
