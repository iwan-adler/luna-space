import { describe, expect, it } from 'vitest'
import {
  buildTree,
  flattenTree,
  folderPath,
  hostOf,
  normalizeUrl,
  parseTags,
  tagCounts,
  type Folder,
} from './model'

const f = (id: string, name: string, parent: string | null = null, depth = 1): Folder => ({
  id,
  name,
  parent_id: parent,
  depth,
  visibility: 'shared',
  owner_id: 'u',
})

describe('vault folders', () => {
  const folders = [
    f('b', 'Research'),
    f('a', 'Admin'),
    f('c', 'papers', 'b', 2),
    f('d', '2026', 'c', 3),
  ]

  it('builds a sorted tree and flattens it depth first', () => {
    const tree = buildTree(folders)
    expect(tree.map((n) => n.name)).toEqual(['Admin', 'Research'])
    expect(flattenTree(tree).map((x) => `${x.level}:${x.folder.name}`)).toEqual([
      '0:Admin',
      '0:Research',
      '1:papers',
      '2:2026',
    ])
  })

  it('treats a folder whose parent is hidden as a root', () => {
    expect(buildTree([f('x', 'Orphan', 'gone', 2)]).map((n) => n.name)).toEqual(['Orphan'])
  })

  it('gives the breadcrumb path from the top', () => {
    expect(folderPath(folders, 'd').map((x) => x.name)).toEqual(['Research', 'papers', '2026'])
    expect(folderPath(folders, null)).toEqual([])
  })
})

describe('tags', () => {
  it('normalises typed tags', () => {
    expect(parseTags('Research, #ml , ML,  deep   learning ,')).toEqual([
      'research',
      'ml',
      'deep learning',
    ])
  })

  it('counts tags, most used first', () => {
    expect(tagCounts([{ tags: ['b', 'a'] }, { tags: ['a'] }])).toEqual([
      { tag: 'a', count: 2 },
      { tag: 'b', count: 1 },
    ])
  })
})

describe('links', () => {
  it('adds https and refuses other schemes', () => {
    expect(normalizeUrl('devpost.com/hackathons')).toBe('https://devpost.com/hackathons')
    expect(normalizeUrl('http://example.org')).toBe('http://example.org')
    expect(normalizeUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeUrl('not a link')).toBeNull()
    expect(hostOf('https://www.example.org/a')).toBe('example.org')
  })
})
