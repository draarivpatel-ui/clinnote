# ClinNote design system

## Direction

A calm clinical workstation. The page should read like an instrument a nurse or pharmacist would trust: cool paper background, white panels with hairline rules, one teal accent for "computed and safe", amber only for provenance links, and red only for risk. Nothing decorative competes with the note itself.

## Color tokens

| Token | Hex | Role |
| --- | --- | --- |
| `--bg` | `#EEF3F3` | Page background |
| `--surface` | `#FFFFFF` | Panels and cards |
| `--surface-sunk` | `#F6F9F9` | Inset readouts, source note, table headers |
| `--ink` | `#0F2A2E` | Body text and headings (15.1:1 on white) |
| `--ink-2` | `#3D5559` | Secondary text (8.0:1 on white) |
| `--ink-3` | `#5E7377` | Captions and footnotes (5.0:1 on white) |
| `--accent` | `#14786A` | Computed values, active states, provenance highlights |
| `--link` | `#8A5300` | A linked span and its glossary row |
| `--caution` | `#9A520A` | Clinic-call triage, moderate collisions, active add-ons |
| `--danger` | `#C2352B` | Emergency triage and critical collisions |

## Type

System fonts only, so the page renders the same offline and loads nothing from a CDN.

- Sans: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, system-ui, sans-serif`.
- Mono: `ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace`, for dosing shorthand, clock hours, lab values, character ranges and every metric, always with `font-variant-numeric: tabular-nums`.

## Provenance pattern

Each lexicon hit in the source note is a numbered `<mark>` with its term id and exact character range. The glossary row for that term shows the same numbers as chips with `start to end` ranges. Hover or keyboard focus on either side adds `is-linked` to both, switching them from teal to amber. All source text is escaped before marks are inserted.

## Rules

- Titles stand alone: no eyebrow above a heading and no tagline under it.
- No em or en dashes, no emoji, no uppercase transforms.
- Every interactive element has a visible `:focus-visible` outline; motion is disabled under `prefers-reduced-motion`.
- No horizontal page scroll at 390 px; wide tables scroll inside their own container or stack into cards.
