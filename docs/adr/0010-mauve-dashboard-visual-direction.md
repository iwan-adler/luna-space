# ADR 0010 — "Mauve" framed-dashboard visual direction

- **Status:** Accepted (supersedes the look in ADR 0007, "Aurora glass")
- **Date:** 2026-11-18

## Context

After using Aurora glass, the owner asked for a different look and shared a reference: a framed
dashboard in muted mauve and plum tones with near-black cards, soft pink glows and pill
controls. They wanted both a dark and a light version.

## Decision

- **Layout:** on large screens the whole app sits inside one rounded frame (`.app-frame`) on a
  deep plum canvas. A dark sidebar card on the left has a glowing mauve pill for the active page
  (`.nav-active`), and Settings and Workspace at the bottom. The top bar on the right has round
  bordered icon buttons (`.icon-btn`: notifications, settings) and an avatar with name and
  email. Phones keep the top bar and the floating bottom bar.
- **Cards:** near-black (white in light mode) with a hairline border. `.panel-glow` lights a card
  from below with a soft mauve glow, and `.panel-corner` adds a faint corner glow.
- **Controls:** primary buttons are mauve gradient pills with a soft glow (`.btn-primary`). Tab
  groups are separate outlined pills, with the selected one filled like the active nav item.
- **Type:** Inter only. Headlines are set heavier and tighter. The serif display face and the
  `@fontsource/instrument-serif` dependency are removed. The person's name and similar
  highlights use the soft pink `--color-highlight` ("Welcome, Asha").
- **Motion:** the animated aurora and starfield are removed; the canvas is a static glow.
- **Light mode:** the same structure on a pale mauve-grey canvas, a light frame gradient, white
  cards and sidebar, and deeper mauve accents for contrast.

## Consequences

- Tokens keep their names (`bg-surface`, `text-muted`, `text-primary`, …), so screens follow the
  new palette without changes. Only the shell, the home page and the tab groups were restructured.
- Fewer blur effects than Aurora glass, which is lighter on phones.
