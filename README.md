# ClinNote

**Live workbench:** [https://aariv.me/clinnote/](https://aariv.me/clinnote/)

ClinNote turns hospital discharge shorthand into plain English or Spanish, links every explained term back to the exact characters it came from in the original note, lays the doses out on a 24-hour clock, checks four common over-the-counter add-ons for collisions, and prints a bilingual refrigerator schedule. It runs entirely in the browser tab: no server, no account, no network requests, no external fonts or scripts.

![ClinNote diagram](img/clinnote-hero.jpg)

## The problem

A discharge note is written for the next clinician, not for the family driving home. The four preset notes in this app score between Grade 11.5 and 16.2 on the Flesch-Kincaid formula and carry 12 to 15 shorthand terms each (`PO`, `BID`, `q12h`, `PRN`, `eGFR`, `SpO2`, `melena`). A missed `PRN` or an over-the-counter ibuprofen taken with a blood thinner is a real safety problem at home.

## What it does

- **Term-by-term explanation with provenance.** A 38-entry bilingual lexicon finds shorthand and medical terms. Every hit becomes a numbered highlight in the source note, and the glossary row for that term lists the exact character range of each occurrence (for example `PO 99 to 101`). Hovering or focusing a highlight lights up its glossary row and the other way round, so a reviewer can check every explanation against the original text in one glance.
- **Readability telemetry.** Source and output Flesch-Kincaid grades, signed score change, remaining lexicon terms and syllables per word, all measured on the exact paragraph shown.
- **Four preset discharge notes** (pediatric asthma, type 2 diabetes with CKD, knee replacement with a blood thinner, hypertension with thyroid replacement), each with curated English and Spanish text, labs and vitals.
- **24-hour dose clock and add-on check.** An SVG clock over eight fixed slots, an hour-by-hour ledger, and collision checks for ibuprofen, calcium with iron, diphenhydramine and grapefruit juice (`CRITICALCONTRAINDICATION`, `RENAL_TRIPLE_WHAMMY`, `ABSORPTION_CHELATION`, `SEDATION_STACK`).
- **Red-flag symptom checklist** with routine, same-day clinic or emergency department outcomes, always ending with "If in doubt, call 911" in English and Spanish.
- **Evaluation board on the page.** The held-out score, two baselines and the development-set metrics render on load, and a five-tab report covers metrics, baseline, failure conditions, per-case detail and guardrails.
- **Safety, limits and who is affected** panel on the page, matching the sections below.

## Evaluation

Every number here is recomputed by `npm run eval` from the production engine. Nothing is typed in by hand.

### Held-out test set

Twelve new synthetic discharge notes (69 labeled terms) were written on 2026-11-18, after the engine and its 38-term lexicon were frozen. The labels were written first, from one stated rule: *label every abbreviation, Latin dosing shorthand, lab or vital-sign marker, and medical term that is not everyday conversational English; drug names, units and numbers are not labeled.* The engine was run once and not changed afterwards. Scoring compares sets of normalized surface forms per note, so a term outside the lexicon counts as a miss.

| System on the held-out set | Precision | Recall | F1 | Found / missed / false alarms |
| --- | --- | --- | --- | --- |
| **ClinNote lexicon engine** | 1.0000 | 0.5797 | **0.7339** | 40 / 29 / 0 |
| Capitals rule baseline (any token with two capital letters, or `q<N>h`) | 1.0000 | 0.5652 | 0.7222 | 39 / 30 / 0 |
| Echo baseline (returns the note unchanged) | 0.0000 | 0.0000 | 0.0000 | 0 / 69 / 0 |

What this shows, plainly:

- ClinNote makes no false alarms on unseen notes, but it finds only 58% of the terms a reader would need explained.
- A crude capitals rule finds almost as many terms. ClinNote's F1 edge over it is only +0.0117. The real difference is that the capitals rule can only point at a term, while ClinNote also explains it in English or Spanish and shows where it came from.
- Of ClinNote's 29 misses, 26 are terms that are not in the lexicon at all (`SOB`, `INR`, `edema`, `subcut`, `cyanosis`, `x5d`) and 3 are spelling variants of terms it knows (`p.o.`, `b.i.d.`, a lone `retractions`). The lexicon is the bottleneck, not the matcher.

### Development set and baseline

The development corpus was written alongside the engine (10 term cases, 7 collision cases, 7 triage cases, 8 readability rows), so treat these as an upper bound. The baseline echoes the note, flags no collision and always answers `ROUTINE HOME CARE`.

| Task | ClinNote | Echo baseline | Gain |
| --- | --- | --- | --- |
| Term detection F1 (P 1.0000 / R 0.8974) | 0.9459 | 0.0000 | +0.9459 |
| Term detection Brier (lower is better) | 0.0104 | | |
| Collision detection F1 (exact primary-code sets) | 1.0000 | 0.0000 | +1.0000 |
| Triage accuracy and micro-F1 | 1.0000 | 0.4286 | +0.5714 |

| Task | Metric | Verified value |
| --- | --- | --- |
| Jargon token detection | Precision / Recall / F1 | 1.0000 / 0.8974 / 0.9459 |
| Jargon token detection | Brier | 0.0104 |
| Medication collision detection | F1 / exact-set accuracy | 1.0000 / 1.0000 |
| Red-flag triage | Accuracy / micro-F1 / Brier | 1.0000 / 1.0000 / 0.0000 |
| Readability formula on 8 displayed outputs | Mean output / mean source minus output | 13.73 / 0.10 |

Term scoring counts every candidate once across 384 binary candidates (all 38 lexicon IDs, expected labels including unsupported terms, explicit negatives and predictions), so Brier is 4 / 384. The four development misses are `hematuria` (twice), `SL` and `q3h`, all outside the lexicon.

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

Eight failure probes (negation, missing lexicon coverage, readability as a proxy, four-item add-on coverage, fixed clock hours, checkbox triage, limited Spanish substitution, empty input) run live on every evaluation and are listed in the on-page report. The whole benchmark makes zero network requests; latency is measured live and is a fraction of a millisecond per operation on a laptop.

## Who benefits / harmed

**Who benefits**

- Patients and family caregivers who go home with a note full of shorthand and need to know what each line asks them to do.
- Spanish-speaking households, for the four preset notes, which have curated Spanish text and a bilingual printable schedule.
- Nurses and pharmacists who want a quick term-by-term check of which phrases in a note still need explaining, with the exact source span shown.

**Who could be harmed, and how**

- A reader who trusts the plain-language text over the clinician. With held-out recall of 0.58, a real note will often contain terms ClinNote leaves unexplained, and the page cannot tell the reader what it missed.
- A reader of a note with negation. Negated terms (such as "No dyspnea") are now marked as negated in the source spans and audit trail, but the term is still explained; clinical meaning must be confirmed by a clinician.
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
npm test                 # 159 tests
npm run eval             # benchmark report, held-out set included
npm run eval:check       # regression floors and the eight failure probes
npm run eval:json        # full machine-readable report
python3 -m http.server   # then open http://localhost:8000/
```

| File | What it holds |
| --- | --- |
| `js/clinnote-engine.js` | Lexicon, readability, provenance spans, dose clock, collisions, triage |
| `js/evaluation.js` | Development corpus, held-out set, baselines, failure probes |
| `js/app.js` | Page controller (escaped rendering, provenance links, evaluation board) |
| `tests/` | 159 tests: engine, DOM smoke, evaluation, evaluation DOM, held-out and provenance, hygiene, claim verification |
| `video/` | Demo walkthrough steps and narration |

## License

MIT
