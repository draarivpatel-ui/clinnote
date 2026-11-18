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
| `--safe-emerald` | `#0D7A5F` | Screened regimen status and computed readability telemetry |
| `--caution-amber` | `#C8640A` | Clinic call triage & pharmacokinetic caution band |
| `--critical-crimson` | `#C92A2A` | Emergency disposition & critical contraindication alert |

## 3. Typography & Numeric Discipline

- **Editorial Display (`Instrument Serif`):** Used for primary dossier headings and clinical disposition headlines with balanced wrapping (`text-wrap: balance`).
- **Clinical Body (`Plus Jakarta Sans`):** Constrained to a comfortable `65ch` to `75ch` reading measure for patient instructions in both English and Spanish.
- **Telemetry & Dosing Notation (`JetBrains Mono`):** Reserved strictly for prescription shorthand (`PO BID q12h`), 24-hour clock timestamps (`00:00` to `22:00`), lab reference ranges (`eGFR 52 mL/min/1.73m2`), and Flesch-Kincaid grade scores with `font-variant-numeric: tabular-nums`.

## 4. Anti-Slop & Craft-Floor Compliance

- Zero em-dashes or en-dashes across all source, documentation, and UI strings.
- Zero small all-caps kicker or eyebrow labels above headings; headings lead every section and card directly.
- Zero gradient text, zero emoji icons (all icons are custom inline SVGs with consistent `1.75px` stroke weight), and zero `border-left` > `1px` callouts (status differentiation uses full `1px` perimeter borders with `3px` top structural bars).
- All browser surfaces are themed: custom `::selection`, custom `::-webkit-scrollbar`, visible `:focus-visible` outlines, `@media (prefers-reduced-motion: reduce)`, and a dedicated `@media print` 1-page Bilingual Refrigerator Medication & Red-Flag Schedule.

## 5. Evaluation Drawer (Nov 15 Enhancement)

- The **Evaluation** control in the header opens a `<section>` with a `role="tablist"` of five tabs: Metrics, Baseline, Failure conditions, Case detail, Guardrails.
- Tabs use roving `tabindex`, `aria-selected`, `aria-controls`, and `aria-labelledby` on each panel. ArrowLeft/ArrowRight/Home/End move focus and switch panels; a `keydown` listener on `document` enforces this without trapping focus in unrelated controls.
- The drawer is `hidden` until opened. `Run benchmark again` recomputes the report in place and preserves the selected tab.
- Metric cards reuse the dossier surface tokens (1px perimeter border, 3px emerald top bar, tabular numerals). At 1024 px the grid drops to two columns, at 640 px to one column with a vertical tablist and left structural bars, and at 400 px the value type and wrapping are tightened. `html, body { overflow-x: clip }` plus `overflow-wrap: anywhere` on drawer copy guarantee zero horizontal overflow at 375 px.
- No decorative numbers: every readout comes from `runEvaluation()` in `js/evaluation.js`, the same pure function used by the CLI and the unit tests.
- Failure cards use the caution amber top bar and switch to critical crimson only if a live probe returns an unexpected state. Guardrail copy uses body-size type at a 65ch to 75ch measure for clinical readability.
