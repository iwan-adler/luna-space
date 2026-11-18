## How to read this document

This specification defines how Luna Space **looks, feels and behaves**. It covers the design system, layouts for laptop and Android, annotated wireframes for every key screen, states, accessibility and motion.

- Screens and routes follow the Application Flow (02). Field names follow the Backend Schema (06). Requirement IDs refer to the PRD (01).
- Wireframes are **low-fidelity**: they fix layout, hierarchy and behaviour, not final pixels. Yellow numbered markers <span class="wf-n">1</span> refer to the annotations under each wireframe.
- Token names (e.g. `--color-primary`) are the names to use in code (`src/styles/tokens.css`).

> **Proposed:** Visual direction and components are proposals to validate with the two users through a clickable prototype or the R1-alpha build.

## 1. Design philosophy

| Principle | Meaning | Example |
|---|---|---|
| **Calm command centre** | Show what matters now; hide the rest one click away. | Dashboard shows the next 14 days, not every record. |
| **Connected objects** | Every object shows where it came from and where it leads. | Opportunity card shows its project; task shows its opportunity deadline. |
| **Trust is visible** | Data quality is part of the interface, not a hidden detail. | Field status chips: Confirmed, Inferred, Missing, Conflicting. Visibility icon on every private item. |
| **Capture fast, organise later** | Creation needs one field; details are optional. | Quick add (+) creates a task with only a title. |
| **Two people, one rhythm** | Presence, activity and approvals make the partner felt without noise. | Avatars on cards being viewed; partner's moves animate on the board. |
| **Same product on phone and laptop** | Same objects and words; layout adapts, behaviour does not change. | Board becomes swipeable columns on mobile. |

## 2. Visual direction

> **Decision:** Superseded in part by [ADR 0005](../adr/0005-soft-night-visual-direction.md) (18 Nov 2026): the product is **dark-first ("Soft night")** with a single moonlight-gold accent. The palette values in §4 are replaced by `src/styles/tokens.css`; structure, components and accessibility rules in this document still apply.

- **Theme:** "Night sky workspace" — a calm, deep-indigo dark theme and a clean, airy light theme. The moon motif appears only in the logo, the empty-state illustrations and the focus timer; the interface itself stays quiet.
- **Character:** modern productivity tool — generous spacing, soft 10 px radii, thin borders instead of heavy shadows, purposeful colour used for status and primary actions only.
- **Avoid:** admin-dashboard look (dense grey tables everywhere, gradient headers, rainbow charts), decorative glassmorphism, emoji-heavy UI.
- **Imagery:** simple line illustrations for empty states (moon phases indicating progress: new moon = empty, full moon = complete).

## 3. Design system

The design system ("Luna DS") has three layers:

| Layer | Contents | Location in code |
|---|---|---|
| Tokens | Colours, type, spacing, radius, elevation, motion, z-index | `src/styles/tokens.css` (CSS variables) + `tailwind.config.ts` mapping |
| Primitives | Button, IconButton, Input, Textarea, Select, Combobox, Checkbox, Switch, Radio, DatePicker, Dialog, Drawer, Sheet, Popover, Menu, Tabs, Tooltip, Toast, Badge, Avatar, Skeleton | `src/components/ui` |
| Patterns | PageHeader, FilterBar, EmptyState, ErrorState, OfflineBanner, VisibilityToggle, FieldStatusChip, DateField, DeadlineBadge, PersonPicker, FileDrop, CommandPalette, ActivityItem, ApprovalCard | `src/components/patterns` |

## 4. Color palette

### 4.1 Brand and neutrals

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-primary` | <span class="swatch" style="background:#5B4FE0"></span>`#5B4FE0` | <span class="swatch" style="background:#8B82F2"></span>`#8B82F2` | Primary buttons, links, focus ring, active nav |
| `--color-primary-hover` | `#4A3FCC` | `#A29BF5` | Hover/pressed |
| `--color-primary-subtle` | <span class="swatch" style="background:#EEECFD"></span>`#EEECFD` | <span class="swatch" style="background:#25224A"></span>`#25224A` | Selected rows, active nav background |
| `--color-accent` (Moonlight) | <span class="swatch" style="background:#E9B949"></span>`#E9B949` | `#F0C866` | Achievements, highlights, focus timer; never for text on white |
| `--color-bg` | <span class="swatch" style="background:#F7F7FB"></span>`#F7F7FB` | <span class="swatch" style="background:#0E1022"></span>`#0E1022` | App background |
| `--color-surface` | `#FFFFFF` | <span class="swatch" style="background:#171A33"></span>`#171A33` | Cards, panels |
| `--color-surface-raised` | `#FFFFFF` | <span class="swatch" style="background:#20243F"></span>`#20243F` | Dialogs, menus |
| `--color-border` | `#E4E4EE` | `#2C3050` | Dividers, inputs |
| `--color-text` | <span class="swatch" style="background:#1B1D2E"></span>`#1B1D2E` | `#ECEDF6` | Body text |
| `--color-text-muted` | `#5E6178` | `#A3A6C0` | Secondary text (≥ 4.5:1 on bg) |

### 4.2 Semantic colours

| Token | Light | Use | Paired icon |
|---|---|---|---|
| `--color-success` | <span class="swatch" style="background:#1E9E6A"></span>`#1E9E6A` | Done, Confirmed, eligible | ✓ check |
| `--color-info` | <span class="swatch" style="background:#2F6FD6"></span>`#2F6FD6` | Inferred, informational | ≈ approx |
| `--color-warning` | <span class="swatch" style="background:#C27C0A"></span>`#C27C0A` | Conflicting, due soon, check needed | ! triangle |
| `--color-danger` | <span class="swatch" style="background:#C93C3C"></span>`#C93C3C` | Overdue, destructive, not eligible | ✕ / octagon |
| `--color-neutral` | <span class="swatch" style="background:#8A8DA6"></span>`#8A8DA6` | Missing, archived | ? / dash |

**Rule:** colour is never the only signal — every status also has an icon and a text label (WCAG 1.4.1).

### 4.3 Category colours (calendar layers, tags)

Eight hues with light/dark variants: Indigo `#5B4FE0`, Teal `#14A3A3`, Rose `#D9467A`, Amber `#C98A0B`, Green `#2E9B5F`, Sky `#2F86D6`, Violet `#8C4FD6`, Slate `#5E6B85`. Default mapping: Shared events = Indigo, Personal = Teal, Opportunity dates = Rose, Task due = Amber, Academics = Sky, Travel = Green.

## 5. Typography

| Token | Size / line height | Weight | Use |
|---|---|---|---|
| `display` | 30 / 36 px | 700 | Onboarding, empty-state headlines |
| `h1` | 24 / 32 px | 700 | Page titles |
| `h2` | 20 / 28 px | 600 | Section titles, dialog titles |
| `h3` | 16 / 24 px | 600 | Card titles |
| `body` | 15 / 22 px (mobile 16 / 24) | 400 | Default text |
| `body-sm` | 13 / 20 px | 400 | Metadata, table cells |
| `caption` | 12 / 16 px | 500 | Chips, labels, timestamps |
| `mono` | 13 / 20 px | 400 | Code, snippets, IDs |

- **Fonts:** Inter (UI) and JetBrains Mono (code), both open licence, **self-hosted** via npm packages (no runtime Google Fonts request), subset to Latin + Latin Extended, `font-display: swap`. System fallback: `Segoe UI, Roboto, sans-serif`.
- Numbers in tables and timers use tabular figures (`font-variant-numeric: tabular-nums`).
- Maximum line length for reading views (notes): 72 characters.

## 6. Spacing and layout

| Token | Value | Token | Value |
|---|---|---|---|
| `space-1` | 4 px | `radius-sm` | 6 px (chips, inputs) |
| `space-2` | 8 px | `radius-md` | 10 px (cards, buttons) |
| `space-3` | 12 px | `radius-lg` | 16 px (dialogs, sheets) |
| `space-4` | 16 px | `elev-1` | 0 1px 2px rgba(20,23,46,.06) — cards |
| `space-6` | 24 px | `elev-2` | 0 4px 12px rgba(20,23,46,.10) — menus, drawers |
| `space-8` | 32 px | `elev-3` | 0 12px 32px rgba(20,23,46,.16) — dialogs |

**Grid:** 4 px base. Desktop content uses a 12-column grid, 24 px gutters, max content width 1280 px. Mobile uses a single column with 16 px side margins.

