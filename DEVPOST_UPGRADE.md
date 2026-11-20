# ClinNote medicine-event upgrade notes

The Nov 15 upgrade adds a reproducible evaluation to the existing browser workbench. The Nov 20 wave (benchmark version 2.0.0) adds scoped negation, source-anchored claim verification and a claim-audit panel. The latest wave (benchmark version 3.0.0) expands the lexicon from 38 to 145 terms, adds ConText-style certainty, temporality and experiencer scope, and extends the claim auditor to routes, frequencies, unbacked medications and allergy conflicts. All cases are synthetic; the benchmark uses no external service.

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
| Tests | See README for the current count. Held-out set, provenance and offline checks were added on 2026-11-18; negation, claim-verification and audit-UI regressions on 2026-11-20; Wave 3 scope, route/frequency/allergy claim and lexicon regressions in the latest wave. |

## Evaluation

The corpus contains 10 term cases, 7 collision cases, 7 triage cases, 26 negation cases, 19 claim-check cases, 11 context-scope cases and 8 displayed-output readability rows. All ten failure probes run from production functions. The CLI and drawer use benchmark version 3.0.0.

| Task | Metric | Verified value |
| --- | --- | --- |
| Jargon token detection | Precision / Recall / F1 | 1.0000 / 0.9535 / 0.9762 |
| Jargon token detection | Brier | 0.0014 |
| Medication collision detection | F1 / exact-set accuracy | 1.0000 / 1.0000 |
| Red-flag triage | Accuracy / micro-F1 / Brier | 1.0000 / 1.0000 / 0.0000 |
| Negation flags on 26 authored cases | Precision / Recall / F1 / case accuracy | 1.0000 / 1.0000 / 1.0000 / 1.0000 |
| Claim verification on 19 planted-drift cases | Catch rate / flag accuracy / false-flag rate | 1.0000 / 1.0000 / 0.0000 |
| Context scope on 11 authored cases | Case accuracy / per-check accuracy | 1.0000 / 1.0000 |
| Readability formula on 8 displayed outputs | Mean output / mean source minus output | 13.73 / 0.10 |
| English preset outputs | Mean grade estimate / mean drop | 11.84 / 1.98 |
| Latency, one local run of 200 repeats | Mean per operation / full 24-operation suite | 0.0084 ms / 0.2026 ms |

The term task has 41 true positives, zero false positives and two false negatives across 10 cases. The two misses are `telemetry` and `WNL`, both outside the lexicon and left as honest misses. Each case uses the union of all 145 lexicon IDs, expected labels (including unsupported terms), explicit negative labels and predictions as its candidate universe. Every candidate is counted once for precision, recall, F1 and binary Brier. There are 1452 binary candidates in total, so Brier is 2 / 1452. Collision scoring compares complete sets of primary alert codes; an extra code is a false positive.

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

**Baseline comparison.** The baseline echoes the source note, flags no collision, and always answers `ROUTINE HOME CARE`. Its triage answer matches 3 of 7 labels, giving accuracy and micro-F1 of 0.4286. Term F1 and collision F1 are 0.0000. The measured gains are term F1 +0.9762, collision F1 +1.0000, triage accuracy +0.5714 and triage micro-F1 +0.5714. The baseline performs no benchmark workload; its nominal latency is 0 ms. The measured engine latency above comes from one local run and excludes rendering and clinical review. The benchmark makes zero network requests and has zero API or server cost.

## Wave 2 additions (2026-11-20, benchmark 2.0.0)

| Area | Current implementation |
| --- | --- |
| Negation scope | NegEx-style pass: single cues, multi-word phrases (`no history of`, `rules out`, `negative for`), postposed charting (`dyspnea denied`, `was ruled out`, `dyspnea: negative`), conjunction lists, and pseudo-negation guards (`not ruled out`, `cannot rule out`). Scope is capped at ten tokens and stops at sentence ends, colons, semicolons and termination words (`but`, `however`, `yet`). |
| Claim verification | Each extracted dose, lab value and date is verified against the source by proximity windows bounded at clause edges and neighboring subject anchors, so `Metformin 500 mg, Lisinopril 10 mg` cannot verify `Metformin 10 mg`. Verdicts: `exact-match`, `subject-value-match`, `dosage-mismatch`, `lab-value-mismatch`, `unit-mismatch`, `date-mismatch`, `unsupported`. |
| Claim-audit UI | Unsupported claims render as red flag badges in the audited text; a panel lists every claim with status, reason, source excerpt and offsets, with an All / Verified / Flagged filter and click-to-jump source spans. A paste-in field audits any user draft the same way. |
| Audit export | JSON and CSV download of every source span (offsets, negation) plus every claim verdict. |
| New corpora | 26 labeled negation cases (cues, boundaries, lists, pseudo-negations, affirmed controls) and 10 claim-check cases (clean doses, dose drift, lab drift, wrong drug, date drift, cross-drug borrowing, unit confusion, invented numbers, mixed sets). |
| New metrics | Negation P / R / F1 / case accuracy; claim catch rate, flag accuracy and false-flag rate. All render in the drawer and the CLI report. |

## Wave 3 additions (benchmark 3.0.0)

