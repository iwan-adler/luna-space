# ADR 0019 — Wave 1: Mission Control, richer cards, team layer

- **Status:** Accepted
- **Date:** 2026-11-19
- **Builds on:** ADR 0017 (effects layer) and ADR 0018 (several workspaces).

## Decisions

- **Mission Control** (`/mission/:opportunityId`, `features/mission`):
  - An opportunity becomes a mission while the workspace is taking part in it (`planning`,
    `registered` or `in_progress`) and its submission deadline or event end is within 7 days,
    or the event has started and not yet ended. The rule is pure (`findMissions`) and unit
    tested. All-day dates run to the end of their day in their own time zone.
  - A countdown bar sits above every page. It is calm beyond 72 hours, amber within 72 hours and
    red within 12, and it can be hidden for the session.
  - The mission page has a live timer, the linked project's tasks (tick to finish) and its
    checklists, who is working on what, quick links (official page, registration, rules,
    repositories and project links), a notes pad, and "We submitted" and "We won!" buttons.
    These set the opportunity's status through the existing mutation.
  - No schema change: everything is read from existing tables under the existing RLS.
- **Opportunities:**
  - The gallery card has a monogram tile with a gradient generated from the organiser's name, a
    colour per opportunity type, prize and team chips, and a countdown ring. A full ring means a
    month or more to go.
  - A new Timeline view groups deadlines into this week, next week, this month and later.
  - Home gets a pipeline strip: Interested → Applied → Submitted → Won.
- **Projects:**
  - Each project gets a gradient cover generated from its name.
  - A progress ring shows done/total top-level tasks.
  - A stage track draws the working stages as waxing moon phases, from Idea (new moon) to
    Presenting (full moon).
- **Team layer on Home:**
  - A team card shows each member and the task they have in progress.
  - "This week together" counts tasks completed (`tasks.completed_at`), applications
    (`opportunity.status_changed` to `registered`) and submissions (to `submitted`) since Monday
    00:00 in the viewer's time zone. It also shows a streak of consecutive weeks with at least
    one completed task.
- **Feel:**
  - Shimmering skeletons replace spinners in lists and widgets. They are announced once to
    screen readers.
  - "Stardust" bursts when a task lands in Done (board drop, drawer, subtasks), a checklist item
    is ticked, or a submission or win is recorded. They are made of DOM particles, removed
    after about a second, and skipped under `prefers-reduced-motion`.

## Not included

Wave 2 (calendar and chat polish, theme picker and personal accents, link previews, Trophy
wall) follows separately.
