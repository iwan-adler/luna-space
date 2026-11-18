import { describe, expect, it } from 'vitest'
import { invitationStatus, type GuestInvitation } from './guests'
import { roomPermissions } from './room'

const settings = {
  collaborators_can_create_tasks: true,
  collaborators_can_upload_files: false,
  viewers_can_comment: false,
}

describe('roomPermissions (FR-GUEST-06/07)', () => {
  it('gives members everything', () => {
    const p = roomPermissions('member', null)
    expect(Object.values(p).every(Boolean)).toBe(true)
  })
  it('keeps viewers read-only unless commenting is enabled', () => {
    expect(roomPermissions('viewer', settings)).toMatchObject({
      editTasks: false,
      createTasks: false,
      upload: false,
      comment: false,
      manageGuests: false,
    })
    expect(roomPermissions('viewer', { ...settings, viewers_can_comment: true }).comment).toBe(true)
  })
  it('applies room settings to collaborators', () => {
    expect(roomPermissions('collaborator', settings)).toMatchObject({
      editTasks: true,
      createTasks: true,
      upload: false,
      editProject: false,
    })
  })
  it('lets project admins manage guests but not grant admin or manage checklists', () => {
    expect(roomPermissions('project_admin', settings)).toMatchObject({
      editProject: true,
      manageGuests: true,
      grantAdmin: false,
      manageChecklists: false,
    })
  })
})

describe('invitationStatus (FR-GUEST-02)', () => {
  const base = {
    revoked_at: null,
    expires_at: '2026-12-01T00:00:00Z',
    max_uses: 2,
    use_count: 0,
  } as GuestInvitation
  const now = new Date('2026-11-20T00:00:00Z')
  it('reports each state', () => {
    expect(invitationStatus(base, now)).toBe('Active')
    expect(invitationStatus({ ...base, use_count: 2 }, now)).toBe('Used up')
    expect(invitationStatus({ ...base, expires_at: '2026-11-19T00:00:00Z' }, now)).toBe('Expired')
    expect(invitationStatus({ ...base, revoked_at: '2026-11-19T00:00:00Z' }, now)).toBe('Revoked')
  })
})
