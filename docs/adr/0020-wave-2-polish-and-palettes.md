# ADR 0020 — Wave 2: palettes, calendar and chat polish, Trophy wall

- **Status:** Accepted
- **Date:** 2026-11-19
- **Builds on:** ADR 0017 (effects) and ADR 0019 (Wave 1).

## Decisions

- **Accent palettes** (`src/styles/palettes.css`, `<html data-palette>`):
  - Mauve Nocturne stays the default. Midnight Teal and Solar Amber are the alternatives, each
    in dark, light and "match device" variants.
  - A palette changes only accents, glows, the aurora and gradients. Surfaces, text and semantic
    colours stay the same, so contrast is unchanged.
  - The choice is per device (`localStorage`, like the theme), so each person picks their own in
    Profile settings → Accent colour.
- **Calendar:**
  - Event chips are glass with a glowing left edge in the layer's colour.
  - The hour grid has a glowing "now" line with a dot.
  - Today's column and cell are tinted, today's date glows, and weekends are shaded (using
    `isoWeekday`, never `new Date()` on a date-only value).
- **Chat:**
  - "Ana is typing…" uses a Realtime broadcast that carries only the user id; nothing is stored.
    It is throttled to one message every 2.5 s and expires after 4 s.
  - Reactions pop when their count changes.
  - The first link in a message gets a link card built from the address alone. Nothing is
    fetched, so sharing a link never tells the site who looked.
- **Trophy wall** (`/trophies`, in the sidebar and the Ctrl K palette): glowing trophy cards for
  every opportunity marked won, and a "Shipped" list of submissions. The Won tile of the Home
  pipeline links here. It is the seed of the R3 portfolio (FR-PORT).
- **Empty states:** a row of moon phases waxing to a glowing, floating full moon.