**Breakpoints:** `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536 px.

**Touch targets:** at least 44 × 44 px on touch devices; 32 px minimum on desktop with pointer.

## 7. Component system

| Component | Variants / states | Key behaviour |
|---|---|---|
| Button | primary, secondary, ghost, danger; sm/md/lg; loading, disabled | Loading keeps width; danger requires confirmation for irreversible actions |
| Input / Textarea | default, error, disabled, read-only; with prefix/suffix | Error text below, linked via `aria-describedby` |
| DateField | date-only / date-time toggle; time-zone selector when timed | Date-only never shows a time; shows "All day" |
| DeadlineBadge | > 7 days (neutral), ≤ 7 days (warning), ≤ 1 day (danger), passed (muted, struck) | Shows "in 3 days" + absolute date in tooltip |
| FieldStatusChip | Confirmed, Inferred, Missing, Conflicting, Manual | Icon + label; tooltip with evidence/rule |
| VisibilityToggle | Shared / Private | Lock icon for private; changing to shared asks for confirmation (PRD PRIV-03) |
| Card | default, interactive, selected, dragging | Entire card clickable; secondary actions in kebab menu |
| Drawer | right side, 480 px desktop; full-screen sheet on mobile | Esc closes; focus trapped; URL query reflects open item |
| Dialog | confirm, form, destructive | Primary action on the right; Esc/backdrop closes unless unsaved changes |
| Toast | success, info, warning, error; with Undo action | 5 s default, 8 s with Undo; announced via `aria-live` |
| Tabs | underline (desktop), scrollable chips (mobile) | Keyboard arrows move between tabs |
| Avatar / PresenceDot | online, away, focus, busy, offline | Focus shows moon icon |
| EmptyState | illustration, title, one-line explanation, primary action | Every list has one |
| Skeleton | line, card, table row | Shown after 150 ms to avoid flicker |
| ApprovalCard (R2) | pending, approved, declined | Approve/Decline buttons only for the requested approver |

## 8. Navigation design

| Element | Desktop | Mobile |
|---|---|---|
| Primary navigation | Left sidebar, 240 px, collapsible to 64 px icon rail | Bottom bar with 5 items: Home, Opportunities, Projects, Chat, More |
| Secondary modules | Sidebar lower group: Academics, Growth, Trips, Portfolio, Contacts (appear as released) | "More" sheet: Calendar, My tasks, Vault, Academics, Growth, Trips, Portfolio, Contacts, Settings, Recycle bin |
| Global actions | Top bar: search field (Ctrl+K), Quick add (+), Notifications, Availability, Avatar menu | Top bar: page title, search icon, bell; Quick add as floating button above bottom bar on list pages |
| Object tabs | Underlined tabs below page header | Scrollable tab chips |
| Badges | Unread count on Chat and bell; overdue count on My tasks | Same on bottom bar |
| Project guests | Guest shell: top bar with room switcher, bell and avatar; the room's tabs as the only navigation; no sidebar modules, no quick add outside the room | Same; the room tab strip replaces the bottom bar |

**Why Calendar is not in the mobile bottom bar:** the top five daily mobile actions (from personas) are check status, capture opportunity, update tasks, chat, and "everything else". Calendar is reachable from Home's deadlines widget and the More sheet. **Unresolved:** validate with users; swap Projects ↔ Calendar if usage shows otherwise.

## 9. Desktop layout

<div class="wf">
 <div class="wf-bar"><b>🌙 Luna Space</b><span class="wf-input" style="flex:1;max-width:320px"><span class="wf-n">2</span>Search or type a command… Ctrl K</span><span class="wf-grow"></span><span class="wf-btn"><span class="wf-n">3</span>+ New</span><span>🔔 3</span><span class="wf-chip ok">● Available</span><span>(A)</span></div>
 <div class="wf-row" style="gap:0;min-height:210px">
  <div class="wf-side"><span class="wf-n">1</span><div class="it on">Home</div><div class="it">Opportunities</div><div class="it">Projects</div><div class="it">My tasks</div><div class="it">Calendar</div><div class="it">Chat •2</div><div class="it">Vault</div><div class="it wf-muted">— Academics</div><div class="it wf-muted">Growth</div><div class="it wf-muted">Trips</div><div class="it wf-muted">Portfolio</div><div class="it wf-muted">Contacts</div></div>
  <div class="wf-main"><div class="wf-row"><b style="font-size:9pt">Page title</b><span class="wf-grow"></span><span class="wf-chip"><span class="wf-n">4</span>View switch</span><span class="wf-chip">Filters</span></div>
   <div class="wf-row" style="flex:1"><div class="wf-card wf-grow"><span class="wf-n">5</span>Main content (12-col grid, max 1280 px)<div class="wf-line"></div><div class="wf-line m"></div><div class="wf-line s"></div></div><div class="wf-card" style="width:150px"><span class="wf-n">6</span>Right drawer (480 px) for task / event / note<div class="wf-line"></div><div class="wf-line s"></div></div></div></div>
 </div>
</div>
<ol class="ann"><li>Sidebar: primary modules; collapses to icon rail below 1280 px or on demand.</li><li>Global search and command palette.</li><li>Quick add menu: Opportunity from URL, Task, Event, Note, Bookmark.</li><li>Page-level view switch (e.g. List / Pipeline) and filters; state kept in the URL.</li><li>Content area.</li><li>Drawer opens over content on <code>lg</code>, pushes content on <code>2xl</code>.</li></ol>

## 10. Android/mobile layout

<div class="two">
<div><div class="wf-phone">
 <div class="wf-bar"><b>Home</b><span class="wf-grow"></span>🔍 🔔</div>
 <div style="padding:6px;display:flex;flex-direction:column;gap:5px;min-height:250px">
  <div class="wf-row"><span class="wf-chip">Shared</span><span class="wf-chip ok">Me</span><span class="wf-n">1</span></div>
  <div class="wf-card"><h6>Next deadlines</h6><div class="wf-line"></div><div class="wf-line m"></div></div>
  <div class="wf-card"><h6>Active projects</h6><div class="wf-line"></div></div>
  <div class="wf-card"><h6>Recent activity</h6><div class="wf-line s"></div></div>
  <div style="margin-left:auto;margin-top:auto"><span class="wf-btn" style="border-radius:20px">＋</span><span class="wf-n">2</span></div>
 </div>
 <div class="wf-tabbar"><span class="on">Home</span><span>Opps</span><span>Projects</span><span>Chat•</span><span>More</span><span class="wf-n">3</span></div>
</div></div>
<div><ol class="ann"><li>View toggle remembered per device.</li><li>Floating Quick add (bottom-right, above the tab bar, thumb reach). Hidden while the keyboard is open.</li><li>Bottom bar: 5 destinations, 64 px tall plus safe-area inset; labels always visible.</li></ol>
<p><b>Mobile rules</b></p><ul><li>Drawers become full-screen sheets with a back arrow and swipe-down to close (when no unsaved changes).</li><li>Filters open as a bottom sheet with Apply/Reset.</li><li>Tables become stacked cards; comparison table scrolls horizontally with a frozen first column.</li><li>Long-press on a card opens its action menu (alternative to kebab button).</li><li>Respect Android back gesture: closes sheet → drawer → page in that order.</li><li>Inputs use the right keyboard (<code>type=url</code>, <code>inputmode=numeric</code>).</li></ul></div>
</div>

## 11. Responsive behaviour

| Element | < 768 px (mobile) | 768–1023 px (tablet) | ≥ 1024 px (laptop) |
|---|---|---|---|
| Navigation | Bottom bar + More sheet | Icon rail (64 px) | Full sidebar (240 px), collapsible |
| Dashboard | 1 column, widget order: deadlines, my tasks, projects, activity | 2 columns | 3 columns |
| Opportunity list | Cards | Cards, 2 per row | Table or cards (toggle) |
| Opportunity detail | Tabs as chips; sticky action bar at bottom | Same | Two columns: main + side facts panel |
| Extraction review | One field per row, status chip above value | Same | Three columns: field, value, evidence |
| Board | One column visible, swipe between columns; column picker | 2–3 columns visible | All 5 columns |
| Calendar | Agenda default; month as dots | Week default | Month/week default |
| Chat | Full screen | List + conversation | Conversation + right info panel (files, pinned) |
| Drawer | Full-screen sheet | 420 px overlay | 480 px overlay/push |

## 12. Dashboard wireframe

<div class="wf">
 <div class="wf-bar"><b>Good evening, A</b><span class="wf-chip"><span class="wf-n">1</span>Shared</span><span class="wf-chip ok">Me</span><span class="wf-grow"></span><span class="wf-btn g">Paste URL</span><span class="wf-btn g">Task</span><span class="wf-btn g">Event</span><span class="wf-btn g">Note</span><span class="wf-n">2</span></div>
 <div class="wf-main">
  <div class="wf-row">
   <div class="wf-card wf-grow"><h6><span class="wf-n">3</span>Upcoming deadlines · next 14 days</h6>
    <div class="wf-row"><span class="wf-chip bad">Tomorrow</span><span class="wf-grow">Registration — Moonshot Hack 2026</span><span class="wf-muted">Opportunity</span></div>
    <div class="wf-row"><span class="wf-chip con">in 3 days</span><span class="wf-grow">Submit demo video</span><span class="wf-muted">Task · B</span></div>
    <div class="wf-row"><span class="wf-chip">in 9 days</span><span class="wf-grow">Scholarship essay due</span><span class="wf-muted">Opportunity · private 🔒</span></div>
   </div>
   <div class="wf-card" style="width:34%"><h6><span class="wf-n">4</span>Needs attention</h6><div>⚠ 2 opportunities missing eligibility</div><div>⏰ 1 overdue task</div><div class="wf-muted">⇄ Deadline changed: Orbit Hack (R2)</div></div>
  </div>
  <div class="wf-row">
   <div class="wf-card wf-grow"><h6><span class="wf-n">5</span>Active projects</h6><div class="wf-row"><div class="wf-card wf-grow"><b>Moonshot Hack</b><br/>Building · 12/20 tasks<div class="wf-line" style="background:#5B4FE0;width:60%"></div>Next: Demo freeze, Fri</div><div class="wf-card wf-grow"><b>Thesis app</b><br/>Planning · 3/14<div class="wf-line" style="background:#5B4FE0;width:20%"></div>Next: Proposal, 2 Dec</div></div></div>
   <div class="wf-card" style="width:34%"><h6><span class="wf-n">6</span>Recent activity</h6><div>B moved "Auth flow" → Review · 5m</div><div>A added Orbit Hack · 1h</div><div class="wf-muted">B completed checklist item · 2h</div></div>
  </div>
  <div class="wf-row"><div class="wf-card wf-grow"><h6><span class="wf-n">7</span>This week's goals (R2)</h6><div class="wf-line m"></div></div><div class="wf-card wf-grow"><h6>Notifications</h6>3 unread · latest: "B assigned you a task"</div></div>
 </div>
</div>
<ol class="ann"><li>Shared / Me toggle (FR-DASH-01). "Me" filters every widget to items owned by or assigned to the viewer, plus private items.</li><li>Quick actions (FR-DASH-05).</li><li>Deadlines merge opportunity dates, task due dates and calendar deadlines (FR-DASH-02); badge colour by urgency; private items show a lock.</li><li>Warnings widget (R2; in R1 shows missing-information warnings only).</li><li>Project cards: stage, progress, next milestone; click opens project room.</li><li>Activity: last 20 shared entries; partner's entries show avatar.</li><li>Goals widget appears in R2 (hidden, not empty, in R1).</li></ol>

## 13. Opportunity list wireframe

<div class="wf">
 <div class="wf-bar"><b>Opportunities</b><span class="wf-chip ok"><span class="wf-n">1</span>List</span><span class="wf-chip">Pipeline</span><span class="wf-grow"></span><span class="wf-btn"><span class="wf-n">2</span>+ Add from URL</span></div>
 <div class="wf-main">
  <div class="wf-row"><span class="wf-input" style="width:30%">Search opportunities</span><span class="wf-chip"><span class="wf-n">3</span>Type ▾</span><span class="wf-chip">Status ▾</span><span class="wf-chip">Mode ▾</span><span class="wf-chip">Deadline: next 30 days ✕</span><span class="wf-chip">Tag ▾</span><span class="wf-grow"></span><span class="wf-chip">Sort: Nearest deadline ▾</span><span class="wf-chip">Compare (2)</span><span class="wf-n">4</span></div>
  <div class="wf-card"><div class="wf-row"><span>☐</span><b class="wf-grow">Moonshot Hack 2026</b><span class="wf-chip">Hackathon</span><span class="wf-chip">Hybrid · Bengaluru</span><span class="wf-chip bad">Reg. tomorrow</span><span class="wf-chip ok">Registered</span><span>(A)(B)</span></div><div class="wf-row wf-muted"><span>Organizer: Moon Labs · Team 2–4 · Free · Prize ₹1,00,000</span><span class="wf-grow"></span><span class="wf-chip ok">✓ Known platform</span><span>→ Project</span><span class="wf-n">5</span></div></div>
  <div class="wf-card"><div class="wf-row"><span>☑</span><b class="wf-grow">Summer Research Fellowship</b><span class="wf-chip">Fellowship</span><span class="wf-chip">Offline</span><span class="wf-chip con">Due in 6 days</span><span class="wf-chip">Interested</span><span>🔒</span></div><div class="wf-row wf-muted"><span>Eligibility: <span class="wf-chip miss">? Missing</span> · Fee: —</span><span class="wf-grow"></span><span class="wf-chip con">! 2 fields need review</span><span class="wf-n">6</span></div></div>
  <div class="wf-card"><div class="wf-row"><span>☑</span><b class="wf-grow">Open Source Winter Programme</b><span class="wf-chip">Open-source</span><span class="wf-chip">Online</span><span class="wf-chip">Due 15 Dec</span><span class="wf-chip">Saved</span></div></div>
 </div>
</div>
<ol class="ann"><li>List and Pipeline (status columns grouped as Discover / Preparing / Submitted / Closed) views; choice stored in URL.</li><li>Primary action opens the paste-URL screen; secondary "Enter manually" inside it.</li><li>Filters are chips; active filters show a clear (✕) control; all filters reflected in the URL so they can be shared in chat.</li><li>Selecting 2–4 rows enables Compare (R2).</li><li>Card: type, mode/location, nearest deadline badge, status, participants, credibility (R2), linked project.</li><li>Warning summary when fields are Missing/Inferred-unverified; private items show the lock.</li></ol>

## 14. Opportunity detail wireframe

<div class="wf">
 <div class="wf-bar"><span>← Opportunities</span><b>Moonshot Hack 2026</b><span class="wf-chip">Hackathon</span><span class="wf-grow"></span><span class="wf-chip ok"><span class="wf-n">1</span>Status: Registered ▾</span><span class="wf-btn">Open project →</span><span class="wf-btn g">⋯</span></div>
 <div class="wf-row" style="padding:0 8px;gap:12px;border-bottom:1px solid #D5D6E2"><b style="color:#3B31B8">Overview</b><span>Dates</span><span>Sources &amp; history</span><span class="wf-muted">Eligibility (R2)</span><span class="wf-muted">Participation (R2)</span><span class="wf-n">2</span></div>
 <div class="wf-main"><div class="wf-row">
  <div class="wf-col wf-grow">
   <div class="wf-card"><h6>About</h6><div class="wf-line"></div><div class="wf-line m"></div><div class="wf-line s"></div></div>
   <div class="wf-card"><h6><span class="wf-n">3</span>Key facts</h6>
    <div class="wf-row"><span style="width:110px">Team size</span><b class="wf-grow">2–4</b><span class="wf-chip ok">✓ Confirmed</span></div>
    <div class="wf-row"><span style="width:110px">Mode</span><b class="wf-grow">Hybrid — Bengaluru</b><span class="wf-chip inf">≈ Inferred · checked by A</span></div>
    <div class="wf-row"><span style="width:110px">Fee</span><b class="wf-grow">Free</b><span class="wf-chip">✎ Manual</span></div>
    <div class="wf-row"><span style="width:110px">Eligibility</span><b class="wf-grow wf-muted">Not provided</b><span class="wf-chip miss">? Missing</span><span class="wf-btn g">Add</span></div>
   </div>
   <div class="wf-card"><h6>Tracks &amp; prizes · Required documents</h6><span class="wf-chip">AI for Good</span> <span class="wf-chip">Open Innovation</span><div class="wf-line m"></div></div>
  </div>
  <div class="wf-col" style="width:36%">
   <div class="wf-card"><h6><span class="wf-n">4</span>Dates</h6><div class="wf-row"><span class="wf-grow">Registration</span><b>18 Nov 2026</b><span class="wf-chip bad">tomorrow</span></div><div class="wf-row"><span class="wf-grow">Submission</span><b>6 Dec, 23:59 IST</b></div><div class="wf-row"><span class="wf-grow">Event</span><b>5–6 Dec 2026</b></div><div class="wf-muted">🔔 Reminders: 7d, 1d, on the day</div></div>
   <div class="wf-card"><h6><span class="wf-n">5</span>Source</h6>moonlabs.example/hack · <span class="wf-chip ok">Official organizer</span><br/><span class="wf-muted">Last checked 17 Nov, 20:10 · </span><span class="wf-btn g">Re-check</span></div>
   <div class="wf-card"><h6>Links</h6>Website · Register · Rules</div>
   <div class="wf-card"><h6>Project</h6>Moonshot Hack — Building · 12/20</div>
  </div>
 </div></div>
</div>
<ol class="ann"><li>Status menu (FR-OPP-04); changing status logs history and adjusts reminders.</li><li>Tabs; Eligibility and Participation appear in R2.</li><li>Every key fact shows its provenance chip; tooltip shows evidence snippet, rule, run time and verifier (FR-OPP-11).</li><li>Dates panel distinguishes date-only ("18 Nov 2026") from timed ("6 Dec, 23:59 IST"); viewer's zone shown in tooltip when different.</li><li>Source panel: credibility (R2), last checked, Re-check (manual in R1, scheduled in R2). Sources &amp; history tab lists all changes (old → new, who/what, when).</li></ol>

## 15. URL extraction review screen

<div class="wf">
 <div class="wf-bar"><b>Review extracted details</b><span class="wf-muted">moonlabs.example/hack · fetched 17 Nov 20:10</span><span class="wf-grow"></span><span class="wf-chip ok">9 confirmed</span><span class="wf-chip inf">2 inferred</span><span class="wf-chip miss">3 missing</span><span class="wf-chip con">1 conflicting</span><span class="wf-n">1</span></div>
 <div class="wf-main">
  <div class="wf-card" style="background:#FFFAEE"><span class="wf-n">2</span>Nothing is saved until you choose <b>Save opportunity</b>. Values come only from the page; missing values stay empty.</div>
  <div class="wf-row wf-muted"><span style="width:120px">Field</span><span class="wf-grow">Value (editable)</span><span style="width:35%">Evidence from page</span></div>
  <div class="wf-row wf-card"><span style="width:120px">Name</span><span class="wf-input wf-grow" style="color:#1B1D2E">Moonshot Hack 2026</span><span style="width:35%"><span class="wf-chip ok">✓ Confirmed</span> JSON-LD "name"</span></div>
  <div class="wf-row wf-card"><span style="width:120px">Registration deadline</span><span class="wf-input wf-grow" style="color:#1B1D2E">18 Nov 2026 · all day</span><span style="width:35%"><span class="wf-chip inf">≈ Inferred</span> "Register by 18 Nov" — year assumed from fetch date <label>☐ I checked this</label><span class="wf-n">3</span></span></div>
  <div class="wf-row wf-card" style="border-color:#E9B949"><span style="width:120px">Submission deadline</span><span class="wf-grow">◉ 6 Dec 2026, 23:59 IST<br/>○ 7 Dec 2026<br/>○ Enter another / leave empty</span><span style="width:35%"><span class="wf-chip con">! Conflicting</span> "Submissions close 6 Dec, 11:59 PM IST" · "Final deadline: 7 December"<span class="wf-n">4</span></span></div>
  <div class="wf-row wf-card"><span style="width:120px">Eligibility</span><span class="wf-input wf-grow">Not found — type if known</span><span style="width:35%"><span class="wf-chip miss">? Missing</span> no matching text<span class="wf-n">5</span></span></div>
  <div class="wf-row"><span class="wf-btn g">Show all 15 fields</span><span class="wf-grow"></span><span class="wf-chip">Visibility: Shared ▾</span><span class="wf-btn g">Discard</span><span class="wf-btn" style="opacity:.5">Save opportunity (resolve 1 conflict)</span><span class="wf-n">6</span></div>
 </div>
</div>
<ol class="ann"><li>Summary counts by status; clicking a count filters the list.</li><li>Persistent explanation of the "never fabricate" rule (FR-OPP-09).</li><li>Inferred values must be ticked "I checked this" or edited before Save; the reason is always visible.</li><li>Conflicts show every candidate with its evidence; Save is disabled until resolved (AC-10).</li><li>Missing fields are empty inputs with a neutral chip; nothing pre-filled.</li><li>Save writes opportunity, dates, source, provenance and history in one transaction. Discard keeps the run for 7 days (audit) but creates nothing.</li></ol>

**Mobile:** each field is a card: label + chip on the first line, value input, then evidence collapsed under "Why?". A sticky bottom bar shows "1 conflict left" and the Save button.

**Failure state:** a banner explains the reason ("This page loads its content with JavaScript, so little information was found") and shows the manual form with the URL pre-filled. Any fields that were found are still offered.

## 16. Project room wireframe

<div class="wf">
 <div class="wf-bar"><span>← Projects</span><b>Moonshot Hack</b><span class="wf-chip">Hackathon</span><span class="wf-chip ok"><span class="wf-n">1</span>Stage: Building ▾</span><span class="wf-grow"></span><span>(A)(B) viewing</span><span class="wf-btn g">Share link</span></div>
 <div class="wf-row" style="padding:0 8px;gap:12px;border-bottom:1px solid #D5D6E2"><b style="color:#3B31B8">Overview</b><span>Board</span><span>Notes</span><span>Files</span><span>Checklist</span><span>Chat</span><span>Activity</span><span class="wf-muted">People (R1) · Meetings · Ideas · Decisions (R2) · Pitch · Judge Q&amp;A · Retro (R3)</span><span class="wf-n">2</span></div>
 <div class="wf-main"><div class="wf-row">
  <div class="wf-col wf-grow">
   <div class="wf-card"><h6>Summary</h6><div class="wf-line"></div><div class="wf-line m"></div></div>
   <div class="wf-row"><div class="wf-card wf-grow"><h6><span class="wf-n">3</span>Progress</h6>12 / 20 tasks · Checklist 5 / 9<div class="wf-line" style="background:#5B4FE0;width:60%"></div></div><div class="wf-card wf-grow"><h6>Next deadlines</h6>Demo freeze — Fri<br/>Submission — 6 Dec 23:59 IST</div></div>
   <div class="wf-card"><h6>Recent decisions (R2)</h6><span class="wf-muted">Use Supabase for backend — approved by B</span></div>
  </div>
  <div class="wf-col" style="width:34%">
   <div class="wf-card"><h6><span class="wf-n">4</span>Team</h6>(A) Lead, pitch · (B) Backend, demo</div>
   <div class="wf-card"><h6>Links</h6>Opportunity: Moonshot Hack 2026<br/>Repo: github.com/…/moonshot<br/>Figma, Devpost page</div>
   <div class="wf-card"><h6>Key dates</h6>Start 5 Dec · End 6 Dec</div>
  </div>
 </div></div>
</div>
<ol class="ann"><li>Stage selector (FR-PRJ-02); "completed" prompts retrospective and portfolio (R3).</li><li>Tabs by release (People in R1 for guest management, Meetings in R2); unreleased tabs are not shown (listed here for completeness).</li><li>Progress from tasks and checklist.</li><li>Team roles are free text per member; links include the source opportunity and repositories.</li></ol>

## 17. Kanban board wireframe

<div class="wf">
 <div class="wf-bar"><b>Board</b><span class="wf-chip">Assignee: All ▾</span><span class="wf-chip">Priority ▾</span><span class="wf-chip">Due ▾</span><span class="wf-grow"></span><span class="wf-chip">Group: none ▾</span></div>
 <div class="wf-main"><div class="wf-row" style="align-items:stretch">
  <div class="wf-kcol"><b>Backlog · 4</b><div class="wf-card">Stretch: offline mode</div><div class="wf-card">Leaderboard</div><span class="wf-muted">+ Add</span></div>
  <div class="wf-kcol"><b>To do · 3</b><div class="wf-card"><span class="wf-chip bad">Urgent</span> Pitch deck v1<br/><span class="wf-muted">(A) · Due Thu · ☑ 1/3</span></div><div class="wf-card">Record demo<br/><span class="wf-muted">(B) · Fri</span></div><span class="wf-muted">+ Add</span><span class="wf-n">1</span></div>
  <div class="wf-kcol"><b>In progress · 2</b><div class="wf-card" style="border:1.5px dashed #5B4FE0;transform:rotate(-2deg)"><span class="wf-n">2</span>Auth flow<br/><span class="wf-muted">(B) · 💬 3 · 📎 1</span></div><div class="wf-card">API for tasks<br/><span class="wf-muted">(A)</span></div></div>
  <div class="wf-kcol"><b>Review · 1</b><div class="wf-card">DB schema<br/><span class="wf-muted">(B) · <span class="wf-chip">B is viewing</span></span><span class="wf-n">3</span></div></div>
  <div class="wf-kcol"><b>Done · 10</b><div class="wf-card wf-muted">Repo setup ✓</div><div class="wf-muted">Show all</div></div>
 </div></div>
</div>
<ol class="ann"><li>Card shows priority (only high/urgent shown as chips), assignee, due badge, subtask progress, comment and attachment counts.</li><li>Dragging card: lifted with shadow; drop targets highlighted. Keyboard: focus card → Space to pick up → arrows to move → Space to drop; screen reader announcements for each step.</li><li>Partner's live moves animate (200 ms) and briefly highlight; presence chip when the partner has the task open.</li></ol>

**Task drawer (opens on card click):** title (inline edit), status, assignee, priority, due (DateField), project, tags, visibility, description (Markdown), subtasks (checklist), attachments (drop zone), comments (newest last), activity. Mobile: full-screen sheet; board shows one column with a column picker and swipe navigation.

## 18. Calendar wireframe

<div class="wf">
 <div class="wf-bar"><b>November 2026</b><span>‹ Today ›</span><span class="wf-chip ok">Month</span><span class="wf-chip">Week</span><span class="wf-chip">Day</span><span class="wf-chip">Agenda</span><span class="wf-grow"></span><span class="wf-btn">+ Event</span></div>
 <div class="wf-row" style="gap:0">
  <div class="wf-side" style="width:120px"><b>Layers</b><span class="wf-n">1</span><div>☑ <span class="wf-ev e1" style="display:inline">Shared</span></div><div>☑ Personal</div><div>☑ <span class="wf-ev e2" style="display:inline">Opportunity dates</span></div><div>☑ <span class="wf-ev e4" style="display:inline">Task due</span></div><div>☑ Milestones</div><div class="wf-muted">☐ Timetable (R2)</div><div class="wf-muted">☐ Exams (R2)</div><br/><b>People</b><div>☑ A ☑ B</div></div>
  <div class="wf-main"><div class="wf-grid7"><div><b>Mon</b></div><div><b>Tue</b></div><div><b>Wed</b></div><div><b>Thu</b></div><div><b>Fri</b></div><div><b>Sat</b></div><div><b>Sun</b></div>
   <div>16</div><div style="outline:2px solid #5B4FE0">17<span class="wf-ev e1">19:00 Sync call</span></div><div>18<span class="wf-ev e2">◆ Reg: Moonshot</span><span class="wf-n">2</span></div><div>19<span class="wf-ev e4">Pitch deck v1</span></div><div>20<span class="wf-ev e4">Record demo</span></div><div>21</div><div>22</div>
   <div>23<span class="wf-ev e3">Exam: DBMS (R2)</span></div><div>24</div><div>25<span class="wf-ev e2">◆ Fellowship due</span><span class="wf-chip con">! clash</span><span class="wf-n">3</span></div><div>26</div><div>27</div><div>28</div><div>29</div></div></div>
 </div>
</div>
<ol class="ann"><li>Layer toggles (FR-CAL-02) with colour legend; person filter.</li><li>Derived items (opportunity dates, task due) have a distinct marker ◆ and open the source record drawer; dragging them edits the source (FR-CAL-03).</li><li>Conflict badge (R2) explains the clash on hover/tap.</li></ol>

**Event drawer:** title, kind, all-day toggle, start/end with time zone, location, description, linked project/opportunity, visibility, reminders (presets + custom). **Mobile:** Agenda view default; month view shows dots and a list for the selected day.

## 19. Chat wireframe

<div class="wf">
 <div class="wf-bar"><b>(B) Partner</b><span class="wf-chip ok">● Online</span><span class="wf-muted">Focus until 21:30 🌙</span><span class="wf-grow"></span><span class="wf-chip">All ▾ / Moonshot Hack</span><span class="wf-n">1</span><span class="wf-muted">📞 🎥 (R4)</span></div>
 <div class="wf-row" style="gap:0">
  <div class="wf-main">
   <div class="bubble">Pushed the auth flow, can you review?</div>
   <div class="bubble me"><span style="opacity:.8;border-left:2px solid #fff;padding-left:4px;display:block">↪ Pushed the auth flow…</span>On it after dinner <span class="wf-n">2</span></div>
   <div style="text-align:right;font-size:6.6pt" class="wf-muted">Seen 20:41 <span class="wf-n">3</span></div>
   <div class="bubble">📎 judging-rubric.pdf · 240 KB</div>
   <div class="bubble"><i class="wf-muted">message deleted</i></div>
   <div class="wf-card" style="max-width:70%;margin-left:auto"><span class="wf-n">4</span><b>/task</b> preview — "Fix login redirect" · assignee A · due Fri · project Moonshot<br/><span class="wf-btn">Create task</span> <span class="wf-btn g">Edit</span></div>
   <div class="wf-muted">👍 2 · ❤ 1 on "Pushed the auth flow"</div>
   <div class="wf-row"><span class="wf-input wf-grow">Message… ( / for commands )</span><span>📎</span><span>🎤 (R3)</span><span class="wf-btn">Send</span><span class="wf-n">5</span></div>
  </div>
  <div class="wf-side" style="width:140px;border-left:1px solid #D5D6E2;border-right:0"><b>Shared files</b><div>rubric.pdf</div><div>logo.png</div><b>Pinned</b><div class="wf-muted">Submission link</div></div>
 </div>
</div>
<ol class="ann"><li>Header: partner presence and availability; project filter (FR-CHAT-09).</li><li>Reply shows quoted preview; tapping it jumps to the original.</li><li>Read receipt on the last own message only (FR-CHAT-06).</li><li>Quick command preview card (R2): nothing is created until "Create" (FR-CHAT-10).</li><li>Composer: Enter sends on desktop (Shift+Enter newline); on mobile, Enter inserts newline and the Send button sends. Message actions (reply, react, edit, delete, copy, create task from message) on hover (desktop) or long-press (mobile).</li></ol>

## 20. Knowledge Vault wireframe

<div class="wf">
 <div class="wf-bar"><b>Vault</b><span class="wf-input" style="width:35%"><span class="wf-n">1</span>Search notes, files, links…</span><span class="wf-grow"></span><span class="wf-btn">+ New ▾</span></div>
 <div class="wf-row" style="gap:0">
  <div class="wf-side" style="width:130px"><span class="wf-n">2</span><div class="it on">All</div><div class="it">Notes</div><div class="it">Files</div><div class="it">Bookmarks</div><div class="it wf-muted">Snippets (R2)</div><b>Folders</b><div class="it">▸ Hackathons</div><div class="it">&nbsp;&nbsp;▸ Moonshot</div><div class="it">▸ Research</div><div class="it">▸ My notes 🔒</div><b>Tags</b><div><span class="wf-chip">pitch</span> <span class="wf-chip">ml</span></div></div>
  <div class="wf-main"><div class="wf-row">
   <div class="wf-col" style="width:45%"><div class="wf-card"><b>📝 Judging criteria notes</b><br/><span class="wf-muted">Moonshot · edited by B · 2h</span></div><div class="wf-card"><b>🔗 Devpost submission guide</b><br/><span class="wf-muted">Bookmark · reference</span></div><div class="wf-card"><b>📄 rubric.pdf</b><br/><span class="wf-muted">File · 240 KB</span></div><div class="wf-card"><b>📝 Weekly sync 17 Nov</b> <span class="wf-chip">Meeting</span></div></div>
   <div class="wf-card wf-grow"><span class="wf-n">3</span><b>Judging criteria notes</b> <span class="wf-chip">Shared</span><div class="wf-row wf-muted"><span>Edit</span><span>Preview</span><span>Split</span></div><div class="wf-line"></div><div class="wf-line m"></div><div class="wf-line"></div><div class="wf-line s"></div><div class="wf-muted">Linked: Moonshot Hack · Task "Pitch deck v1" (R2 backlinks)</div></div>
  </div></div>
 </div>
</div>
<ol class="ann"><li>Vault search highlights matches and filters by type, tag, folder, owner.</li><li>Navigation: smart views (All, Notes, Files, Bookmarks), folder tree (up to 4 levels), tags.</li><li>Note editor: Markdown with Edit / Preview / Split; autosave every 2 s after typing stops with "Saved" indicator; conflict banner if the partner saved meanwhile.</li></ol>

## 21. Personal productivity screens <span class="tag r2">R2</span>

<div class="two">
<div class="wf"><div class="wf-bar"><b>Focus</b><span class="wf-grow"></span><span class="wf-chip">Pomodoro</span><span class="wf-chip">Free</span></div><div class="wf-main" style="align-items:center;text-align:center"><div style="width:96px;height:96px;border-radius:50%;border:6px solid #E9B949;border-right-color:#E4E4EE;display:flex;align-items:center;justify-content:center;font-size:14pt;font-weight:700">18:42</div><div>Working on: <b>Pitch deck v1</b> ▾</div><div><span class="wf-btn">Pause</span> <span class="wf-btn g">Stop</span></div><div class="wf-muted">Session 2 of 4 · Partner sees "Focus"</div></div></div>
<div class="wf"><div class="wf-bar"><b>Skills</b><span class="wf-grow"></span><span class="wf-btn g">+ Skill</span></div><div class="wf-main"><div class="wf-row" style="flex-wrap:wrap"><b style="width:70px">React</b><span class="wf-chip">Not started</span>›<span class="wf-chip">Learning</span>›<span class="wf-chip">Practicing</span>›<span class="wf-chip ok">Applied</span>›<span class="wf-chip">Confident</span></div><div class="wf-row"><b style="width:70px">SQL</b><span class="wf-chip">…</span><span class="wf-chip ok">Practicing</span></div><div class="wf-muted">Evidence: Moonshot Hack (applied) · Course: DB Systems 60%</div></div></div>
</div>
<div class="two">
<div class="wf"><div class="wf-bar"><b>Goals · Week of 16 Nov</b></div><div class="wf-main"><div>☑ Shared: Submit Moonshot <span class="wf-chip">Shared</span></div><div>☐ Me: 5 focus hours <div class="wf-line" style="background:#E9B949;width:40%"></div></div><div>☐ Me: Finish SQL module 🔒</div></div></div>
<div class="wf"><div class="wf-bar"><b>Habits</b></div><div class="wf-main"><div class="wf-row"><span style="width:80px">Read 20 min</span><span>● ● ○ ● ● ● ○</span><span class="wf-muted">🔥 3</span></div><div class="wf-row"><span style="width:80px">DSA problem</span><span>● ● ● ● ○ ○ ○</span><span class="wf-muted">🔥 0</span></div></div></div>
</div>
<p class="wf-cap">Focus, Skills, Goals and Habits. Weekly review (/review) is a 4-step wizard with progress indicator (see Flow §18). Expenses (R3) use a list with a balance header ("B owes A ₹420") and a form with split options.</p>

## 22. Portfolio screens <span class="tag r3">R3</span>

<div class="wf">
 <div class="wf-bar"><b>My portfolio</b><span class="wf-chip">Timeline</span><span class="wf-chip ok">Entries</span><span class="wf-grow"></span><span class="wf-btn g">Export</span><span class="wf-btn">+ Entry</span></div>
 <div class="wf-main"><div class="wf-row">
  <div class="wf-col" style="width:42%"><div class="wf-card"><b>2026 · Moonshot Hack — Finalist</b><br/><span class="wf-chip">Hackathon</span> <span class="wf-chip ok">✓ verified from record</span></div><div class="wf-card"><b>2026 · DB Systems certificate</b><br/><span class="wf-chip">Certificate</span> 📎</div><div class="wf-card"><b>2025 · Open-source contribution</b><br/><span class="wf-chip">Open source</span> <span class="wf-chip">✎ entered by me</span></div></div>
  <div class="wf-card wf-grow"><h6>Moonshot Hack — Finalist</h6><div class="wf-row"><span style="width:80px">Role</span><b>Team lead, pitch</b><span class="wf-chip ok">✓ record</span></div><div class="wf-row"><span style="width:80px">Result</span><b>Finalist</b><span class="wf-chip ok">✓ opportunity outcome</span></div><div class="wf-row"><span style="width:80px">Skills</span><span class="wf-chip">React</span><span class="wf-chip">Supabase</span></div><h6>Résumé bullets <span class="wf-n">1</span></h6><div class="wf-card">• Led a 2-person team to the finals of Moonshot Hack 2026, building a … (from: project summary, outcome) <span class="wf-btn g">Accept</span></div><div class="wf-muted">No bullet is generated for facts that are not recorded.</div></div>
 </div></div>
</div>
<ol class="ann"><li>Bullets are drafts produced by deterministic templates; each shows its source fields; Accept/Edit/Discard (FR-PORT-05). The partner sees only entries marked shared, read-only.</li></ol>

## 23. Forms and modal behaviour

| Rule | Specification |
|---|---|
| Required fields | Marked with "Required" text (not only an asterisk); minimal required set (usually title). |
| Validation timing | On blur and on submit; errors summarised at the top for long forms with links to fields. |
| Saving | Explicit Save for create forms; autosave for notes and task descriptions (with "Saved" state). |
| Unsaved changes | Closing a dialog/drawer with unsaved changes asks "Discard changes?". |
| Destructive actions | Delete → moved to recycle bin with Undo toast (no confirm dialog). "Delete forever", "Leave workspace", "Revoke invitation", "Disconnect GitHub" → confirmation dialog naming the object and consequence. |
| Visibility | Every create form shows the VisibilityToggle with the module default; switching private → shared confirms. |
| Dates | DateField with "All day" toggle; time zone shown only for timed values; typing "tomorrow", "fri", "15 dec" supported. |
| Modals vs. drawers | Dialogs for short, blocking decisions; drawers for viewing/editing records; full pages for multi-step flows (onboarding, extraction review, weekly review). |
| Focus | Focus moves into dialog on open and returns to the trigger on close. |
| Keyboard shortcuts | Ctrl+K palette, N new (context), / focus search, E edit, Esc close, ? shortcut list. |

## 24. Empty, loading, error and offline states

<div class="two">
<div class="wf"><div class="wf-main" style="align-items:center;text-align:center;padding:14px"><div style="width:34px;height:34px;border-radius:50%;background:#14172E;box-shadow:inset -10px 0 0 #E9B949"></div><b>No opportunities yet</b><span class="wf-muted">Paste a link to a hackathon, internship or scholarship and we'll pull out the details for you to check.</span><span class="wf-btn">Add from URL</span><span class="wf-muted">or enter manually</span></div></div>
<div class="wf"><div class="wf-main"><div class="wf-card"><div class="wf-line"></div><div class="wf-line m"></div></div><div class="wf-card"><div class="wf-line"></div><div class="wf-line s"></div></div><div class="wf-card"><div class="wf-line m"></div></div><span class="wf-muted">Skeletons shown after 150 ms</span></div></div>
</div>
<div class="two">
<div class="wf"><div class="wf-main" style="text-align:center"><b>Couldn't load your tasks</b><span class="wf-muted">Check your connection and try again. Error ID 7f3a…</span><span><span class="wf-btn">Retry</span></span></div></div>
<div class="wf"><div class="wf-bar" style="background:#FFF1D6">⚡ You're offline — showing saved data. Changes are disabled (R1) / will sync when online (R2).</div><div class="wf-main"><div class="wf-card wf-muted">Cached list…</div></div></div>
</div>

| State | Rule |
|---|---|
| Empty (first use) | Illustration + one-sentence explanation + primary action; never a blank area. |
| Empty (filtered) | "No results for these filters" + Clear filters. |
| Loading | Skeleton matching final layout after 150 ms; spinner only inside buttons. |
| Partial failure | Widget-level error card; rest of page usable. |
| Error | Plain-language cause, what to do, Retry, error ID. |
| Offline | Top banner; cached data visible with "last updated" time; write actions disabled with tooltip (R1) or queued with a "pending" clock icon (R2). |
| Permission denied | "You don't have access to this item" + back. |
| Deleted | "This item is in the recycle bin" + Restore. |
| Quota warning | Banner at 80 % and 95 % of free storage with "Manage files". |

## 25. Accessibility requirements

| Area | Requirement (WCAG 2.2 AA) |
|---|---|
| Contrast | Text ≥ 4.5:1, large text and UI components ≥ 3:1, in both themes (tokens chosen to meet this; verified in CI with an automated check on Storybook-style pages or Playwright + axe). |
| Keyboard | Every action reachable by keyboard; visible focus ring (2 px `--color-primary` + 2 px offset); no keyboard traps; skip-to-content link. |
| Drag and drop | Keyboard alternative for board, calendar and file ordering; "Move to…" menu on every card. |
| Screen readers | Semantic landmarks; labelled controls; live regions for toasts, chat messages and board moves; status chips include text. |
| Motion | Respect `prefers-reduced-motion`: disable non-essential animation, keep state changes instant. |
| Targets | ≥ 24 × 24 px minimum (2.5.8), 44 px on touch layouts. |
| Forms | Labels always visible; errors announced and linked; no placeholder-only labels. |
| Time limits | None on forms; focus timer and location sharing are user-controlled. |
| Zoom | Usable at 200 % zoom and 320 px width without horizontal scrolling (except tables/board with intentional scroll). |
| Language | `lang="en"`; dates readable ("Tue, 18 Nov 2026") rather than numeric only. |

## 26. Interaction and animation guidelines

| Token | Duration / easing | Use |
|---|---|---|
| `motion-fast` | 120 ms, ease-out | Hover, press, chip toggle |
| `motion-base` | 200 ms, cubic-bezier(.2,.8,.2,1) | Drawer, dropdown, card move |
| `motion-slow` | 320 ms, same easing | Page-level transitions, sheet on mobile |

| Interaction | Behaviour |
|---|---|
| Optimistic updates | Board moves, checklist ticks, reactions and messages appear instantly; on failure, revert with a toast "Couldn't save — retried 3 times". |
| Partner activity | Partner's changes animate in with a 1.5 s soft highlight (`--color-primary-subtle`). |
| Undo | Delete, archive and status changes show an Undo toast for 8 s. |
| Celebrations | Completing a project or winning an opportunity shows a brief moon-phase "full moon" animation (disabled with reduced motion). Never for routine task completion. |
| Hover / long-press parity | Every hover action exists in a long-press or visible menu on touch. |
| Haptics | None (PWA limitations); rely on visual feedback. |
| Notifications | In-app toasts for events in the current context; others only increment the bell. |

## 27. Project people and guest management

<div class="wf">
 <div class="wf-bar"><span>← Projects</span><b>Moonshot Hack</b><span class="wf-chip">Hackathon</span><span class="wf-grow"></span><span class="wf-chip con">👁 3 guests in this room</span><span class="wf-n">1</span></div>
 <div class="wf-row" style="padding:0 8px;gap:12px;border-bottom:1px solid #D5D6E2"><span>Overview</span><span>Board</span><span>Notes</span><span>Files</span><span>Checklist</span><span>Meetings</span><b style="color:#3B31B8">People</b><span>Activity</span></div>
 <div class="wf-main">
  <div class="wf-row"><b class="wf-grow" style="font-size:9pt">People</b><span class="wf-btn g">Guest settings</span><span class="wf-btn">+ Invite guests</span><span class="wf-n">2</span></div>
  <div class="wf-card"><h6>Workspace members · 2 <span class="wf-muted">(permanent, full access)</span></h6>
   <div class="wf-row"><span>(A)</span><b class="wf-grow">A (you)</b><span class="wf-chip">Member</span><span class="wf-muted">Lead, pitch</span></div>
   <div class="wf-row"><span>(B)</span><b class="wf-grow">B</b><span class="wf-chip">Member</span><span class="wf-muted">Backend</span></div></div>
  <div class="wf-card"><h6>Room guests · 3 of 10 <span class="wf-n">3</span></h6>
   <div class="wf-row"><span>(C)</span><b class="wf-grow">Chitra</b><span class="wf-chip inf">Guest</span><span class="wf-input" style="width:110px;color:#1B1D2E">Project Admin ▾</span><span class="wf-muted">joined 12 Nov</span><span class="wf-btn g">Remove</span></div>
   <div class="wf-row"><span>(D)</span><b class="wf-grow">Dev</b><span class="wf-chip inf">Guest</span><span class="wf-input" style="width:110px;color:#1B1D2E">Collaborator ▾</span><span class="wf-muted">joined 13 Nov</span><span class="wf-btn g">Remove</span></div>
   <div class="wf-row"><span>(E)</span><b class="wf-grow">Esha</b><span class="wf-chip inf">Guest</span><span class="wf-input" style="width:110px;color:#1B1D2E">Viewer ▾</span><span class="wf-muted">joined today</span><span class="wf-btn g">Remove</span></div></div>
  <div class="wf-card"><h6>Invitations <span class="wf-n">4</span></h6>
   <div class="wf-row"><b class="wf-grow">Team Orbit link</b><span class="wf-chip">Collaborator</span><span class="wf-muted">expires 24 Nov · used 2 / 3</span><span class="wf-chip ok">Active</span><span class="wf-btn g">Revoke</span></div>
   <div class="wf-row wf-muted"><span class="wf-grow">Mentor preview</span><span class="wf-chip">Viewer</span><span>expired 15 Nov · used 0 / 1</span><span class="wf-chip miss">Expired</span></div>
   <div class="wf-row wf-muted"><span class="wf-grow">Old link</span><span class="wf-chip">Collaborator</span><span>revoked by A</span><span class="wf-chip bad">Revoked</span></div></div>
 </div>
</div>
<ol class="ann"><li>Guest-presence banner on every room tab while guests are present (FR-GUEST-14).</li><li>Invite and settings actions: workspace members and guest Project Admins only; Viewers and Collaborators see a read-only People list.</li><li>Guests are always labelled "Guest" with their role; the role selector offers Project Admin only to workspace members. Removing asks for confirmation naming the person and stating that their open assignments in this room will be cleared.</li><li>Invitations show label, role, expiry, use count and status. The link itself is never shown again after creation; a lost link is replaced by creating a new one.</li></ol>

**Guest settings sheet:** toggles — Collaborators can upload files · Collaborators can create tasks · Collaborators can schedule meetings (R2) · Viewers can comment · Guests can see room activity; number field — Maximum guests (1–25). Each toggle has a one-line explanation; changes are logged.

**Mobile:** sections become stacked cards; role selector opens a bottom sheet with role descriptions; Remove and Revoke move into each row's ⋯ menu.

## 28. Guest invitation dialog and acceptance

<div class="two">
<div class="wf"><div class="wf-bar"><b>Invite guests to Moonshot Hack</b></div><div class="wf-main">
 <div><b>Role</b> <span class="wf-n">1</span></div>
 <div class="wf-card">◉ <b>Collaborator</b> — create and edit tasks, notes, comments and files that guests can see</div>
 <div class="wf-card">○ <b>Viewer</b> — read-only access to what's shared with guests</div>
 <div class="wf-card wf-muted">○ <b>Project Admin</b> — also manage guests and room settings (members only)</div>
 <div class="wf-row"><span style="width:70px">Expires</span><span class="wf-input" style="color:#1B1D2E">In 7 days ▾</span><span style="width:60px">Max uses</span><span class="wf-input" style="color:#1B1D2E">3</span></div>
 <div class="wf-row"><span style="width:70px">Label</span><span class="wf-input wf-grow" style="color:#1B1D2E">Team Orbit link</span></div>
 <div class="wf-muted">Guests only see this room — never your dashboard, calendar, chat, opportunities or other projects. <span class="wf-n">2</span></div>
 <div class="wf-row"><span class="wf-grow"></span><span class="wf-btn g">Cancel</span><span class="wf-btn">Create link</span></div>
</div></div>
<div class="wf"><div class="wf-bar"><b>Link created</b></div><div class="wf-main">
 <div class="wf-card" style="background:#FFFAEE">Copy this link now — for security it won't be shown again. <span class="wf-n">3</span></div>
 <div class="wf-row"><span class="wf-input wf-grow" style="color:#1B1D2E">luna-space.pages.dev/join#Xq3…9fA</span><span class="wf-btn">Copy</span></div>
 <div class="wf-row"><span class="wf-btn g">Share…</span><span class="wf-muted">Collaborator · expires 24 Nov · up to 3 people</span></div>
 <div class="wf-row"><span class="wf-grow"></span><span class="wf-btn g">Done</span></div>
</div></div>
</div>
<ol class="ann"><li>Role cards with plain-language descriptions; Project Admin disabled (with explanation) when the inviter is a guest.</li><li>Scope reminder under the form (PRD PRIV-15/16).</li><li>One-time display; "Share…" uses the Android share sheet / Web Share API when available.</li></ol>

<div class="two">
<div><div class="wf-phone">
 <div class="wf-bar"><b>🌙 Luna Space</b></div>
 <div style="padding:8px;display:flex;flex-direction:column;gap:6px;min-height:230px">
  <b style="font-size:9pt">You're invited</b>
  <div>A invited you to join the project room <b>Moonshot Hack</b> as a <span class="wf-chip">Collaborator</span>. <span class="wf-n">1</span></div>
  <div class="wf-muted">You'll only see this room. You won't become a member of A's workspace.</div>
  <span class="wf-btn" style="text-align:center">Accept and join</span>
  <span class="wf-btn g" style="text-align:center">Create an account first</span>
  <span class="wf-muted" style="text-align:center">Not you? Sign out</span>
 </div>
</div></div>
<div><ol class="ann"><li>Acceptance screen (Flow §21.2) shows inviter's display name, room name and role before anything changes. Signed-out visitors see "Sign in" and "Create account"; after confirming their email they return here automatically.</li></ol>
<table><thead><tr><th>State</th><th>Message</th></tr></thead><tbody>
<tr><td>Invalid / expired / revoked / used up</td><td>"This invitation is no longer valid. Ask the person who invited you for a new link."</td></tr>
<tr><td>Room full</td><td>"This room is full. Ask a project admin to make space."</td></tr>
<tr><td>Already a member of the workspace</td><td>"You're already a member of this workspace" + Open room</td></tr>
<tr><td>Already a guest</td><td>Opens the room directly</td></tr>
</tbody></table></div>
</div>

## 29. Guest experience and indicators

<div class="two">
<div class="wf"><div class="wf-bar"><b>Moonshot Hack ▾</b><span class="wf-chip inf">Guest · Collaborator</span><span class="wf-grow"></span><span>🔔</span><span>(D)</span><span class="wf-n">1</span></div>
 <div class="wf-row" style="padding:0 8px;gap:10px;border-bottom:1px solid #D5D6E2"><b style="color:#3B31B8">Board</b><span>Overview</span><span>Notes</span><span>Files</span><span>Checklist</span><span>Meetings</span><span>People</span></div>
 <div class="wf-main"><div class="wf-row" style="align-items:stretch">
  <div class="wf-kcol"><b>To do</b><div class="wf-card">Pitch deck v1<br/><span class="wf-muted">(A) · Thu</span></div><div class="wf-card">Scrape dataset<br/><span class="wf-muted">(D) you · Fri</span></div></div>
  <div class="wf-kcol"><b>In progress</b><div class="wf-card">Auth flow<br/><span class="wf-muted">(B)</span></div></div>
  <div class="wf-kcol"><b>Done</b><div class="wf-card wf-muted">Repo setup ✓</div></div>
 </div><div class="wf-muted">Only items shared with guests are shown. <span class="wf-n">2</span></div></div>
</div>
<div class="wf"><div class="wf-bar"><b>Notes</b><span class="wf-grow"></span><span class="wf-btn g">+ Note</span></div><div class="wf-main">
 <div class="wf-row wf-card"><b class="wf-grow">Judging criteria</b><span class="wf-chip inf">👁 Visible to guests</span><span class="wf-n">3</span></div>
 <div class="wf-row wf-card"><b class="wf-grow">Our research (members)</b><span class="wf-chip miss">Members only</span><span class="wf-btn g">Share with guests</span></div>
 <div class="wf-row wf-card wf-muted"><b class="wf-grow">My private idea 🔒</b><span>Private — can't be shared with guests</span></div>
 <div class="wf-muted">Member's view of the same room</div>
</div></div>
</div>
<ol class="ann"><li>Guest shell: room switcher (only their rooms), a persistent "Guest · role" chip, bell and avatar menu (profile, leave room, sign out). No sidebar, dashboard, calendar, chat or vault.</li><li>Guests never see hints of hidden content (no counts of hidden items).</li><li>Members see an eye chip on guest-visible items and a one-click "Share with guests" / "Hide from guests"; private items explain why they can't be shared. Making an item visible shows a confirmation the first time.</li></ol>

| Indicator | Where | Rule |
|---|---|---|
| "Guest" chip + role | Names in People, assignee pickers, comments, activity | Always shown next to guests' names |
| 👁 Visible to guests | Task cards, notes, files, bookmarks, meetings (members' view) | Shown only when guests are present in the room |
| Guest-presence banner | Top of every room tab (members' view) | "3 guests can see items marked 👁" with link to People |
| Guest home | `/guest` | Room cards with role, next deadline and unread count; "Leave room" in each card's menu |

## 30. Meetings: list, scheduler and meeting page <span class="tag r2">R2</span>

<div class="wf">
 <div class="wf-bar"><b>Meetings</b><span class="wf-chip ok">Upcoming</span><span class="wf-chip">Previous</span><span class="wf-grow"></span><span class="wf-btn">+ Schedule meeting</span></div>
 <div class="wf-main">
  <div class="wf-card" style="border-color:#5B4FE0"><div class="wf-row"><b class="wf-grow">Daily stand-up</b><span class="wf-chip bad">Starts in 8 min</span><span class="wf-btn">Join meeting ↗</span><span class="wf-n">1</span></div><div class="wf-muted">Today 18:00–18:15 IST · 5 participants · Google Meet · 👁 guests</div></div>
  <div class="wf-card"><div class="wf-row"><b class="wf-grow">Judge Q&amp;A rehearsal</b><span class="wf-chip">Fri 20 Nov</span><span class="wf-btn g">Join meeting ↗</span></div><div class="wf-muted">19:30–20:30 IST · 3 going · 1 maybe · link added manually</div></div>
  <div class="wf-card"><div class="wf-row"><b class="wf-grow">Mentor check-in</b><span class="wf-chip">Sat 21 Nov</span><span class="wf-chip con">No link yet</span><span class="wf-btn g">Add link</span></div></div>
 </div>
</div>
<ol class="ann"><li>The Join button opens Google Meet in a new tab (Meet app on Android); it becomes primary and pulses gently (reduced-motion: static) from 10 minutes before start.</li></ol>

<div class="two">
<div class="wf"><div class="wf-bar"><b>Schedule meeting</b></div><div class="wf-main">
 <div class="wf-row"><span style="width:60px">Title</span><span class="wf-input wf-grow" style="color:#1B1D2E">Daily stand-up</span></div>
 <div class="wf-row"><span style="width:60px">When</span><span class="wf-input" style="color:#1B1D2E">Tue 17 Nov</span><span class="wf-input" style="color:#1B1D2E">18:00–18:15</span><span class="wf-input" style="color:#1B1D2E">Asia/Kolkata ▾</span></div>
 <div class="wf-row"><span style="width:60px">People</span><span class="wf-chip">A</span><span class="wf-chip">B</span><span class="wf-chip inf">Chitra · guest</span><span class="wf-chip inf">Dev · guest</span><span class="wf-muted">+ add</span></div>
 <div><b>Meeting link</b> <span class="wf-n">2</span></div>
 <div class="wf-card">◉ Create Google Meet link <span class="wf-muted">(connected as a…@gmail.com)</span></div>
 <div class="wf-card">○ Paste an existing Meet link<div class="wf-input" style="margin-top:3px;color:#8A8DA6">https://meet.google.com/abc-defg-hij</div></div>
 <div class="wf-card">○ Add a link later</div>
 <div class="wf-row"><span>Agenda</span><span class="wf-input wf-grow">Markdown…</span></div>
 <div class="wf-row"><span>☑ Visible to guests</span><span>🔔 1 day, 15 min</span><span class="wf-grow"></span><span class="wf-btn">Schedule</span></div>
</div></div>
<div class="wf"><div class="wf-bar"><b>Daily stand-up</b><span class="wf-grow"></span><span class="wf-btn">Join meeting ↗</span><span class="wf-n">3</span></div><div class="wf-main">
 <div class="wf-muted">Tue 17 Nov, 18:00–18:15 IST (14:30 your time) · organizer A · <span class="wf-btn g">Add to my calendar ▾</span></div>
 <div class="wf-row"><span class="wf-chip ok">A going</span><span class="wf-chip ok">B going</span><span class="wf-chip">Dev maybe</span><span class="wf-grow"></span><span class="wf-input" style="color:#1B1D2E">My response: Going ▾</span></div>
 <div class="wf-card"><h6>Agenda</h6><div class="wf-line m"></div></div>
 <div class="wf-card"><h6>Notes <span class="wf-muted">(meeting note in Vault)</span></h6><div class="wf-line"></div><div class="wf-line s"></div></div>
 <div class="wf-card"><h6>Decisions</h6>Use Supabase Realtime for the board — <span class="wf-muted">logged</span></div>
 <div class="wf-card"><h6>Action items <span class="wf-n">4</span></h6><div class="wf-row"><span class="wf-grow">Record 90-s demo · Dev · Thu</span><span class="wf-btn g">Convert to task</span></div><div class="wf-row wf-muted"><span class="wf-grow">Fix login redirect · A</span><span class="wf-chip ok">→ Task</span></div></div>
</div></div>
</div>
<ol class="ann" start="2"><li>Link options: "Create Google Meet link" appears only for workspace members who have connected Google (R3); otherwise it reads "Connect Google in Settings to create links automatically" and the paste option is selected. Pasted links are validated as you type. Guests see only the paste and later options.</li><li>Meeting page: Join, time in the organizer's zone and the viewer's zone, responses, agenda, notes, decisions and action items. "Add to my calendar" offers Google Calendar (template link) and .ics.</li><li>Converting an action item creates a guest-visible task in the room and replaces the button with a link to the task.</li></ol>

**Settings → Integrations → Google (R3):** card with status (Not connected · Connected as … · Reconnect needed), the exact permissions requested in plain language ("Create Google Calendar events with Meet links on your calendar"), Connect / Disconnect buttons, and a note that guests never use your Google account.

**States:** no meetings — "Plan your next team call" + Schedule; Google failed — banner "Couldn't create the Google Meet link. Your meeting is saved — try again or paste a link"; cancelled meetings shown struck through in Previous with "Cancelled".

## Glossary

| Term | Meaning |
|---|---|
| Token | A named design value (colour, size, duration) used consistently in code. |
| Drawer / Sheet | Side panel (desktop) / bottom or full-screen panel (mobile). |
| Skeleton | Grey placeholder shapes shown while content loads. |
| Optimistic update | Showing a change immediately, before the server confirms it. |
| WCAG | Web Content Accessibility Guidelines. |
| Provenance chip | Small label showing whether a value was confirmed, inferred, missing, conflicting or manual. |
| Guest shell | Reduced app frame for project guests: room switcher plus that room's tabs. |
| Guest-presence banner | Members' reminder that guests can see items marked with the eye icon. |
| Join button | Opens the meeting's Google Meet link outside Luna Space. |
