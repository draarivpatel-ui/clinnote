# ClinNote medicine-event upgrade notes

The Nov 15 upgrade adds a reproducible evaluation to the existing browser workbench. The Nov 20 wave (benchmark version 2.0.0) adds scoped negation, source-anchored claim verification and a claim-audit panel. All cases are synthetic; the benchmark uses no external service.

## Changes ready for the next review

| Area | Current implementation |
| --- | --- |
| Output measurement | The visible preset or custom paragraph supplies every readability metric and remaining lexicon count. No grade overrides, jargon-zero overrides or syllable caps. Percentage change is unavailable when the source grade is zero or negative. |
| Term scoring | Complete expected sets and one candidate universe for precision, recall, F1 and Brier. Unsupported `hematuria` is labeled in both relevant cases. |
| Alert scoring | Complete expected and predicted primary-code sets, with extra codes counted as false positives. |
| Baseline triage | The routine-only baseline is scored against all seven triage cases. |
| Medication intervals | An immediate-release 650 mg dose, clock coverage including midnight, and cyclic minimum-interval checks that can raise a critical alert. |
| Pediatric thresholds | Both language checkboxes use oxygen below 94% or rescue inhaler need before four hours. |
| Clock limitation | A deterministic probe inspects the actual clock and prescription slots. |
| Custom-note printing | Custom text disables the print action and replaces all printable scenario medication instructions with a bilingual safety notice. |
| Triage guardrail | Every disposition shows the live selected-symptom count and emergency-services advice when in doubt, in English and Spanish. |
| Asset and source hygiene | The JPEG was re-encoded without provenance metadata. Generic privacy checks decode character arrays, escapes, hex and base64 without embedding personal values. Image and compressed font metadata are scanned, and synthetic fixtures prove detection. |
| Tests | See README for the current count. Held-out set, provenance and offline checks were added on 2026-11-18; negation, claim-verification and audit-UI regressions on 2026-11-20. |

## Evaluation

The frozen corpus contains 10 term cases, 7 collision cases, 7 triage cases, 26 negation cases, 10 claim-check cases and 8 displayed-output readability rows. All ten failure probes run from production functions. The CLI and drawer use benchmark version 2.0.0.

| Task | Metric | Verified value |
| --- | --- | --- |
| Jargon token detection | Precision / Recall / F1 | 1.0000 / 0.8974 / 0.9459 |
| Jargon token detection | Brier | 0.0104 |
| Medication collision detection | F1 / exact-set accuracy | 1.0000 / 1.0000 |
| Red-flag triage | Accuracy / micro-F1 / Brier | 1.0000 / 1.0000 / 0.0000 |
| Readability formula on 8 displayed outputs | Mean output / mean source minus output | 13.73 / 0.10 |
| English preset outputs | Mean grade estimate / mean drop | 11.84 / 1.98 |
| Latency, one local run of 200 repeats | Mean per operation / full 24-operation suite | 0.0084 ms / 0.2026 ms |

The term task has 35 true positives, zero false positives and four false negatives across 10 cases. The missing term `hematuria` is labeled in both `case-postop-anticoag` and `case-out-of-lexicon`; `SL` and `q3h` account for the other two misses. Each case uses the union of all 38 lexicon IDs, expected labels (including unsupported terms), explicit negative labels and predictions as its candidate universe. Every candidate is counted once for precision, recall, F1 and binary Brier. There are 384 binary candidates in total, so Brier is 4 / 384. Collision scoring compares complete sets of primary alert codes; an extra code is a false positive.

Readability is measured on the exact paragraph shown in the app, including curated preset output. The standard English Flesch-Kincaid formula uses estimated syllables and actual word and sentence counts. Decimal doses do not create extra sentences. Scores, syllable density and remaining lexicon counts are not capped or overridden. The percentage is a signed formula-score change, with no promised minimum improvement. Remaining counts include explained parenthetical terms. The mean over all eight outputs is 13.73, with mean source minus output of 0.10. The four English outputs average 11.84 with a mean drop of 1.98. Spanish text produces an English-formula proxy averaging 15.62; it is not a validated Spanish reading grade or a comprehension measurement. Means and deltas are computed before display rounding.

| Scenario | Language | Source score | Output score | Lexicon occurrences before -> after |
| --- | --- | --- | --- | --- |
| `pediatric-asthma-er` | EN | 11.47 | 11.06 | 12 -> 2 |
| `pediatric-asthma-er` | ES | 11.47 | 15.72 | 12 -> 1 |
| `t2d-renal-titration` | EN | 13.30 | 13.17 | 14 -> 3 |
| `t2d-renal-titration` | ES | 13.30 | 15.41 | 14 -> 2 |
| `postop-anticoag-ortho` | EN | 16.23 | 11.49 | 15 -> 0 |
| `postop-anticoag-ortho` | ES | 16.23 | 14.62 | 15 -> 0 |
| `hypertensive-thyroid-sync` | EN | 14.29 | 11.64 | 12 -> 1 |
| `hypertensive-thyroid-sync` | ES | 14.29 | 16.71 | 12 -> 0 |

