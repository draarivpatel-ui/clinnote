# ClinNote: Client-Side Clinical Discharge De-Jargonizer & Medication Safety Workbench

**Live Workbench:** [https://aariv.me/clinnote/](https://aariv.me/clinnote/)

ClinNote is a 100% client-side clinical NLP discharge translator, bilingual (`EN / ES`) readability telemetry analyzer, 24-hour medication collision simulator, red-flag symptom triage workbench, and deterministic Evaluation & Failure-Mode Benchmark suite.

![ClinNote Swiss Medical Editorial Hero Diagram](img/clinnote-hero.jpg)

## The Clinical Problem

Hospital and Emergency Department discharge summaries average a **Flesch-Kincaid Grade 11 to 14** reading level. Patients and caregivers returning home are handed dense paragraphs containing Latin dosing shorthand (`PO`, `BID`, `q12h`, `PRN`, `AC`), unexplained laboratory telemetry (`eGFR 52 mL/min/1.73m2`, `HbA1c 7.8%`, `SpO2 >= 94%`), and unflagged over-the-counter (OTC) medication hazards that lead to preventable hospital readmissions.

## Key Capabilities

### 1. Deterministic Clinical NLP De-Jargonizer & Readability Telemetry
- Translates **38 clinical abbreviations and medical terms** (`PO`, `BID`, `TID`, `QID`, `QD`, `QAM`, `QHS`, `q4h`, `q6h`, `q8h`, `q12h`, `PRN`, `NPO`, `AC`, `PC`, `MDI`, `titrate`, `contraindicated`, `dyspnea`, `intercostal retractions`, `orthostatic hypotension`, `nephrotoxicity`, `eGFR`, `HbA1c`, `SpO2`, `melena`, `hemoptysis`, `epistaxis`, `chelation`, `postprandial`, `hypoglycemia`, `hyperkalemia`, `bronchospasm`, `arthroplasty`, `anticoagulation`, `malabsorption`, `subcutaneous`, `syncope`) into explained patient instructions.
- Preset patient instructions, medication explanations and symptom labels are available in **English (`en`)** and **Espanol (`es`)**. Custom Spanish text uses phrase substitution and requires interpreter review.
- Real-time calculation of **Flesch-Kincaid Grade Level**, **Syllable-per-Word Density**, **Jargon Term Count**, and **Signed Readability Score Change (`%`)** on both preset clinical cases and custom pasted discharge text. The percentage is unavailable (`n/a`) when the source grade is zero or negative.

### 2. Four Realistic Clinical Discharge & Lab Telemetry Scenarios
1. **`pediatric-asthma-er` (`ER-PULM-01`):** Post-ER Acute Bronchospasm & Oral Corticosteroid Taper.
2. **`t2d-renal-titration` (`NEPH-ENDO-02`):** Type 2 Diabetes & CKD Stage 3a Lab Telemetry.
3. **`postop-anticoag-ortho` (`ORTHO-COAG-03`):** Post-Op Knee Arthroplasty & Anticoagulation.
4. **`hypertensive-thyroid-sync` (`CARD-ENDO-04`):** Hypertensive Urgency Follow-Up & Morning Absorption Separation.

### 3. 24-Hour Medication Schedule & OTC Pharmacokinetic Collision Matrix
- Generates an interactive 24-hour SVG dosing clock across 8 daily clinical checkpoints (`00:00`, `06:00`, `08:00`, `12:00`, `14:00`, `18:00`, `20:00`, `22:00`).
- Simulates adding common household OTC items (`Ibuprofen 400 mg NSAID`, `Calcium 600 mg + Iron Supplement`, `Diphenhydramine 25 mg Sedative`, `Grapefruit Juice`) and deterministically flags `CRITICALCONTRAINDICATION`, `RENAL_TRIPLE_WHAMMY`, `ABSORPTION_CHELATION`, and `SEDATION_STACK`.

### 4. Red-Flag Symptom Triage & Printable Bilingual Refrigerator Schedule
- Interactive post-discharge symptom checker computing deterministic dispositions (`ROUTINE HOME CARE`, `SAME-DAY CLINIC CALL`, `IMMEDIATE EMERGENCY DEPARTMENT`).
- The triage panel always shows the live selected-symptom count and advises calling emergency services (911) when in doubt, in English and Spanish.
- Dedicated `@media print` stylesheet producing a clean 1-page **Bilingual Refrigerator Medication & Red-Flag Schedule** for preset scenarios. Custom text disables the print action and replaces the printable summaries and medication rows with a bilingual safety notice.

### 5. Evaluation & Failure-Mode Benchmark (Nov 15 enhancement)

Open the **Evaluation** drawer in the header, or run `npm run eval`. Version 1.1.0 recomputes every result from the production engine and a frozen, hand-labeled synthetic corpus.

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

Eight live probes document negation, missing lexicon coverage, readability as a proxy, four-item OTC coverage, fixed clock hours, checkbox triage, limited Spanish substitution and empty input. The clock probe reads the actual slots and verifies coverage of each prescription time.

The post-op pain dose is explicitly immediate-release acetaminophen, two 325 mg tablets (650 mg total), only as needed and at least six hours apart. Clock opportunities are 00:00, 06:00, 12:00 and 18:00. Interval safety checks include the next day's first dose and flag unsafe intervals or missing clock times. Pediatric emergency checkboxes in both languages use oxygen below 94% or rescue inhaler need before four hours.

These results measure agreement with synthetic reference labels. They do not establish clinical accuracy or patient comprehension. A physician, pharmacist or interpreter must confirm patient-facing output.

## Local Verification & Automated Test Suite

ClinNote has zero external runtime dependencies. Run the full 132-test suite:

```bash
npm test                # node --test tests/*.test.js
npm run eval            # human-readable benchmark report
npm run eval:check      # regression thresholds and failure probes
npm run eval:json       # full machine-readable report
node scripts/run-evaluation.mjs --check
```

Files: `js/evaluation.js` (pure benchmark engine), `scripts/run-evaluation.mjs` (CLI), `tests/evaluation.test.js` (23 unit tests), `tests/evaluation-dom.test.js` (22 DOM/UI tests running the real `js/app.js` controller), `tests/clinnote.test.js` (60 engine tests), `tests/dom-smoke.test.js` (20 checks), `tests/hygiene.test.js` (7 synthetic scanner checks), and `tests/repository-hygiene.mjs` (generic source and binary metadata scanner with optional external denylist input).

## Privacy Architecture & Clinical Disclaimer

- **100% Client-Side Privacy Architecture (Zero PHI Cloud Transmission):** ClinNote runs its entire clinical NLP de-jargonizer, readability calculator, collision matrix, and benchmark suite locally inside the browser. A strict `Content-Security-Policy` (`connect-src 'none'`) enforces that zero patient health information (PHI) or custom discharge text ever leaves the device.
- **Clinical Disclaimer:** ClinNote is an educational clinical communication and medication literacy tool. It does not diagnose, prescribe, or replace professional medical advice, diagnosis, pharmacist consultation, or interpreter review. The Evaluation drawer documents the conditions under which the engine fails.
- **Responsive and accessible:** the layout uses `overflow-x: clip`, single-column grids at 375 px, visible `:focus-visible` outlines, ARIA tab semantics with arrow/Home/End keyboard navigation, `prefers-reduced-motion`, and tabular numerals on every numeric readout. No decorative or invented numbers appear in the interface.
