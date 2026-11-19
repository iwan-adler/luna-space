import {
  Award,
  CalendarDays,
  FolderKanban,
  House,
  Library,
  ListChecks,
  NotebookPen,
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
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/tasks', label: 'My tasks', icon: ListChecks },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/notes', label: 'Notes', icon: NotebookPen },
  { to: '/chat', label: 'Chat', icon: MessageCircle },
  { to: '/vault', label: 'Vault', icon: Library },
  { to: '/trophies', label: 'Trophies', icon: Award },
]

/** Mobile bottom bar: Home, Opportunities, Projects, Chat, More (UI spec §8). */
export const mobileNav = ['/', '/opportunities', '/projects', '/chat']