**Baseline comparison.** The baseline echoes the source note, flags no collision, and always answers `ROUTINE HOME CARE`. Its triage answer matches 3 of 7 labels, giving accuracy and micro-F1 of 0.4286. Term F1 and collision F1 are 0.0000. The measured gains are term F1 +0.9459, collision F1 +1.0000, triage accuracy +0.5714 and triage micro-F1 +0.5714. The baseline performs no benchmark workload; its nominal latency is 0 ms. The measured engine latency above comes from one local run and excludes rendering and clinical review. The benchmark makes zero network requests and has zero API or server cost.

## Wave 2 additions (2026-11-20, benchmark 2.0.0)

| Area | Current implementation |
| --- | --- |
| Negation scope | NegEx-style pass: single cues, multi-word phrases (`no history of`, `rules out`, `negative for`), postposed charting (`dyspnea denied`, `was ruled out`, `dyspnea: negative`), conjunction lists, and pseudo-negation guards (`not ruled out`, `cannot rule out`). Scope is capped at ten tokens and stops at sentence ends, colons, semicolons and termination words (`but`, `however`, `yet`). |
| Claim verification | Each extracted dose, lab value and date is verified against the source by proximity windows bounded at clause edges and neighboring subject anchors, so `Metformin 500 mg, Lisinopril 10 mg` cannot verify `Metformin 10 mg`. Verdicts: `exact-match`, `subject-value-match`, `dosage-mismatch`, `lab-value-mismatch`, `unit-mismatch`, `date-mismatch`, `unsupported`. |
| Claim-audit UI | Unsupported claims render as red flag badges in the audited text; a panel lists every claim with status, reason, source excerpt and offsets, with an All / Verified / Flagged filter and click-to-jump source spans. A paste-in field audits any user draft the same way. |
| Audit export | JSON and CSV download of every source span (offsets, negation) plus every claim verdict. |
| New corpora | 26 labeled negation cases (cues, boundaries, lists, pseudo-negations, affirmed controls) and 10 claim-check cases (clean doses, dose drift, lab drift, wrong drug, date drift, cross-drug borrowing, unit confusion, invented numbers, mixed sets). |
| New metrics | Negation P / R / F1 / case accuracy; claim catch rate, flag accuracy and false-flag rate. All render in the drawer and the CLI report. |

| Task | Metric | Verified value |
| --- | --- | --- |
| Negation flags (26 cases) | Precision / Recall / F1 / case accuracy | 1.0000 / 1.0000 / 1.0000 / 1.0000 |
| Claim verification (10 cases) | Catch rate / flag accuracy / false-flag rate | 1.0000 / 1.0000 / 0.0000 |

## Failure conditions and limits

1. Negation is flagged but not clinically resolved; token detections require source-note review.
2. Terms outside the 38-entry lexicon remain unsupported and count as misses.
3. Readability estimates do not measure comprehension, and the English formula is unvalidated for Spanish.
4. Only four OTC add-ons are screened.
5. Eight fixed clock slots are illustrative dose opportunities. Individual times, missed doses and renal adjustments are not modeled. Minimum intervals and clock coverage are checked.
6. Triage depends on selected checkboxes and the highest selected tier.
7. Custom Spanish output uses phrase substitution and requires interpreter confirmation.
8. Empty input yields zeroed metrics.
9. Negation cues reach a fixed ten-token window; a cue written farther from the term is missed.
10. The claim check covers extracted numeric claims only: a claim with no dose, value or date, or one whose subject is misspelled, is not verified.

These scores measure agreement with authored synthetic labels, not clinical accuracy on patient records. The workbench does not replace physician, pharmacist or interpreter review.

## Reproduce

Run `npm test` for every check, `node scripts/run-evaluation.mjs --check` for regression thresholds and ten live probes, or `npm run eval:json` for the complete report. Syntax checks cover every `.js` and `.mjs` file. No commit or push is part of this verification.

## Held-out evaluation (added 2026-11-18)

Twelve new synthetic discharge notes with 69 labeled terms were written after the engine and lexicon were frozen, labels first, and scored once.

| System | Precision | Recall | F1 |
| --- | --- | --- | --- |
| ClinNote lexicon engine | 1.0000 | 0.5797 | 0.7339 |
| Capitals rule baseline | 1.0000 | 0.5652 | 0.7222 |
| Echo baseline | 0.0000 | 0.0000 | 0.0000 |

ClinNote finds 40 of 69 terms with no false alarms; the capitals rule finds 39. Detection alone is close to a tie. Of the 29 misses, 26 are not in the 38-term lexicon and 3 are spelling variants (`p.o.`, `b.i.d.`, a lone `retractions`). The same author wrote the notes and the labels.

## Who benefits / harmed

Benefits: caregivers reading a shorthand-heavy note, Spanish-speaking households for the four curated presets, and nurses or pharmacists checking which phrases still need explaining, with the source span shown.

Harms: a reader who trusts the plain text over the clinician (held-out recall is 0.58, so unexplained terms are common), negated phrases that are still explained as present, a reader who treats the claim check as a guarantee even though it covers extracted numeric claims only, custom Spanish output that is word substitution, and supplements outside the four-item add-on list that show no collision.
