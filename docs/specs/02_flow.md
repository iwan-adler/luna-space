## How to read this document

This document describes **how people move through Luna Space** and **how information moves between modules**. It turns the requirements of the PRD (01) into screens, routes, journeys and data hand-offs. Screen layouts are specified in the UI/UX Specification (05); the tables behind each flow are in the Backend Schema (06).

- Requirement IDs (`FR-…`, `US-…`, `AC-…`) refer to the PRD.
- Route paths (e.g. `/opportunities/:id`) are proposed URLs for the single-page application.
- Release tags: <span class="tag r1">R1</span> MVP, <span class="tag r2">R2</span>, <span class="tag r3">R3</span>, <span class="tag r4">R4</span>.
- Flowchart shapes: rectangle = screen or step, diamond = decision, rounded = start/end, cylinder = stored data, dashed arrow = automatic/background step.

> **Proposed:** All flows describe intended behaviour, not an existing implementation.

## 1. Information architecture

### 1.1 Organising model

Luna Space is organised around **five object families** that every module reuses, so that the product behaves like one connected system rather than separate tools:

| Object family | Examples | Appears in |
|---|---|---|
| **Things to pursue** | Opportunities, goals | Dashboard, Opportunities, Calendar, Automation, Portfolio |
| **Things to do** | Projects, tasks, checklist items, assessments | Projects, My tasks, Calendar, Dashboard, Chat commands |
| **Things in time** | Events, deadlines, reminders, timetable slots, trips | Calendar, Dashboard, Notifications |
| **Things we know** | Notes, files, bookmarks, snippets, decisions, contacts | Vault, Project rooms, Search |
| **Things that happened** | Activity, messages, focus sessions, achievements | Chat, Activity, Weekly review, Portfolio |

Every object carries the same four platform attributes: **workspace**, **owner**, **visibility** (shared/private) and **soft-delete state**. This is why search, recycle bin, activity and permissions work identically everywhere.

### 1.2 Top-level areas

| Area | Purpose | Primary route | Release |
|---|---|---|---|
| Home (Dashboard) | What needs attention now | `/` | <span class="tag r1">R1</span> |
| Opportunities | Find, capture, decide, track | `/opportunities` | <span class="tag r1">R1</span> |
| Projects | Build together | `/projects` | <span class="tag r1">R1</span> |
| My tasks | Everything assigned to me | `/tasks` | <span class="tag r1">R1</span> |
| Calendar | Time view of everything | `/calendar` | <span class="tag r1">R1</span> |
| Chat | Talk and turn talk into action | `/chat` | <span class="tag r1">R1</span> |
| Vault | Long-term knowledge | `/vault` | <span class="tag r1">R1</span> |
| Academics | Study schedule and assessments | `/academics` | <span class="tag r2">R2</span> |
| Growth (Productivity) | Goals, habits, focus, skills, courses, expenses | `/growth` | <span class="tag r2">R2</span> |
| Trips | Travel for events | `/trips` | <span class="tag r3">R3</span> |
| Portfolio | My achievements | `/portfolio` | <span class="tag r3">R3</span> |
| Contacts | People and mentors | `/contacts` | <span class="tag r3">R3</span> |
| Utilities | Search, notifications, recycle bin, settings, weekly review | various | R1–R2 |
| Guest home | Rooms a project guest belongs to (guests see nothing else) | `/guest` | <span class="tag r1">R1</span> |

## 2. Sitemap

### 2.1 Sitemap diagram

```mermaid
flowchart LR
  ROOT((Luna Space)) --> AUTH[Auth<br/>/auth/*]
  ROOT --> ONB[Onboarding<br/>/onboarding]
  ROOT --> INV[Invitation<br/>/invite/:token]
  ROOT --> HOME[Home<br/>/]
  ROOT --> OPP[Opportunities]
  ROOT --> PRJ[Projects]
  ROOT --> TSK[My tasks<br/>/tasks]
  ROOT --> CAL[Calendar<br/>/calendar]
  ROOT --> CHAT[Chat<br/>/chat]
  ROOT --> VAULT[Vault]
  ROOT --> ACAD[Academics R2]
  ROOT --> GROW[Growth R2]
  ROOT --> TRIP[Trips R3]
  ROOT --> PORT[Portfolio R3]
  ROOT --> CONT[Contacts R3]
  ROOT --> UTIL[Utilities]
  ROOT --> JOIN["Room invitation<br/>/join link"]
  ROOT --> GHOME[Guest home<br/>/guest]
  OPP --> O1[List /opportunities]
  OPP --> O2[Add from URL /opportunities/new]
  OPP --> O3[Review /opportunities/review/:runId]
  OPP --> O4[Detail /opportunities/:id]
  OPP --> O5[Compare R2 /opportunities/compare]
  OPP --> O6[Discovery R3 /opportunities/discover]
  PRJ --> P1[List /projects]
  PRJ --> P2[Room /projects/:id/:tab]
  PRJ --> P3[People /projects/:id/people]
  PRJ --> P4[Meetings R2 /projects/:id/meetings]
  VAULT --> V1[All /vault]
  VAULT --> V2[Folder /vault/f/:id]
  VAULT --> V3[Note /vault/n/:id]
  UTIL --> U1[Search /search]
  UTIL --> U2[Notifications /notifications]
  UTIL --> U3[Recycle bin /trash]
  UTIL --> U4[Settings /settings/*]
  UTIL --> U5[Weekly review R2 /review]
```

### 2.2 Route inventory

