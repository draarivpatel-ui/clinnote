# ClinNote Visual & Interaction Design System

## 1. Aesthetic Direction: Swiss Medical Editorial Dossier

ClinNote treats clinical discharge communication as a high-trust medical instrument and archival patient dossier rather than a consumer SaaS template. Hospital discharge instructions are often read under stress in bright clinic corridors or kitchen lighting, so the visual world is anchored in warm archival medical ivory (`#F7F5F0`), high-contrast slate ink (`#111820`), and structured clinical ledger panels (`#EFECE4`).

## 2. Color Palette & Contrast Tokens

| Token | Hex | Role & Contrast Ratio |
| --- | --- | --- |
| `--bg-ivory` | `#F7F5F0` | Primary archival paper canvas |
| `--surface-card` | `#EFECE4` | Instrument dossier container surface |
| `--surface-elevated` | `#FAF9F5` | Inner reading panel & telemetry cell surface |
| `--ink-primary` | `#111820` | Primary body & display ink (15.4:1 on `#F7F5F0`) |
| `--ink-secondary` | `#34404E` | Secondary clinical context & captions (9.2:1 on `#F7F5F0`) |
| `--safe-emerald` | `#0D7A5F` | Verified safe regimen & Grade 5 readability target |
| `--caution-amber` | `#C8640A` | Clinic call triage & pharmacokinetic caution band |
| `--critical-crimson` | `#C92A2A` | Emergency disposition & critical contraindication alert |

## 3. Typography & Numeric Discipline

- **Editorial Display (`Instrument Serif`):** Used for primary dossier headings and clinical disposition headlines with balanced wrapping (`text-wrap: balance`).
- **Clinical Body (`Plus Jakarta Sans`):** Constrained to a comfortable `65ch` to `75ch` reading measure for patient instructions in both English and Spanish.
- **Telemetry & Dosing Notation (`JetBrains Mono`):** Reserved strictly for prescription shorthand (`PO BID q12h`), 24-hour clock timestamps (`06:00` to `22:00`), lab reference ranges (`eGFR 52 mL/min/1.73m2`), and Flesch-Kincaid grade scores with `font-variant-numeric: tabular-nums`.

## 4. Anti-Slop & Craft-Floor Compliance

- Zero em-dashes or en-dashes across all source, documentation, and UI strings.
- Zero small all-caps kicker or eyebrow labels above headings; headings lead every section and card directly.
- Zero gradient text, zero emoji icons (all icons are custom inline SVGs with consistent `1.75px` stroke weight), and zero `border-left` > `1px` callouts (status differentiation uses full `1px` perimeter borders with `3px` top structural bars).
- All browser surfaces are themed: custom `::selection`, custom `::-webkit-scrollbar`, visible `:focus-visible` outlines, `@media (prefers-reduced-motion: reduce)`, and a dedicated `@media print` 1-page Bilingual Refrigerator Medication & Red-Flag Schedule.
