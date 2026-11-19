import { describe, expect, it } from 'vitest'
import { pollOf } from './polls'
import { STICKERS, stickerById, stickerOf } from './stickers'

describe('stickers', () => {
  it('has unique ids that the database accepts', () => {
    const ids = STICKERS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{1,40}$/)
  })

  it('reads the sticker id from message metadata', () => {
    expect(stickerOf({ sticker: 'ship-it' })).toBe('ship-it')
    expect(stickerOf({ sticker: '<img>' })).toBeNull()
    expect(stickerById('ship-it')?.caption).toBe('Ship it!')
    expect(stickerById('nope')).toBeNull()
  })
})

describe('polls', () => {
  it('reads poll metadata defensively', () => {
    expect(pollOf({ question: 'Track?', options: ['AI', 3, 'Web'], multi: true })).toEqual({
      question: 'Track?',
      options: ['AI', 'Web'],
      multi: true,
    })
    expect(pollOf({ question: 'Track?' })).toBeNull()
  })
})