| Route | Screen | Rel. | Notes |
|---|---|---|---|
| `/auth/sign-in`, `/auth/sign-up`, `/auth/reset`, `/auth/callback` | Authentication | <span class="tag r1">R1</span> | Public routes |
| `/onboarding` | Create workspace, profile basics | <span class="tag r1">R1</span> | Only when the user has no workspace |
| `/invite/:token` | Accept invitation | <span class="tag r1">R1</span> | Works signed-out (prompts sign-up) |
| `/join#<token>` | Accept a **Project Room** guest invitation (token in the URL fragment, never sent to servers) | <span class="tag r1">R1</span> | Works signed-out (prompts sign-up, then resumes) |
| `/guest` | Guest home: list of rooms the signed-in person is a guest in | <span class="tag r1">R1</span> | Shown instead of the dashboard to accounts with no workspace but with guest rooms |
| `/` | Dashboard (Shared / Me toggle) | <span class="tag r1">R1</span> | Default landing |
| `/opportunities` | List, board-by-status, filters | <span class="tag r1">R1</span> | `?view=list, pipeline` |
| `/opportunities/new` | Paste URL or manual entry | <span class="tag r1">R1</span> | `?url=` supported for share-target |
| `/opportunities/review/:runId` | Extraction review | <span class="tag r1">R1</span> | |
| `/opportunities/:id` | Detail: Overview, Dates, Sources & history, Eligibility (R2), Participation (R2) | <span class="tag r1">R1</span> | Tabs via `?tab=` |
| `/opportunities/compare?ids=a,b,c` | Comparison table | <span class="tag r2">R2</span> | 2–4 ids |
| `/opportunities/discover` | Discovery inbox from feeds | <span class="tag r3">R3</span> | |
| `/projects` | Project list | <span class="tag r1">R1</span> | |
| `/projects/:id/overview, board, notes, files, checklist, chat, activity` | Project room tabs | <span class="tag r1">R1</span> | |
| `/projects/:id/ideas, decisions, polls` | Collaboration tabs | <span class="tag r2">R2</span> | |
| `/projects/:id/pitch, judge, retro, github` | Preparation tabs | <span class="tag r3">R3</span> | |
| `/projects/:id/people` | People: members, guests, invitations, guest settings | <span class="tag r1">R1</span> | Guests see a read-only list unless Project Admin |
| `/projects/:id/meetings`, `/projects/:id/meetings/:meetingId` | Meetings list and meeting page | <span class="tag r2">R2</span> | Join button opens Google Meet externally |
| `/tasks` | My tasks | <span class="tag r1">R1</span> | Task drawer `?task=:id` on any page |
| `/calendar` | Month / week / day / agenda | <span class="tag r1">R1</span> | `?view=&date=` |
| `/chat` | Workspace conversation | <span class="tag r1">R1</span> | `?project=` filter, `?m=` jump to message |
| `/vault`, `/vault/f/:folderId`, `/vault/n/:noteId`, `/vault/bookmarks`, `/vault/files` | Knowledge Vault | <span class="tag r1">R1</span> | |
| `/vault/snippets` | Code snippets | <span class="tag r2">R2</span> | |
| `/academics/subjects, timetable, assessments` | Academics | <span class="tag r2">R2</span> | |
| `/growth/goals, habits, focus, skills, courses` | Productivity | <span class="tag r2">R2</span> | |
| `/growth/expenses` | Expenses | <span class="tag r3">R3</span> | |
| `/review` | Weekly review | <span class="tag r2">R2</span> | |
| `/trips`, `/trips/:id` | Trips | <span class="tag r3">R3</span> | |
| `/portfolio`, `/portfolio/:userId` | Portfolio (own / partner's shared) | <span class="tag r3">R3</span> | |
| `/contacts`, `/contacts/:id` | Contacts | <span class="tag r3">R3</span> | |
| `/search?q=` | Global search results | <span class="tag r1">R1</span> | Also via command palette |
| `/notifications` | Notification centre | <span class="tag r1">R1</span> | |
| `/trash` | Recycle bin | <span class="tag r1">R1</span> | |
| `/settings/profile, workspace, notifications, privacy, data` | Settings | <span class="tag r1">R1</span> | |
| `/settings/integrations, ai` | Integrations: GitHub and Google (R3), AI (R4) | <span class="tag r3">R3</span> | |
| `/call/:id` | Call screen | <span class="tag r4">R4</span> | Overlay |

## 3. Navigation hierarchy

### 3.1 Levels

| Level | Desktop (≥ 1024 px) | Mobile (< 768 px) |
|---|---|---|
| L0 Global | Left sidebar: Home, Opportunities, Projects, My tasks, Calendar, Chat, Vault; divider; Academics, Growth, Trips, Portfolio, Contacts (as released) | Bottom bar: Home, Opportunities, Projects, Chat, More |
| L0 Utilities | Top bar: search / command palette (Ctrl+K), quick add (+), notifications bell, availability, avatar menu | Top bar: title, search icon, bell; "More" sheet holds Calendar, Tasks, Vault and the rest |
| L1 Section | Page header with view switch (list/board/calendar) and filters | Same, filters in a bottom sheet |
| L2 Object | Detail page with tabs (opportunity, project room) | Detail page; tabs become a horizontally scrollable tab strip |
| L3 Sub-object | Right-side drawer (task, event, note preview) keeps context | Full-screen sheet with back gesture |
| Guest shell | Minimal top bar (room switcher, notifications, avatar) and the room's guest tabs only; no sidebar modules | Same; bottom bar replaced by the room's tab strip |
| Modal | Create/confirm dialogs, review steps | Full-screen dialogs |

### 3.2 Navigation rules

1. **Every object has one canonical URL**; drawers add a query parameter (`?task=…`) so links can be shared between the two members.
2. **Back always returns to the previous context**, including the scroll position and filters of lists.
3. **Cross-links are bidirectional**: an opportunity shows its project; the project shows its opportunity; a calendar item opens its source record.
4. **Quick add (+)** is available everywhere: Opportunity from URL, Task, Event, Note, Bookmark, and (R2) Goal, Focus session.
5. **The command palette** searches records and actions: "new task", "go to calendar", "open project …".
6. **Deep links from notifications** open the exact record and highlight the changed element.
7. **Guests are routed by permission, not by hiding links**: any non-room route opened by a guest shows "You don't have access to this page" and offers the guest home; the data is already denied by RLS.

## 4. First-time user journey

```mermaid
flowchart TD
  S([Opens Luna Space link]) --> A{Has account?}
  A -- No --> SU[Sign up: email + password<br/>or magic link]
  SU --> VE[Confirm email]
  A -- Yes --> SI[Sign in]
  VE --> W{Member of a workspace?}
  SI --> W
  W -- No, arrived via invite link --> ACC[Accept invitation screen]
  W -- No, no invite --> ON1[Onboarding 1/3<br/>Name + time zone]
  ON1 --> ON2[Onboarding 2/3<br/>Create workspace]
  ON2 --> ON3[Onboarding 3/3<br/>Invite partner: copy link]
  ON3 --> T[Guided empty dashboard<br/>with 3 starter actions]
  ACC --> P[Profile basics] --> T
  W -- Yes --> D[Dashboard]
  T --> X1[Add first opportunity]
  T --> X2[Install app + enable notifications]
  T --> X3[Create first project]
```

**Starter checklist (shown until done or dismissed):** add an opportunity, invite your partner, install the app, enable notifications, create a project. The checklist is per member and private.

## 5. Authentication journey

```mermaid
flowchart TD
  S([Sign-in screen]) --> M{Method}
  M -- Password --> P[Email + password] --> V{Valid?}
  V -- No --> E1[Generic error: email or password incorrect<br/>rate-limited after repeated failures] --> P
  V -- Yes --> C{Email confirmed?}
  C -- No --> R[Resend confirmation] --> S
  C -- Yes --> OK[Session created]
  M -- Magic link --> ML[Enter email] --> SENT[Check your inbox] --> CB["/auth/callback"] --> OK
  M -- Forgot password --> FP[Request reset] --> RL[Reset link] --> NP[Set new password] --> OK
  OK --> G{Pending route?}
  G -- invite token stored --> INV["/invite/:token"]
  G -- deep link stored --> DL[Requested page]
  G -- none --> H[Dashboard or onboarding]
```

| Rule | Detail |
|---|---|
| Session | Supabase Auth JWT with refresh token; session persists across PWA restarts. |
| Error messages | Never reveal whether an email exists. |
| Return path | The originally requested URL (including `/invite/:token`) is stored in session storage and resumed after sign-in. |
| Sign-out | Clears local caches of private data (IndexedDB) on the device. |

## 6. Workspace creation and invitation journey

```mermaid
sequenceDiagram
  autonumber
  actor A as Member A
  participant UI as Luna Space app
  participant EF as Edge Function invite-create / invite-accept
  participant DB as Postgres (RLS)
  actor B as Member B
  A->>UI: Create workspace "Moonshot"
  UI->>DB: rpc create_workspace(name)
  DB-->>UI: workspace + seat 1 for A
  A->>UI: Invite partner
  UI->>EF: invite-create
  EF->>DB: revoke older invitation, store SHA-256(token), expiry = now + 7 days
  EF-->>UI: link /invite/<token> (token shown once)
  A-->>B: Shares link via any channel (WhatsApp, email…)
  B->>UI: Opens link, signs up / signs in
  UI->>EF: invite-accept(token)
  EF->>DB: verify hash, unused, unexpired, workspace has free seat, B has no workspace
  DB-->>EF: insert member seat 2 (unique seat constraint)
  EF-->>UI: success
  UI-->>B: Workspace dashboard
  DB-->>A: notification "B joined Moonshot"
```

| Case | Behaviour |
|---|---|
| Token invalid/expired/used/revoked | "This invitation is no longer valid. Ask your partner for a new link." No detail about which. |
| Invitee already belongs to a workspace | "You are already in a workspace. Leave it first (Settings → Workspace)." (Leaving is R3; before R3 the user must use a different account.) |
| Workspace already has two members | "This workspace is full." The invitation is marked invalid. |
| Inviter wants to cancel | Settings → Workspace → Revoke invitation. |

## 7. Opportunity discovery journey

Discovery means getting candidate opportunities **into** Luna Space. There is no public scraping; every source is chosen by a member.

```mermaid
flowchart TD
  subgraph Sources
    S1[Link shared by a friend]
    S2[Browsing on phone]
    S3[RSS/Atom feed chosen by member R3]
    S4[Poster or offline notice]
  end
  S1 --> PASTE[Paste URL<br/>Quick add / Opportunities / Chat /opportunity]
  S2 --> SHARE[Android share sheet → Luna Space PWA share target]
  S3 --> INBOX[Discovery inbox]
  S4 --> MAN[Manual entry]
  SHARE --> PASTE
  INBOX -->|Import| PASTE
  PASTE --> EXT[URL extraction journey §8]
  MAN --> FORM[Opportunity form]
  EXT --> SAVED[(Opportunity saved<br/>status = saved)]
  FORM --> SAVED
  SAVED --> TRIAGE{Triage on list}
  TRIAGE -- Interested --> INT[Status interested → default reminders]
  TRIAGE -- Not now --> ARC[Archive]
  INT --> ELIG[Eligibility check R2]
  INT --> CMP[Compare R2]
  INT --> PLAN[Planning → convert to project]
```

**Status pipeline (FR-OPP-04)**

```mermaid
stateDiagram-v2
  [*] --> saved
  saved --> interested
  saved --> archived
  interested --> planning
  interested --> archived
  planning --> registered
  registered --> in_progress
  in_progress --> submitted
  submitted --> awaiting_result
  awaiting_result --> won
  awaiting_result --> not_selected
  interested --> missed: deadline passed
  planning --> missed: deadline passed
  planning --> withdrawn
  registered --> withdrawn
  in_progress --> withdrawn
  won --> archived
  not_selected --> archived
  withdrawn --> archived
  missed --> archived
```

Status changes are free (members can jump between any states); the diagram shows the normal path. The system suggests `missed` when a registration deadline passes while the status is still `interested` or `planning`, but never applies it automatically.

## 8. URL extraction and review journey

### 8.1 Flow

```mermaid
flowchart TD
  A([Member pastes URL]) --> B{URL syntactically valid<br/>http/https?}
  B -- No --> B1[Inline error] --> A
  B -- Yes --> DUP{Same normalized URL<br/>already tracked?}
  DUP -- Yes --> D1[Show existing opportunity<br/>offer Re-check instead]
  DUP -- No --> C[Start extraction run<br/>Edge Function extract-opportunity]
  C --> SSRF{Safety checks pass?<br/>public IP, port, redirects}
  SSRF -- No --> F1[Refused: address cannot be fetched]
  SSRF -- Yes --> FETCH[Fetch page<br/>10 s timeout, 2 MB cap]
  FETCH -- error/timeout/blocked --> F2[Failed with reason]
  FETCH -- ok --> PARSE[Parse: JSON-LD → OpenGraph/meta → site adapter → labelled-text rules]
  PARSE --> CLASS[Classify each field:<br/>Confirmed / Inferred / Missing / Conflicting]
  CLASS --> THIN{Fewer than 2 fields found?}
  THIN -- Yes --> F3[Little information found:<br/>page may need JavaScript]
  THIN -- No --> R[Review screen]
  F1 & F2 & F3 --> MAN[Manual form with URL prefilled<br/>+ reason banner]
  R --> EDIT[Accept / edit / clear each field<br/>resolve conflicts]
  EDIT --> SAVE{All conflicts resolved?}
  SAVE -- No --> EDIT
  SAVE -- Yes --> W[(Save opportunity + dates + source<br/>+ field provenance + history 'created')]
  MAN --> W2[(Save opportunity<br/>provenance = manual)]
  W --> NEXT[Detail page + suggested next steps]
  W2 --> NEXT
```

### 8.2 Field statuses on the review screen

| Status | Rule | Review behaviour |
|---|---|---|
| **Confirmed** | Value read from structured data (JSON-LD/schema.org) or from text that names the field explicitly ("Registration closes: 15 Dec 2026"). Evidence snippet stored. | Pre-accepted; member can still edit. |
| **Inferred** | Value derived by a documented rule, e.g. year missing (assumed from the next occurrence after extraction date), time zone assumed from the organizer's country, mode inferred from "venue" text. Reason stored. | Highlighted; requires a tick ("I checked this") or edit before save. |
| **Missing** | No evidence found. | Empty input; optional to fill. Critical missing fields (registration deadline, eligibility, team size, mode) raise a warning after save. |
| **Conflicting** | Two or more different candidate values with evidence. | Member must choose a candidate, type a value, or clear the field. Save is blocked until resolved. |

### 8.3 What happens to the data

| Data | Stored where | Retention |
|---|---|---|
| Run metadata (URL, final URL, HTTP status, timing, content hash, extractor version, error code) | `extraction_runs` | 7 days if not saved; kept with the opportunity if saved |
| Proposed values with status, evidence snippet (≤ 500 chars) and reason | `extraction_fields` | Same as the run |
| Accepted values | `opportunities`, `opportunity_dates` | Life of the record |
| Per-field provenance (source run, status at acceptance, verified by/at) | `opportunity_field_provenance` | Life of the record |
| Change history entries | `opportunity_field_history` | Life of the record |
| Source URL, domain, credibility, last checked | `opportunity_sources` | Life of the record |

## 9. Eligibility-checking journey <span class="tag r2">R2</span>

```mermaid
flowchart TD
  A([Opportunity detail → Eligibility tab]) --> B{Opportunity has structured criteria?}
  B -- No --> B1[Show eligibility text<br/>+ 'Structure criteria' form] --> B2[Member enters criteria:<br/>degree levels, years of study, graduation window,<br/>age limit, countries, gender-restricted, team size,<br/>other text] --> C
  B -- Yes --> C{Member has eligibility profile?}
  C -- No --> P[Create private eligibility profile:<br/>degree level, year, graduation year,<br/>birth year optional, country, institution type] --> D
  C -- Yes --> D[Evaluate each criterion]
  D --> R[Result per member:<br/>Meets / Does not meet / Unknown + reason]
  R --> S{Overall}
  S -- All meet --> OK[Badge Eligible]
  S -- Any does not meet --> NO[Badge Not eligible + reason]
  S -- Any unknown --> UN[Badge Check needed + missing items]
```

- The partner sees **only the overall badge** for the other member (Eligible / Not eligible / Check needed), never the private profile values.
- Unknown is the default whenever data is missing on either side; the checker never guesses.

## 10. Opportunity comparison journey <span class="tag r2">R2</span>

```mermaid
flowchart TD
  A([Opportunity list]) --> B[Select 2–4 via checkboxes] --> C[Compare]
  C --> T[Comparison table<br/>rows = fields, columns = opportunities]
  T --> H[Differences highlighted<br/>missing shown as —, never blank-filled]
  T --> F[Toggle rows: dates, fees, prizes,<br/>team size, eligibility badge, mode, location,<br/>credibility, effort estimate, match score R3]
  T --> ACT{Decide}
  ACT -- Pursue --> S1[Set status planning / convert to project]
  ACT -- Drop --> S2[Archive others]
  ACT -- Later --> S3[Save comparison link in chat]
```

## 11. Project creation journey

```mermaid
flowchart TD
  A([Start]) --> B{From where?}
  B -- Opportunity detail: Convert --> C[Prefill: name, category from type,<br/>start = event start, end = submission deadline,<br/>links, team size, opportunity link]
  B -- Projects: New --> D[Blank form]
  B -- Chat /task with new project R2 --> D
  C --> E[Confirm details + members + visibility]
  D --> E
  E --> F{Category = hackathon/competition?}
  F -- Yes --> G[Offer submission checklist template]
  F -- No --> H[Skip]
  G --> I[(Create project, members,<br/>checklist, activity entry)]
  H --> I
  I --> J[Opportunity status → planning if earlier]
  I --> K[Project milestones appear on calendar]
  I --> L[Notify partner]
  I --> M([Project room Overview])
```

## 12. Project collaboration journey

```mermaid
flowchart TD
  subgraph Room[Project room]
    OV[Overview]
    BD[Board]
    NT[Notes]
    FL[Files]
    CK[Checklist]
    CH[Project chat]
    ID[Ideas R2]
    DC[Decisions R2]
    PI[Pitch & demo R3]
    RT[Retro R3]
  end
  CH -- "/task" --> BD
  CH -- "/note" --> NT
  ID -- promote --> BD
  ID -- promote --> DC
  DC -- approval request --> APR{Partner approves?}
  APR -- yes --> DC2[Decision approved, logged]
  APR -- no --> DC3[Declined with comment]
  NT -- meeting note action items --> BD
  BD -- all tasks done + checklist complete --> SUB[Submit]
  CK --> SUB
  SUB --> STG[Stage → presenting/completed]
  STG --> RT
  RT --> PORT[Create portfolio entries R3]
```

**Collaboration rules**

| Rule | Detail |
|---|---|
| Real-time | Board, checklist, comments and chat update live for both members (Supabase Realtime). |
| Concurrent edits | Notes use "last write wins" with a conflict warning if the note changed since it was opened (version number check). A real-time co-editing editor is not in scope. |
| Presence | Avatars of members currently viewing the room are shown. |
| Approvals | One open approval per subject; reminders after 24 h; the requester can cancel. |

## 13. Task management journey

```mermaid
flowchart TD
  A([Create task]) --> B{Entry point}
  B --> B1[Board column + Add]
  B --> B2[Quick add / Ctrl+K]
  B --> B3[Chat /task R2]
  B --> B4[Meeting note action item R2]
  B --> B5[Suggestion accepted R2]
  B1 & B2 & B3 & B4 & B5 --> C[Title required;<br/>optional assignee, due, priority, project]
  C --> D[(Task saved: status todo or column)]
  D --> E{Due date set?}
  E -- Yes --> F[Appears on calendar + default reminder for assignee]
  E -- No --> G[Board only]
  D --> H{Assigned to partner?}
  H -- Yes --> I[Notify partner]
  D --> J[Work: move columns, add subtasks,<br/>comments, attachments]
  J --> K{Status = done?}
  K -- Yes --> L[completed_at set; reminders cancelled;<br/>activity logged; progress updated]
  K -- No, overdue --> M[Overdue alert in daily digest R2]
```

## 14. Calendar and reminder journey

### 14.1 What appears on the calendar

```mermaid
flowchart LR
  E[(calendar_events)] --> FEED[calendar_feed view<br/>read-only union]
  OD[(opportunity_dates)] --> FEED
  T[(tasks with due date)] --> FEED
  PM[(project milestones = project start/end + checklist due items)] --> FEED
  TT[(timetable_slots R2)] --> FEED
  AS[(assessments R2)] --> FEED
  TI[(trip_items R3)] --> FEED
  FEED --> CAL[Calendar UI<br/>layers + filters]
  CAL -- click --> SRC[Opens the source record drawer]
  CAL -- drag/resize --> UPD[Updates the source record<br/>if the member may edit it]
```

Derived items are **never copied** into `calendar_events`. Editing a hackathon deadline on the calendar edits the `opportunity_dates` row, records history and reschedules reminders.

### 14.2 Reminder lifecycle

```mermaid
sequenceDiagram
  autonumber
  participant U as Member
  participant DB as Postgres
  participant CR as pg_cron (every 5 min)
  participant EF as Edge Function dispatch-notifications
  participant PS as Browser push service
  U->>DB: Save deadline / task / event with reminder offsets
  DB->>DB: Trigger upserts reminders (dedupe_key = target + offset + user)
  CR->>EF: invoke
  EF->>DB: claim due reminders (status pending → sending, SKIP LOCKED)
  EF->>DB: insert notification (unique recipient + dedupe_key)
  EF->>PS: Web Push to each subscription of recipient
  PS-->>U: OS notification → deep link
  EF->>DB: mark reminder sent / failed (retry ≤ 3)
  Note over DB: Changing the source date deletes pending reminders and creates new ones
```

**Date-only rule:** for a date-only deadline, "on the day" reminders fire at 09:00 in the member's time zone and "N days before" at 09:00 on that earlier day (AC-19). Timed deadlines use the exact instant minus the offset.

## 15. Chat and communication journey

```mermaid
flowchart TD
  A([Open chat]) --> B[Load last 50 messages<br/>subscribe to realtime channel]
  B --> C[Compose]
  C --> D{Starts with / ? R2}
  D -- Yes --> E[Command preview card:<br/>/task /event /note /remind /poll /opportunity]
  E --> F{Confirm?}
  F -- Yes --> G[(Create record + system message linking it)]
  F -- No --> C
  D -- No --> H{Attachment?}
  H -- Yes --> I[Validate type/size → upload to private bucket → file row]
  H -- No --> J
  I --> J[(Insert message with client_id)]
  J --> K[Optimistic bubble: sending → sent]
  K --> L[Partner receives via Realtime]
  L --> M[Partner views → chat_read_state updated → 'Seen']
  J -.offline R2.-> Q[Queued in outbox → sent on reconnect, client_id prevents duplicates]
```

**Calls (R4).** Start call → explain camera/microphone use → browser permission prompt → signalling through a private Realtime channel → peer connection (STUN; TURN fallback) → in-call controls (mute, camera, screen share on desktop, hang up). If the partner does not answer in 30 s, a "missed call" system message is posted.

## 16. Document and Knowledge Vault journey

```mermaid
flowchart TD
  A([Capture]) --> B{What?}
  B -- Note --> N[New note: Markdown editor, folder, tags, visibility]
  B -- File --> F[Upload: drag-drop / picker / chat attachment]
  B -- Link --> K[Bookmark: URL → title fetched from page metadata<br/>via the same safe fetcher]
  B -- Snippet R2 --> S[Snippet: language + code]
  N & F & K & S --> O[(Saved with workspace, owner, visibility,<br/>optional project/subject)]
  O --> L[Link to tasks / projects / opportunities R2]
  O --> SR[Indexed for full-text search]
  SR --> FIND([Find: Vault search, global search, project tabs])
  FIND --> USE[Open / preview / copy / share in chat]
```

**Organisation rules:** folders are optional (a "smart" view lists everything by recent); a record lives in at most one folder; tags are free-form and shared in the workspace; project rooms show Vault items whose `project_id` matches the project.

## 17. Portfolio creation journey <span class="tag r3">R3</span>

```mermaid
flowchart TD
  A([Project completed or opportunity closed]) --> B[Prompt: Add to my portfolio?]
  B --> C[Prefill from records:<br/>title, dates, organizer, role, team,<br/>result = opportunity outcome, skills from mapping,<br/>repo links, certificate file]
  C --> D[Fields marked 'verified from record'<br/>vs 'entered by me']
  D --> E[Member edits description]
  E --> F[Generate résumé bullets]
  F --> G[Deterministic templates use only recorded facts<br/>no outcome claims without a result record]
  G --> H{Accept bullets?}
  H -- Edit/accept --> I[(portfolio_items + portfolio_bullets accepted)]
  H -- Discard --> I
  I --> J[Timeline view, export Markdown / print]
  I --> K{Visibility}
  K -- shared --> L[Partner can view]
  K -- private --> M[Only me]
```

## 18. Weekly review journey <span class="tag r2">R2</span>

```mermaid
flowchart TD
  A([Monday 08:00 summary notification]) --> B["/review"]
  B --> C[Step 1: Last week<br/>done tasks, missed deadlines,<br/>focus minutes, habits, goals progress]
  C --> D[Step 2: Reflection<br/>wins, blockers - private or shared]
  D --> E[Step 3: Upcoming 14 days<br/>deadlines, exams, conflicts]
  E --> F[Step 4: Plan<br/>set weekly goals, pick top tasks,<br/>schedule focus blocks]
  F --> G[(weekly_reviews saved)]
  G --> H[Shared part visible to partner<br/>on Shared dashboard]
```

## 19. Error and recovery flows

### 19.1 Error taxonomy

| Class | Example | User sees | Recovery |
|---|---|---|---|
| Validation | Title empty; end before start | Inline message beside the field | Fix and retry |
| Permission | Editing a partner's private record via stale link | "You don't have access to this item" | Back to list |
| Not found / deleted | Opening a link to a deleted task | "This item is in the recycle bin" + Restore (if allowed) | Restore or back |
| Conflict | Note edited by partner since opened | Compare banner: keep mine / keep theirs / copy mine to new note | Choose |
| Network | Offline while saving | Toast "Saved on this device, will sync" (R2) or "Couldn't save — retry" (R1) | Auto-retry / manual retry |
| Rate limit | 21st extraction in an hour | "Too many extractions, try again in N min" | Manual entry |
| External | Extraction blocked, push service failure | Reason + fallback | Manual form; in-app notification remains |
| Server | Unexpected error | "Something went wrong" + error ID | Retry; error ID in logs |
| Quota | Storage near free limit | Banner at 80 % and 95 % | Clean up files; export |

### 19.2 Recovery flows

```mermaid
flowchart TD
  D([Delete]) --> SD[Soft delete: deleted_at set<br/>hidden everywhere, children hidden]
  SD --> U[Undo toast 8 s]
  U -- Undo --> R[Restored]
  SD --> T[Recycle bin 30 days]
  T -- Restore --> R
  T -- Delete forever confirm --> P[Purged]
  T -- 30 days elapsed --> P2[Nightly purge job<br/>DB rows + storage objects]
```

```mermaid
flowchart TD
  O([Offline]) --> B[Banner: You're offline]
  B --> RD[Read cached pages]
  B --> DR[Create drafts R2:<br/>notes, tasks, messages → IndexedDB outbox]
  DR --> ON([Back online]) --> SY[Replay outbox in order<br/>idempotent client ids]
  SY --> C{Server conflict?}
  C -- No --> OK[Synced ✓]
  C -- Yes --> CF[Keep both: draft saved as copy + notice]
```

## 20. Cross-module relationships

### 20.1 Relationship map

```mermaid
flowchart TD
  OPP[Opportunity] -- converts to --> PRJ[Project]
  OPP -- dates --> CAL[Calendar]
  OPP -- trip --> TRIP[Trip]
  OPP -- met at --> CONT[Contact]
  OPP -- participation/outcome --> PORT[Portfolio entry]
  PRJ -- tasks --> TSK[Tasks]
  TSK -- due --> CAL
  PRJ -- notes, files, refs --> VAULT[Vault]
  PRJ -- skills applied --> SKL[Skills]
  SKL --> PORT
  PRJ -- completed --> PORT
  CHAT[Chat] -- commands --> TSK & CAL & VAULT & OPP
  TRIP -- expenses --> EXP[Expenses]
  PRJ -- expenses --> EXP
  ACAD[Assessments & timetable] --> CAL
  CAL -- conflicts --> AUTO[Automation]
  AUTO -- reminders, digests, suggestions --> NOTIF[Notifications]
  PRJ -- invitations --> GUEST[Project guests]
  GUEST -- guest-visible tasks, notes, files --> PRJ
  PRJ -- meetings --> MEET[Project meetings]
  MEET -- schedule --> CAL
  MEET -- action items --> TSK
  MEET -- notes --> VAULT
  ALL[Every module] -. activity .-> ACT[Activity log]
  ALL -. search index .-> SRCH[Search]
```

### 20.2 Hand-off matrix

| From → To | Trigger | Data passed | Owner of truth |
|---|---|---|---|
| Opportunity → Project | Convert | name, category, dates, links, team size, opportunity_id | Project after creation; dates stay on the opportunity |
| Opportunity → Calendar | Date saved | `opportunity_dates` rows via feed view | Opportunity |
| Opportunity → Reminders | Status ≥ interested | default reminder offsets | Reminder rows (regenerated on change) |
| Task → Calendar | Due date set | via feed view | Task |
| Chat → any | Quick command | parsed fields, after preview | Created record; message links to it |
| Project → Vault | Note/file/bookmark created in room | `project_id` on item | Vault item |
| Project → Portfolio | Completed + prompt | facts + `project_id` | Portfolio item (copy of facts at creation, links kept) |
| Skills ↔ Projects | Skill mapping | `project_skills` rows; skill stage suggestion "Applied in project" | Skills |
| Trip ↔ Expenses | Expense with trip | `trip_id` | Expense |
| Any → Activity | Write on shared record | action, entity, summary | Activity log (append-only) |
| Any → Notifications | Rules | type, target link, dedupe key | Notifications |
| Project → Guests | Invitation accepted | room id, role; guest sees only guest-visible rows | Guest membership |
| Meeting → Calendar | Meeting scheduled | via `calendar_feed` (meeting rows) | Meeting |
| Meeting → Tasks | Convert action item | title, assignee, due date, project, `guest_visible = true` | Task; action item keeps a link |
| Meeting → Vault | Meeting notes | note of kind `meeting` with `meeting_id` | Note |

## 21. Project guest invitation and acceptance journey

### 21.1 Creating a room invitation

```mermaid
flowchart TD
  A([Project room → People → Invite guests]) --> B{Caller is a workspace member<br/>or guest Project Admin?}
  B -- No --> X[Action not shown; API would be denied by RLS]
  B -- Yes --> C[Invite dialog:<br/>role, expiry, max uses, label]
  C --> D{Role = Project Admin<br/>and caller is a guest?}
  D -- Yes --> D1[Not allowed: only members grant Project Admin]
  D -- No --> E[Edge Function project-invite-create<br/>rate limit 20/h per project]
  E --> F[(Store SHA-256 hash, role, expiry,<br/>max uses, label, creator)]
  F --> G["Show link once:<br/>app URL /join + token fragment<br/>Copy · Share"]
  G --> H[Activity: invitation created<br/>members notified if a guest created it]
```

The plain token exists only in the creator's browser at that moment. Afterwards the People tab shows the invitation by label, role, expiry, use count and status (Active, Expired, Used up, Revoked).

### 21.2 Accepting a room invitation

```mermaid
sequenceDiagram
  autonumber
  actor G as Invited person
  participant UI as Luna Space app
  participant EF as Edge Function project-invite-accept
  participant DB as Postgres (RLS)
  G->>UI: Opens the /join link (token is in the fragment and stays in the browser)
  UI->>UI: Store token in sessionStorage, clear it from the address bar
  alt not signed in
    UI-->>G: Sign in or create account (email confirmation required)
    G->>UI: Returns after confirmation
  end
  UI->>EF: POST token (JWT of the signed-in person)
  EF->>DB: rate limit (10/h per user), hash token, lock invitation row
  EF->>DB: check not revoked, not expired, uses left, project active
  EF->>DB: check person is not a member of that workspace, not already a guest, room below guest cap
  EF->>DB: insert project_guest_memberships (role from invitation), use_count + 1, activity, notifications
  EF-->>UI: room id + role
  UI-->>G: Room overview with "You're a guest in this room" welcome
```

| Case | Behaviour |
|---|---|
| Token invalid, expired, revoked or used up | Generic "This invitation is no longer valid. Ask the person who invited you for a new link." |
| Person is a member of the room's workspace | "You're already a member of this workspace" → opens the room as a member. No guest row. |
| Already a guest of this room | Opens the room; no change (idempotent). |
| Room at its guest cap | "This room is full. Ask a project admin to make space." |
| Project deleted or archived | Generic invalid message. |
| Person has no workspace of their own | After acceptance they land in the room; the guest home lists their rooms. They are never pushed into workspace onboarding. |

## 22. Guest permission management and removal

```mermaid
flowchart TD
  A([People tab]) --> B{Action}
  B -- Change role --> C[Role selector: Viewer / Collaborator<br/>Project Admin only by members]
  C --> C1[(Update role, activity, notify guest)]
  C1 --> C2[New permissions apply on the guest's next request]
  B -- Remove guest --> R[Confirm: name the person and consequences]
  R --> R1[(Set removed_at/by, clear the guest's open assignments in the room,<br/>remove from future meetings, cancel their reminders)]
  R1 --> R2[Notify removed guest, activity entry]
  R2 --> R3[RLS denies every room query; Realtime stops delivering rows]
  B -- Revoke invitation --> V[(Set revoked_at: link dead immediately)]
  B -- Room guest settings --> S[Toggle: collaborators upload files, create tasks,<br/>schedule meetings · viewers comment · guests see activity · max guests]
  B -- Guest leaves --> L[Guest home → Leave room → same as removal, reason 'left']
```

**What a guest can open** (everything else is absent from the guest shell and denied by the database):

| Room tab | Viewer | Collaborator | Project Admin |
|---|---|---|---|
| Overview | Read | Read | Read + edit details |
| Board / tasks / subtasks | Read guest-visible | Create, edit, move, comment | Same + delete guest-created tasks |
| Checklist | Read | Tick, add items | Same |
| Notes, Files, References | Read guest-visible | Create (always guest-visible), edit guest-visible, upload if allowed | Same + remove guest-created items |
| Meetings (R2) | Read, join, respond | Schedule with manual link if allowed, notes, action items | Same |
| People | Read names and roles | Read | Invite (Viewer/Collaborator), change roles, remove guests, settings |
| Activity | Guest-visible entries if allowed | Same | Same |
| Workspace chat, dashboard, calendar, opportunities, vault outside the room, other rooms, settings | — | — | — |

## 23. Meeting scheduling journey <span class="tag r2">R2</span>

```mermaid
flowchart TD
  A([Room → Meetings → Schedule]) --> B[Title, date, start/end, time zone,<br/>agenda, participants, visible to guests, reminders]
  B --> C{Link}
  C -- Paste existing Meet URL --> D{Valid meet.google.com address?}
  D -- No --> D1[Inline error] --> C
  D -- Yes --> S
  C -- Add later --> S
  C -- Create Google Meet link R3 --> G{Member has connected Google<br/>and integration configured?}
  G -- No --> G1[Explain + Connect Google or paste a link] --> C
  G -- Yes --> E[Edge Function google-meet:<br/>create event with Meet conference<br/>or create Meet space]
  E -- failed / pending too long --> G2[Keep meeting, show retry or paste link]
  E -- link returned --> S
  S[(Save meeting, participants,<br/>reminders, activity)] --> N[Notify participants:<br/>meeting scheduled]
  S --> CAL[Appears on members' calendar<br/>and on the room schedule for guests]
```

**Rescheduling or cancelling** updates the meeting, regenerates reminders, notifies participants once, and — for links created through Google — updates or cancels the Google event (R3). A manual link is never changed by Luna Space.

## 24. Joining a meeting and follow-up <span class="tag r2">R2</span>

```mermaid
flowchart LR
  R[Reminder 1 day / 15 min before] --> P[Meeting page]
  P --> J[Join meeting<br/>opens meet.google.com in a new tab<br/>or the Meet app on Android]
  J --> M[Call happens in Google Meet<br/>outside Luna Space]
  P --> NOTES[Meeting notes<br/>note of kind meeting]
  P --> DEC[Decisions → decision log]
  P --> AI[Action items]
  AI -- Convert to task --> T[(Task in room, guest-visible,<br/>assignee + due date)]
  M --> AFTER[After end time:<br/>meeting moves to Previous,<br/>prompt to add notes and action items]
```

| Rule | Detail |
|---|---|
| Who can see the link | Workspace members; room guests only when the meeting is visible to guests. Anyone the link is forwarded to can still ask to join in Google Meet — admission is controlled by the meeting host in Google Meet. |
| Join button | Enabled at any time; highlighted from 10 minutes before start until end. |
| Calendar for participants | "Add to my calendar" gives a Google Calendar template link or `.ics` file; no Google account connection needed. |
| Not supported | Embedding Meet, starting the call from inside Luna Space, recordings or transcripts. |

## Glossary

| Term | Meaning |
|---|---|
| Canonical URL | The single address of a record that both members can share. |
| Drawer | A side panel that shows a record without leaving the current page. |
| Feed view | A read-only database view that combines dates from several tables for the calendar. |
| Outbox | Device-local queue of changes made offline, replayed when online (R2). |
| Share target | PWA capability that lets Android's share sheet send a URL to Luna Space. |
| Dedupe key | A unique string that prevents the same reminder or notification being created twice. |
| Guest shell | The reduced app frame a project guest sees: room switcher and that room's guest tabs only. |
| URL fragment | The part of a link after `#`; browsers do not send it to servers, which keeps invitation tokens out of logs. |