| Area | Current implementation |
| --- | --- |
| Lexicon | 145 bilingual entries (up from 38): clinical abbreviations and synonyms (`SOB`, `dyspnea`, `CP`, `HTN`, `DM`/`T2DM`, `CAD`, `CHF`, `AFib`, `CKD`, `NSAIDs`, `DVT`, `PE`, `TSH`, `INR`, `edema`, `cyanosis`, `hematuria`, `telemetry` remains out), route and frequency forms (`SL`, `ODT`, `topical`, `subcut`, `x5d`, `q3h`, `TID`, `QID`, `HS`, `AC`, `PC`), and variant spellings (`p.o.`, `b.i.d.`). Held-out recall went 0.5797 -> 1.0000 on the same frozen labels with precision still 1.0000. |
| Context scope | ConText-style pass on every span: certainty (`affirmed`/`negated`/`uncertain` for `possible`, `suspected`, `rule out`, `evaluate for`, `monitor for`), temporality (`current`/`historical` for `history of`, `h/o`, `prior`, `remote`, year references) and experiencer (`patient`/`family` for `family history of`, `mother had`, `father with`). Family scope crosses comma lists; imperative `rule out` reads as uncertain while completed `rules out`/`ruled out` stays negated. Scope ships on every span, glossary chip, audit row and CSV column. |
| Claim verification | Beyond numeric claims: canonical route classes (`PO`/`oral`/`by mouth`, `IV`, `IM`, `subcut`, `SL`, topical, transdermal, rectal, nasal, inhaled, enteral), canonical frequency classes (`daily`/`QD`, `BID`/`twice daily`/`q12h`, `TID`, `QID`, `q4h`-`q6h`, `PRN`, weekly, alternate day), a drug formulary with brand names and classes, and allergy extraction (`allergic to penicillin`, `NKDA`). New verdicts: `route_mismatch`, `frequency_mismatch`, `unbacked_medication`, `unbacked_allergy`, `allergy_conflict` (including cross-reactive classes such as penicillin versus amoxicillin). Context is enforced: family-history mentions never back a patient order, allergy lists never read as prescriptions, `do not take X` verifies against avoid wording, and `keep taking` reads as adherence, not avoid. |
| Claim corpus | 19 cases (up from 10): route drift, frequency drift, direct allergy conflict, cross-reactive allergy conflict, clean allergy restatement, unbacked medication, avoid-context consistency, NKDA conflict, family-history versus patient medication. |
| Context corpus | 11 authored cases covering family lists, relative experiencers, historical DVT/PE, possible/suspected diagnoses, rule-out language, negated family history, affirmed findings, conditional monitoring, sentence-boundary scope and combined historical + uncertain scope. |
| UI | Scope labels on glossary span chips and provenance hover titles, an uncertain-state span tint, a context-scope metric card and case rows in the evaluation drawer, typed claim reasons for every new flag, and CSV/JSON audit export carrying certainty, temporality and experiencer. |

## Failure conditions and limits

1. Negation is flagged but not clinically resolved; token detections require source-note review.
2. Terms outside the 145-entry lexicon remain unsupported and count as misses (`telemetry`, `WNL` are current misses).
3. Readability estimates do not measure comprehension, and the English formula is unvalidated for Spanish.
4. Only four OTC add-ons are screened.
5. Eight fixed clock slots are illustrative dose opportunities. Individual times, missed doses and renal adjustments are not modeled. Minimum intervals and clock coverage are checked.
6. Triage depends on selected checkboxes and the highest selected tier.
7. Custom Spanish output uses phrase substitution and requires interpreter confirmation.
8. Empty input yields zeroed metrics.
9. Negation cues reach a fixed ten-token window; a cue written farther from the term is missed.
10. The claim check covers extracted claims only: a narrative claim with no checkable dose, value, date, route, frequency or allergy surface, or one whose subject is misspelled, is not verified.

These scores measure agreement with authored synthetic labels, not clinical accuracy on patient records. The workbench does not replace physician, pharmacist or interpreter review.

## Reproduce

Run `npm test` for every check, `node scripts/run-evaluation.mjs --check` for regression thresholds and ten live probes, or `npm run eval:json` for the complete report. Syntax checks cover every `.js` and `.mjs` file. No commit or push is part of this verification.

## Held-out evaluation (added 2026-11-18, rescored in Wave 3)

Twelve new synthetic discharge notes with 69 labeled terms were written after the Wave 2 engine and lexicon were frozen, labels first. The labels stayed frozen; both engine versions were scored on them.

| System | Precision | Recall | F1 |
| --- | --- | --- | --- |
| ClinNote lexicon engine (Wave 3, 145 terms) | 1.0000 | 1.0000 | 1.0000 |
| ClinNote lexicon engine (Wave 2, 38 terms) | 1.0000 | 0.5797 | 0.7339 |
| Capitals rule baseline | 1.0000 | 0.5652 | 0.7222 |
| Echo baseline | 0.0000 | 0.0000 | 0.0000 |

Wave 2 found 40 of 69 terms with no false alarms; Wave 3 finds all 69, still with no false alarms. All 29 Wave 2 misses were lexicon gaps (26 absent terms, 3 spelling variants); the expanded lexicon covers every one, including `p.o.`, `b.i.d.` and `retractions`. The same author wrote the notes and the labels, and recall of 1.0000 means this set can no longer expose coverage gaps.

## Who benefits / harmed

Benefits: caregivers reading a shorthand-heavy note, Spanish-speaking households for the four curated presets, and nurses or pharmacists checking which phrases still need explaining, with the source span shown.

Harms: a reader who trusts the plain text over the clinician (real notes can still hold unexplained terms), negated, uncertain or family-history phrases that are still explained as text, a reader who treats the claim check as a guarantee even though it covers extractable claims only, custom Spanish output that is word substitution, and supplements outside the four-item add-on list that show no collision.
