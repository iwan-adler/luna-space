# ADR 0007 — "Aurora glass" visual direction with editorial type

- **Status:** Accepted (supersedes the palette and surfaces of ADR 0005, "Soft night")
- **Date:** 2026-11-18

## Context

After using the deployed app, the owner asked for a look that is "really aesthetic and cool". Three
directions were sketched (Aurora glass, Lunar editorial, Neon cosmos); the owner chose Aurora glass
mixed with Lunar editorial.

## Decision

- **Canvas:** a deep night background with a slowly drifting aurora (violet, teal and pink colour
  fields, blurred) and a faint twinkling starfield, both pure CSS pseudo-elements on `body`.
  They stop moving when the person prefers reduced motion. Light mode ("aurora day") uses a
  pastel aurora on lavender-white and no stars.
- **Surfaces:** frosted glass. `.panel` is a translucent gradient fill with `backdrop-filter`
  blur, a hairline border, a bright top edge and a soft shadow; `.glass` is the denser variant
  for dialogs, the task drawer, menus and the mobile bars. Surface tokens are translucent so the
  aurora shows through.
- **Accent:** aurora violet (`--color-primary`), with teal as a secondary accent. Primary buttons
  use the violet-to-pink `--gradient-primary` with a soft glow (`.btn-aurora`).
- **Editorial type:** headlines (`h1`, dialog titles, section titles) use Instrument Serif
  (self-hosted via `@fontsource/instrument-serif`, regular and italic), larger sizes, and
  `.text-aurora` gradient italics for hero moments. Body text stays Inter.
- **Moonlight details:** small-caps kickers (`.eyebrow`) and the `.hairline-moon` rule use the
  moonlight gold `--color-moon`, used sparingly.

## Consequences

- Everything stays within the CSP (`style-src 'self'`, fonts self-hosted); no new runtime
  dependencies beyond the font package.
- `backdrop-filter` costs some GPU time; blur radii are kept moderate (18–24px) and the aurora is a
  single animated layer, which stays smooth on mid-range Android phones.
- Component code uses the same tokens as before, so future screens inherit the look
  automatically.
