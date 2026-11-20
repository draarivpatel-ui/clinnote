# ClinNote

**Live workbench:** [https://aariv.me/clinnote/](https://aariv.me/clinnote/)

ClinNote turns hospital discharge shorthand into plain English or Spanish, links every explained term back to the exact characters it came from in the original note, marks negated, uncertain, historical and family-history findings, verifies every dose, lab value, date, route, frequency and allergy in the output against the source, lays the doses out on a 24-hour clock, checks four common over-the-counter add-ons for collisions, and prints a bilingual refrigerator schedule. It runs entirely in the browser tab: no server, no account, no network requests, no external fonts or scripts.

![ClinNote diagram](img/clinnote-hero.jpg)

## The problem

A discharge note is written for the next clinician, not for the family driving home. The four preset notes in this app score between Grade 11.5 and 16.2 on the Flesch-Kincaid formula and carry 12 to 15 shorthand terms each (`PO`, `BID`, `q12h`, `PRN`, `eGFR`, `SpO2`, `melena`). A missed `PRN` or an over-the-counter ibuprofen taken with a blood thinner is a real safety problem at home.

## What it does

- **Term-by-term explanation with provenance.** A 145-entry bilingual lexicon finds shorthand and medical terms. Every hit becomes a numbered highlight in the source note, and the glossary row for that term lists the exact character range of each occurrence (for example `PO 99 to 101`). Hovering or focusing a highlight lights up its glossary row and the other way round, so a reviewer can check every explanation against the original text in one glance.
- **Readability telemetry.** Source and output Flesch-Kincaid grades, signed score change, remaining lexicon terms and syllables per word, all measured on the exact paragraph shown.
- **Four preset discharge notes** (pediatric asthma, type 2 diabetes with CKD, knee replacement with a blood thinner, hypertension with thyroid replacement), each with curated English and Spanish text, labs and vitals.
- **Negation detection with real scope rules.** A NegEx-style pass over each found term handles single-word cues (`no`, `denies`, `without`), multi-word cues (`no history of`, `rules out`, `negative for`), postposed charting (`dyspnea denied`, `dyspnea was ruled out`, `dyspnea: negative`), bare comma lists (`denies melena, hemoptysis, dyspnea`), and pseudo-negations (`not ruled out`, `cannot rule out`). Scope stops at sentence ends, colons, semicolons and termination words like `but`, so `Answer: no. Dyspnea persists.` is not wrongly negated. Negated spans and glossary chips are marked in amber.
- **Context scope beyond negation.** A ConText-style pass classifies every found span on three axes: certainty (`affirmed`, `negated`, `uncertain` for `possible`, `suspected`, `rule out`, `evaluate for`), temporality (`current`, `historical` for `history of`, `h/o`, `prior`, `remote`, year references) and experiencer (`patient`, `family` for `family history of`, `mother had`, `father with`). Family-history scope crosses comma lists, so `family history of MI, diabetes, COPD` marks all three. Uncertain spans get a distinct tint; every scope label shows in the glossary chips, audit trail and CSV export.
- **Claim check against the source.** Every checkable claim in the output is verified against the source note. Numeric claims (drug doses, lab values, dates) are checked by proximity: a window stops at the neighboring subject, so `Lisinopril 10 mg` can never rescue `Metformin 10 mg` when the source reads `Metformin 500 mg`. Non-numeric claims are checked against canonical vocabularies: routes (`PO`/`oral`/`by mouth` collapse to one class, as do `IV`, `IM`, `subcut`, `SL`), frequencies (`daily`/`QD`, `BID`/`twice daily`/`q12h`, `PRN`), a drug formulary with brand names and classes, and allergy extraction (`allergic to penicillin`, `NKDA`). The checker flags route drift (`route_mismatch`), frequency drift (`frequency_mismatch`), unbacked drugs (`unbacked_medication`), unbacked allergy statements (`unbacked_allergy`) and allergy conflicts including cross-reactive classes such as penicillin versus amoxicillin (`allergy_conflict`). It also reads context: a family-history mention never backs a patient order, an allergy list never reads as a prescription, and `do not take ibuprofen` verifies against source contraindication wording rather than flagging it. Unsupported claims get a red flag badge in the text and a row in the claim panel with the reason, the source excerpt and the exact character range. The panel has an All / Verified / Flagged filter, every row and badge jumps to its source span, and you can paste your own draft summary to audit it instead of the app's output.
- **Audit trail export.** One JSON or CSV file listing every source span (with offsets and negation state) plus every extracted claim and its verdict.
- **24-hour dose clock and add-on check.** An SVG clock over eight fixed slots, an hour-by-hour ledger, and collision checks for ibuprofen, calcium with iron, diphenhydramine and grapefruit juice (`CRITICALCONTRAINDICATION`, `RENAL_TRIPLE_WHAMMY`, `ABSORPTION_CHELATION`, `SEDATION_STACK`).
- **Red-flag symptom checklist** with routine, same-day clinic or emergency department outcomes, always ending with "If in doubt, call 911" in English and Spanish.
- **Evaluation board on the page.** The held-out score, two baselines, the negation and claim-audit metrics and the development-set metrics render on load, and a five-tab report covers metrics, baseline, failure conditions, per-case detail and guardrails.
- **Safety, limits and who is affected** panel on the page, matching the sections below.

## Evaluation

Every number here is recomputed by `npm run eval` from the production engine. Nothing is typed in by hand.

### Held-out test set

Twelve new synthetic discharge notes (69 labeled terms) were written on 2026-11-18, after the Wave 2 engine and its 38-term lexicon were frozen. The labels were written first, from one stated rule: *label every abbreviation, Latin dosing shorthand, lab or vital-sign marker, and medical term that is not everyday conversational English; drug names, units and numbers are not labeled.* The labels stayed frozen while the lexicon grew to 145 terms in Wave 3; both engine versions were scored on the same frozen labels. Scoring compares sets of normalized surface forms per note, so a term outside the lexicon counts as a miss.

| System on the held-out set | Precision | Recall | F1 | Found / missed / false alarms |
| --- | --- | --- | --- | --- |
| **ClinNote lexicon engine (Wave 3, 145 terms)** | 1.0000 | 1.0000 | **1.0000** | 69 / 0 / 0 |
| ClinNote lexicon engine (Wave 2, 38 terms) | 1.0000 | 0.5797 | 0.7339 | 40 / 29 / 0 |
| Capitals rule baseline (any token with two capital letters, or `q<N>h`) | 1.0000 | 0.5652 | 0.7222 | 39 / 30 / 0 |
| Echo baseline (returns the note unchanged) | 0.0000 | 0.0000 | 0.0000 | 0 / 69 / 0 |

What this shows, plainly:

- Wave 2 found 40 of 69 terms (recall 0.5797): 26 misses were terms outside the lexicon (`SOB`, `INR`, `edema`, `subcut`, `cyanosis`, `x5d`) and 3 were spelling variants (`p.o.`, `b.i.d.`, a lone `retractions`). The Wave 3 lexicon now covers every one of them, including the variant spellings.
- Wave 3 finds all 69 terms with zero false alarms. Precision stays 1.0000, so the expansion added no noisy shortcuts.
- With recall at 1.0000 this particular set no longer stress-tests coverage gaps; a fresh held-out set would be needed to probe the next frontier honestly.
- The capitals rule can only point at a term, while ClinNote also explains it in English or Spanish and shows where it came from.

### Development set and baseline

The development corpus was written alongside the engine (10 term cases, 7 collision cases, 7 triage cases, 26 negation cases, 19 claim-check cases, 11 context-scope cases, 8 readability rows), so treat these as an upper bound. The baseline echoes the note, flags no collision and always answers `ROUTINE HOME CARE`.

| Task | ClinNote | Echo baseline | Gain |
| --- | --- | --- | --- |
| Term detection F1 (P 1.0000 / R 0.9535) | 0.9762 | 0.0000 | +0.9762 |
| Term detection Brier (lower is better) | 0.0014 | | |
| Collision detection F1 (exact primary-code sets) | 1.0000 | 0.0000 | +1.0000 |
| Triage accuracy and micro-F1 | 1.0000 | 0.4286 | +0.5714 |

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

Term scoring counts every candidate once across 1452 binary candidates (all 145 lexicon IDs, expected labels including unsupported terms, explicit negatives and predictions), so Brier is 2 / 1452. The two development misses are `telemetry` and `WNL`, both outside the lexicon and left as honest misses. The claim-check corpus covers route drift, frequency drift, direct and cross-reactive allergy conflicts, unbacked drugs, avoid-context wording, NKDA conflicts and family-history mentions that must not back a patient order; the context corpus covers family history, historical findings, uncertain workup language and scope boundaries.

Readability is measured on the exact paragraph shown. Mean source grade minus output grade over the four English presets is 1.98 (mean output 11.84). Spanish text gets an English-formula proxy (mean 15.62) that is not a valid Spanish reading grade.

| Scenario | Language | Source grade | Output grade | Lexicon terms before -> after |
| --- | --- | --- | --- | --- |
| `pediatric-asthma-er` | EN | 11.47 | 11.06 | 12 -> 2 |
| `pediatric-asthma-er` | ES | 11.47 | 15.72 | 12 -> 1 |
| `t2d-renal-titration` | EN | 13.30 | 13.17 | 14 -> 3 |
| `t2d-renal-titration` | ES | 13.30 | 15.41 | 14 -> 2 |
| `postop-anticoag-ortho` | EN | 16.23 | 11.49 | 15 -> 0 |
| `postop-anticoag-ortho` | ES | 16.23 | 14.62 | 15 -> 0 |
| `hypertensive-thyroid-sync` | EN | 14.29 | 11.64 | 12 -> 1 |
| `hypertensive-thyroid-sync` | ES | 14.29 | 16.71 | 12 -> 0 |

Ten failure probes (negation flagged but not clinically resolved, negation scope capped at a ten-token window, claim checks covering extracted claims only, missing lexicon coverage, readability as a proxy, four-item add-on coverage, fixed clock hours, checkbox triage, limited Spanish substitution, empty input) run live on every evaluation and are listed in the on-page report. The whole benchmark makes zero network requests; latency is measured live and is a fraction of a millisecond per operation on a laptop.

## Who benefits / harmed

**Who benefits**

- Patients and family caregivers who go home with a note full of shorthand and need to know what each line asks them to do.
- Spanish-speaking households, for the four preset notes, which have curated Spanish text and a bilingual printable schedule.
- Nurses and pharmacists who want a quick term-by-term check of which phrases in a note still need explaining, with the exact source span shown.

**Who could be harmed, and how**

- A reader who trusts the plain-language text over the clinician. Held-out recall reached 1.0000 on this 69-label set, but a real note can still contain terms ClinNote leaves unexplained, and the page cannot tell the reader what it missed.
- A reader of a note with negation, uncertainty or family history. Such terms are marked in the source spans, glossary chips and audit trail, but the term is still explained; clinical meaning must be confirmed by a clinician. Scope is rule-based: a cue like `possible` outside a clause, or unusual phrasing, can still be misread.
- A reader who trusts the claim check to catch every error. The checker verifies extracted claims (doses, lab values, dates, routes, frequencies, medication and allergy assertions) against the source; it cannot catch a claim it cannot extract, a misspelled subject, a narrative claim with no checkable surface, or an instruction that is dangerous but internally consistent.
- Spanish readers of pasted custom notes. Custom Spanish output is word substitution, not translation, and needs an interpreter. Printing is disabled for custom text for this reason.
- Anyone relying on the add-on check for an item not on its list of four. An unlisted supplement shows no collision, which is not the same as safe.

## Limitations

- All notes are synthetic and were written by one author, who also wrote every label. No real patient records were used, no clinician reviewed the labels, and no comprehension study was run.
- The held-out set is small (12 notes, 69 labels). Its numbers are a direction, not a precise estimate.
- Readability is the English Flesch-Kincaid formula. It measures sentence and word length, not understanding, and it is not valid for Spanish.
- The triage panel is a fixed checklist with set outcomes. It does not diagnose.
- The dose clock has eight fixed slots, so real prescribed times can be rounded to the nearest slot.
- ClinNote is an educational tool. It does not diagnose, prescribe, or replace a physician, pharmacist or interpreter.

## Privacy

Everything runs locally as plain ES modules. The Content-Security-Policy sets `connect-src 'none'`, so the page cannot send pasted text anywhere, and it loads no external fonts, scripts or styles. Pasted text is escaped before it is highlighted, so markup in a note shows as text.

## Run it and test it

Node 18 or newer, nothing to install.

```bash
npm test                 # 211 tests
npm run eval             # benchmark report, held-out set included
npm run eval:check       # regression floors and the ten failure probes
npm run eval:json        # full machine-readable report
python3 -m http.server   # then open http://localhost:8000/
```

| File | What it holds |
| --- | --- |
| `js/clinnote-engine.js` | Lexicon, readability, provenance spans, negation scope, claim verification, dose clock, collisions, triage, audit trail |
| `js/evaluation.js` | Development corpus, negation and claim corpora, held-out set, baselines, failure probes |
| `js/app.js` | Page controller (escaped rendering, provenance links, claim-check panel, draft audit, evaluation board) |
| `tests/` | 211 tests: engine, DOM smoke, evaluation, evaluation DOM, held-out and provenance, hygiene, claim verification, Wave 2 audit regressions, Wave 3 context/claim regressions |
| `video/` | Demo walkthrough steps and narration |

## License

MIT
