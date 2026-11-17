import type { Database } from '@/types/database'

type Enums = Database['public']['Enums']
export type OpportunityType = Enums['opportunity_type']
export type OpportunityStatus = Enums['opportunity_status']
export type ParticipationMode = Enums['participation_mode']
export type DateKind = Enums['date_kind']
export type Visibility = Enums['visibility']

export const TYPE_LABELS: Record<OpportunityType, string> = {
  hackathon: 'Hackathon',
  coding_competition: 'Coding competition',
  innovation_challenge: 'Innovation challenge',
  internship: 'Internship',
  scholarship: 'Scholarship',
  fellowship: 'Fellowship',
  research_programme: 'Research programme',
  conference: 'Conference',
  workshop: 'Workshop',
  summer_school: 'Summer school',
  ambassador_programme: 'Student ambassador programme',
  open_source_programme: 'Open-source programme',
  exchange_programme: 'Exchange programme',
  technical_event: 'Technical event',
  other: 'Other',
}

export const STATUS_LABELS: Record<OpportunityStatus, string> = {
  saved: 'Saved',
  interested: 'Interested',
  planning: 'Planning',
  registered: 'Registered',
  in_progress: 'In progress',
  submitted: 'Submitted',
  awaiting_result: 'Awaiting result',
  won: 'Won',
  not_selected: 'Not selected',
  withdrawn: 'Withdrawn',
  missed: 'Missed',
  archived: 'Archived',
}

/** Pipeline columns (UI spec §13). */
export const STATUS_GROUPS: { id: string; label: string; statuses: OpportunityStatus[] }[] = [
  { id: 'discover', label: 'Discover', statuses: ['saved', 'interested'] },
  { id: 'preparing', label: 'Preparing', statuses: ['planning', 'registered', 'in_progress'] },
  { id: 'submitted', label: 'Submitted', statuses: ['submitted', 'awaiting_result'] },
  {
    id: 'closed',
    label: 'Closed',
    statuses: ['won', 'not_selected', 'withdrawn', 'missed', 'archived'],
  },
]

export const CLOSED_STATUSES: OpportunityStatus[] = [
  'won',
  'not_selected',
  'withdrawn',
  'missed',
  'archived',
]

export const MODE_LABELS: Record<ParticipationMode, string> = {
  online: 'Online',
  offline: 'Offline',
  hybrid: 'Hybrid',
  unknown: 'Mode unknown',
}

/** Date kinds editable in the form, in display order (FR-OPP-02). */
export const DATE_KINDS: { kind: Exclude<DateKind, 'other'>; label: string }[] = [
  { kind: 'registration_open', label: 'Registration opens' },
  { kind: 'registration_deadline', label: 'Registration deadline' },
  { kind: 'submission_deadline', label: 'Submission deadline' },
  { kind: 'event_start', label: 'Event starts' },
  { kind: 'event_end', label: 'Event ends' },
  { kind: 'result', label: 'Results announced' },
]

export const DATE_KIND_LABELS: Record<string, string> = Object.fromEntries(
  DATE_KINDS.map((d) => [d.kind, d.label]),
)

/** Field labels for provenance and history (FR-OPP-11/12). */
export const FIELD_LABELS: Record<string, string> = {
  type: 'Type',
  title: 'Name',
  organizer: 'Organizer',
  description: 'Description',
  official_url: 'Official website',
  registration_url: 'Registration link',
  rules_url: 'Rules link',
  rules_text: 'Rules',
  mode: 'Mode',
  location: 'Location',
  eligibility_text: 'Eligibility',
  team_min: 'Minimum team size',
  team_max: 'Maximum team size',
  is_free: 'Free to enter',
  fee_amount: 'Registration fee',
  fee_currency: 'Fee currency',
  prizes: 'Prizes',
  benefits: 'Benefits',
  required_documents: 'Required documents',
  tracks: 'Tracks',
  status: 'Status',
  ...DATE_KIND_LABELS,
}
