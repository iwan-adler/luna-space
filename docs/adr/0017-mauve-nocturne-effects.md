# ADR 0017 — "Mauve Nocturne": a visual effects layer

- **Status:** Accepted
- **Date:** 2026-11-19
- **Builds on:** ADR 0010 (Mauve tokens), which stays in force.

## Decision

Add one stylesheet, `src/styles/effects.css`, on top of the Mauve tokens, plus two small
components, without changing the colour tokens, the type scale or any component's API.

- **Backdrop:** three slowly drifting aurora blobs, a faint starfield and film grain behind every
  page (`Ambient`). On large screens the app frame and sidebar become frosted glass, so the
  aurora shows through.
- **Cards:** `.panel` gets a gradient hairline edge, a soft inner top light and a spotlight that
  follows the pointer (one passive, rAF-throttled listener; off on touch screens). Clickable
  cards lift on hover.
- **Text and buttons:** the person's name shimmers in a mauve-to-violet gradient, page titles
  carry a still version of it, and primary buttons get a light sweep on hover.
- **Navigation:** the active sidebar item has a glowing marker, and the logo glows.
- **Motion:** dashboard sections rise in one after another, and each module fades in when you
  open it. Entrances leave no filter or transform behind once they end.
- **Dashboard hero:** today's real moon phase, computed from the date and drawn as SVG in a
  turning orbit ring, with three live counts that count up (open tasks for you, unread
  messages, notifications). Quick actions are glowing pills; Shared/Me is a sliding toggle.

## Constraints kept

- **Reduced motion:** every animation and the hover lift stop under
  `prefers-reduced-motion: reduce`.
- **Decoration only:** decorative elements are `aria-hidden` and carry no information. The moon's
  phase is also written as text in the hero.
- **Themes:** light and dark both have their own aurora, edge, spotlight and gradient values.
- **No horizontal scroll at phone width:** the hero's moon moves into the corner, the stats sit
  in three compact columns, and the quick actions scroll sideways.
- **No new dependencies.** The grain is an inline SVG `data:` image, which the production CSP
  already allows (the security-headers E2E test passes).
