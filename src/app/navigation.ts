import {
  CalendarDays,
  FolderKanban,
  House,
  Library,
  ListChecks,
  MessageCircle,
  Trophy,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Implementation Plan phase that delivers the module; shown on its placeholder page. */
  phase?: string
}

/** Primary modules (UI spec §8). Secondary modules appear here as their releases ship. */
export const primaryNav: NavItem[] = [
  { to: '/', label: 'Home', icon: House },
  { to: '/opportunities', label: 'Opportunities', icon: Trophy },
  { to: '/projects', label: 'Projects', icon: FolderKanban, phase: 'Phase 4' },
  { to: '/tasks', label: 'My tasks', icon: ListChecks, phase: 'Phase 4' },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays, phase: 'Phase 5' },
  { to: '/chat', label: 'Chat', icon: MessageCircle, phase: 'Phase 6' },
  { to: '/vault', label: 'Vault', icon: Library, phase: 'Phase 7' },
]

/** Mobile bottom bar: Home, Opportunities, Projects, Chat, More (UI spec §8). */
export const mobileNav = ['/', '/opportunities', '/projects', '/chat']
