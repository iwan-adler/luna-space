# DESIGN.md: Hackathon Team Workspace Design System

**Product:** Hackathon Team Workspace (Round 1 UI & Design System)  
**Theme:** Pure Dark Theme (Designed dark, not inverted light)  
**Target Audience:** Hackathon teams (2–6 people), student builders, early developers  
**Aesthetic:** Clean, calm density (Linear-level restraint), warm, confident type, responsive and buttery-smooth motion

---

## 1. The One Font (Non-Negotiable)

- **Chosen Font Family:** **Bricolage Grotesque** (`@fontsource-variable/bricolage-grotesque`)
  - Single font family declared across the entire product via `--font-sans`.
  - Self-hosted variable font with optical sizing and width axes.
  - Zero second fonts: NO monospace font anywhere (code, timestamps, dates, and IDs all use Bricolage Grotesque with tabular figures).
  - All numbers use `font-variant-numeric: tabular-nums`.
- **Allowed Weights (Strictly 3):**
  - `400`: Regular body text and inputs
  - `500`: Labels, table headers, navigation, and button emphasis
  - `600`: Page titles, headings, and key numeric callouts
- **Scale (Ratio ~1.25):**
  - **Display:** 44px–52px | Line-height: 1.05 | Tracking: -0.025em | Weight: 600
  - **Title (H1):** 28px–32px | Line-height: 1.15 | Tracking: -0.02em | Weight: 600
  - **Section (H2):** 20px–22px | Line-height: 1.25 | Tracking: -0.015em | Weight: 600
  - **Subsection (H3):** 16px–17px | Line-height: 1.35 | Tracking: -0.01em | Weight: 500
  - **Body:** 15px–16px (16px in forms, 17px in chat) | Line-height: 1.55 | Weight: 400
  - **Small:** 14px | Line-height: 1.45 | Weight: 400 / 500
  - **Caption:** 12px | Line-height: 1.4 | Weight: 500 (tabular numerals)

---

## 2. Color Palette & Psychological Intent

### 2.1 Surfaces & Neutrals

We use an intentional 5-step dark surface hierarchy. Depth is created through surface lightness and a crisp 1px hairline border, never through muddy black drop-shadows.

| Token                    | Hex                       | Role                                                         | Contrast Ratio      |
| ------------------------ | ------------------------- | ------------------------------------------------------------ | ------------------- |
| `--color-bg`             | `#0C0D10`                 | Base canvas background (deep warm charcoal, never pure #000) | 16.5:1 against text |
| `--color-sidebar`        | `#101115`                 | Left sidebar and bottom navigation bar                       | Distinct anchor     |
| `--color-surface`        | `#15171D`                 | Standard cards, panels, list rows                            | Clear elevation     |
| `--color-surface-raised` | `#1D2028`                 | Dialogs, task drawers, floating menus, popovers              | Highest level       |
| `--color-surface-hover`  | `#232732`                 | Hover state for clickable rows and cards                     | Interactive hint    |
| `--color-border`         | `rgb(255 255 255 / 0.08)` | 1px border delineating cards and inputs                      | Structural clarity  |
| `--color-border-hover`   | `rgb(255 255 255 / 0.16)` | Hover border state on interactive elements                   | Subtle feedback     |
| `--color-hairline`       | `rgb(255 255 255 / 0.04)` | Subtle dividers between dense list items                     | Zero visual noise   |

### 2.2 Typography Colors

- **Primary Text (`--color-text`):** `#EDEEF2` (Off-white, calm and readable; avoids the harsh glare of `#FFFFFF`).
- **Muted Text (`--color-text-muted`):** `#9499A6` (Checked at ≥ 5.2:1 contrast against `#15171D`).
- **Dim / Placeholder Text (`--color-text-dim`):** `#636875` (Tertiary metadata and input placeholders).

### 2.3 The Single Primary Accent: Warm Amber Gold

**Psychology Rule:** _If an element is this color, you can touch it, press it, or act on it._

- `--color-primary`: `#F0A834` (Crisp warm amber gold, bright and tactile without being fluorescent).
- `--color-primary-hover`: `#FFB84D`
- `--color-primary-subtle`: `rgb(240 168 52 / 0.12)` (Selected tab backgrounds, active pill highlights).
- `--color-on-primary`: `#0C0D10` (High contrast bold text inside primary action buttons).

### 2.4 Secondary Accent (Non-Interactive Highlights)

- `--color-secondary-tint`: `rgb(240 168 52 / 0.06)` (Backgrounds for badges, milestone cards, empty states). Never used as a button.

### 2.5 Semantic Signals (Always Paired with Clear Labels & Icons)

- **Success (`--color-success`):** `#4ADE80` | Soft green | Background: `rgb(74 222 128 / 0.12)` (Submitted, Won)
- **Warning (`--color-warning`):** `#FBBF24` | Warm amber | Background: `rgb(251 191 36 / 0.12)` (Deadline < 48h)
- **Danger (`--color-danger`):** `#F87171` | Gentle red | Background: `rgb(248 113 113 / 0.12)` (Missed deadline, Destructive)
- **Info (`--color-info`):** `#60A5FA` | Cool blue | Background: `rgb(96 165 250 / 0.12)` (Meetings, Updates)

### 2.6 Strict Visual Boundaries (Zero Slop)

- **BANNED:** Neon glowing borders, purple-to-blue gradients, glassmorphism blur, background SVG grain, orbiting radial blobs, and emojis as icons or section titles.

---

## 3. Spacing, Radii, and Elevation

- **Spacing Scale:** 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px.
- **Corner Radii:**
  - `6px`: Small chips, badges, inline tags
  - `10px`: Inputs, buttons, segmented controls
  - `14px`: Cards, dialogs, drawers, main content panels
  - `9999px`: Avatars, status pills
- **Elevation:**
  - No blurred drop-shadows that get lost in dark mode. Depth is strictly `border 1px solid var(--color-border)` + subtle `box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45)`.

---

## 4. Motion Tokens & Physics

All animations are designed to make the app feel tactile and responsive (under 60fps frame budget, animating only `transform` and `opacity`).

- `--motion-fast`: `120ms` | Button & list item press down (`scale: 0.98`)
- `--motion-base`: `200ms` | Modal fade-in, drawer slide, tab switch
- `--motion-slow`: `320ms` | Route transition, step path advancement
- `--ease-out-quint`: `cubic-bezier(0.16, 1, 0.3, 1)` (Tactile spring feel)
- **Prefers-Reduced-Motion:** Retains state changes instantly with simple opacity fade; removes any transform scaling or particle celebrations.

---

## 5. Signature Element: The Hackathon Step Path (Live Stage Rail)

Every hackathon submission moves through a tangible 4-stage rail:
`[1. Planning] ─── [2. Building] ─── [3. Submitted] ─── [4. Judged]`

- The active stage pulses softly once on enter.
- Marking an item "Submitted" triggers a satisfying checkmark completion animation (under 250ms) and reveals a clean verified badge with the timestamp in tabular figures.

---

## 6. Copywriting & Voice

- **Style:** Plain, confident, direct. Short sentences.
- **Button Names:** Explicit verbs (`"Add hackathon"`, `"Copy share link"`, `"Mark as submitted"`, `"Schedule meeting"`).
- **Prohibited Buzzwords:** _Transform, empower, seamless, effortless, next-generation, dive in, robust, revolutionize, oops_.
