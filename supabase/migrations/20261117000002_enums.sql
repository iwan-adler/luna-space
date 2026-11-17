-- Migration 0002 — shared enumerations (Backend Schema §5, §31.1).
-- Later additions use `alter type … add value` in new migrations.

create type public.visibility          as enum ('shared', 'private');
create type public.availability_status as enum ('available', 'busy', 'focus', 'away');
create type public.opportunity_type    as enum (
  'hackathon', 'coding_competition', 'innovation_challenge', 'internship', 'scholarship', 'fellowship',
  'research_programme', 'conference', 'workshop', 'summer_school', 'ambassador_programme',
  'open_source_programme', 'exchange_programme', 'technical_event', 'other');
create type public.opportunity_status  as enum (
  'saved', 'interested', 'planning', 'registered', 'in_progress', 'submitted', 'awaiting_result',
  'won', 'not_selected', 'withdrawn', 'missed', 'archived');
create type public.participation_mode  as enum ('online', 'offline', 'hybrid', 'unknown');
create type public.date_kind           as enum (
  'registration_open', 'registration_deadline', 'submission_deadline', 'event_start', 'event_end',
  'result', 'other');
create type public.field_status        as enum ('confirmed', 'inferred', 'missing', 'conflicting');
create type public.provenance_source   as enum ('manual', 'extraction', 'recheck');
create type public.credibility_level   as enum ('official', 'known_platform', 'unverified', 'caution');
create type public.project_stage       as enum (
  'idea', 'planning', 'building', 'testing', 'submitting', 'presenting', 'completed', 'archived');
create type public.project_category    as enum (
  'hackathon', 'competition', 'academic', 'practice', 'personal', 'research', 'other');
create type public.task_status         as enum ('backlog', 'todo', 'in_progress', 'review', 'done');
create type public.task_priority       as enum ('low', 'medium', 'high', 'urgent');
create type public.event_kind          as enum (
  'meeting', 'deadline', 'milestone', 'assignment', 'exam', 'class', 'lab', 'travel', 'focus',
  'personal', 'other');
create type public.skill_stage         as enum ('not_started', 'learning', 'practicing', 'applied', 'confident');
create type public.portfolio_kind      as enum (
  'project', 'hackathon', 'competition', 'award', 'certificate', 'internship', 'workshop', 'research',
  'open_source', 'leadership', 'volunteering');
create type public.guest_role          as enum ('viewer', 'collaborator', 'project_admin');
