# ADR 0005 — "Soft night" visual direction (dark-first, minimal)

- **Status:** Accepted
- **Date:** 2026-11-18
- **Context:** The members asked for a more minimal, aesthetic interface and chose the
  "Soft night" direction over "Quiet neutral" and "Paper".

## Decision

- **Dark is the default theme.** Light ("Soft day") and "Match device" remain available in
  Profile settings; the choice is stored per device.
- **Palette** (source of truth: `src/styles/tokens.css`):

  | Token             | Dark                     | Light                                   |
  | ----------------- | ------------------------ | --------------------------------------- |
  | Background        | `#0B0D1A`                | `#F6F5F1`                               |
  | Surface / raised  | `#13162B` / `#1A1E38`    | `#FFFFFF`                               |
  | Text / muted      | `#E8E9F3` / `#9095B5`    | `#15172A` / `#62657C`                   |
  | Accent (only one) | moonlight gold `#E9C46A` | deep gold `#8A5F0C` (contrast on white) |

- **Atmosphere, not decoration:** a faint gold and indigo glow on the page background; panels
  are rounded (18 px) with a hairline border and a soft sheen instead of heavy shadows.
- **Shapes:** pill buttons, filters and tabs; 12 px inputs; floating pill bottom bar on phones;
  borderless sidebar on laptops.
- **Restraint:** gold is used for primary actions, the active nav icon and the logo only. Status
  colours (success, info, warning, danger) are softened and always paired with text or icons.
- **Typography:** Inter, semibold headings with slight negative tracking, small-caps-style
  "eyebrow" labels for context.

## Consequences

UI spec (05) §4 colour values are superseded by the tokens file; component, layout and
accessibility rules still apply. New screens should use `.panel`, `.eyebrow`, `Badge` tones and
`controlClass` rather than new colours.
