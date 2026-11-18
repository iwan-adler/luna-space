import { createContext, useContext } from 'react'
import type { Database } from '@/types/database'

export type GuestRole = Database['public']['Enums']['guest_role']
export type RoomAccess = 'member' | GuestRole

/** A person in a room: workspace member or active guest (from project_directory). */
export interface RoomPerson {
  userId: string
  displayName: string
  kind: 'member' | 'guest'
  role: GuestRole | null
}

export interface Room {
  projectId: string
  workspaceId: string
  access: RoomAccess
  /** Route prefix of the room: /projects for members, /guest/rooms for guests. */
  base: string
}

export const RoomContext = createContext<Room | null>(null)

export function useRoom(): Room {
  const room = useContext(RoomContext)
  if (!room) throw new Error('useRoom used outside a project room')
  return room
}

export const GUEST_ROLE_LABELS: Record<GuestRole, string> = {
  viewer: 'Viewer',
  collaborator: 'Collaborator',
  project_admin: 'Project admin',
}

/** What the viewer may do in a room (FR-GUEST-06/07); the database enforces the same rules. */
export function roomPermissions(
  access: RoomAccess,
  settings: {
    collaborators_can_create_tasks: boolean
    collaborators_can_upload_files: boolean
    viewers_can_comment: boolean
  } | null,
) {
  const member = access === 'member'
  const editor = member || access === 'collaborator' || access === 'project_admin'
  return {
    member,
    editTasks: editor,
    createTasks: member || (editor && (settings?.collaborators_can_create_tasks ?? false)),
    upload: member || (editor && (settings?.collaborators_can_upload_files ?? false)),
    comment: editor || (access === 'viewer' && (settings?.viewers_can_comment ?? false)),
    editProject: member || access === 'project_admin',
    manageGuests: member || access === 'project_admin',
    grantAdmin: member,
    manageChecklists: member,
  }
}
export type RoomPermissions = ReturnType<typeof roomPermissions>
