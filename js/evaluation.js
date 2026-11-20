/**
 * ClinNote Deterministic Evaluation & Failure-Mode Benchmark Suite.
 *
 * Pure ES module, runs in Node (tests/CLI) and in the browser (Evaluation drawer).
 * No network calls, no randomness, no wall-clock dependency in the scored results:
 * every number is recomputed from the frozen ground-truth fixtures below plus the
 * real production functions in js/clinnote-engine.js.
 *
 * Ground truth is a hand-labeled, synthetic (non-PHI) corpus. Each case declares
 * which jargon tokens a careful clinical reader marked as present, which medication
 * collision code the regimen must raise, and which triage disposition is correct.
 * These labels are authored data, not outputs of the engine, so agreement is a real
 * test rather than a tautology.
 *
 * IMPORTANT: this is a deterministic rules engine evaluated against its own authored
 * labels. It measures agreement with a fixed reference corpus, NOT clinical accuracy
 * on real patient notes. See FAILURE_CONDITIONS and DISCLAIMERS below.
 */

import {
  CLINICAL_LEXICON,
  OTC_ADDONS,
  CLINICAL_SCENARIOS,
  DOSING_CLOCK_HOURS,
  buildUiViewState,
  detectJargonMatches,
  locateJargonSpans,
  dejargonizeClinicalText,
  buildMedicationScheduleAndCollisions,
  evaluateSymptomTriage
} from './clinnote-engine.js';

export const EVAL_VERSION = '1.1.0';
export const EVAL_DATE = '2026-11-15';

/**
 * Frozen ground-truth cases. `expectedTerms` uses lexicon IDs. Every case is a
 * synthetic string, so no patient information is stored in this repository.
 */
export const GROUND_TRUTH_CASES = [
  {
    id: 'case-bronchospasm',
    label: 'Post-ER bronchospasm discharge sig',
    text: 'Administer Albuterol 90 mcg MDI 2 puffs q4h PRN wheezing. Monitor SpO2 >= 94%. Return for intercostal retractions or dyspnea.',
    expectedTerms: ['q4h', 'PRN', 'MDI', 'SpO2', 'intercostal-retractions', 'dyspnea'],
    unexpectedTerms: ['BID', 'q12h', 'eGFR']
  },
  {
    id: 'case-t2d-renal',
    label: 'Type 2 diabetes renal titration sig',
    text: 'Metformin ER 500 mg PO BID with meals. Lisinopril 10 mg PO QD. eGFR 52 mL/min/1.73m2. HbA1c 7.8%. Avoid NSAIDs due to nephrotoxicity. Watch for orthostatic hypotension.',
    expectedTerms: ['PO', 'BID', 'QD', 'eGFR', 'HbA1c', 'nephrotoxicity', 'orthostatic-hypotension'],
    unexpectedTerms: ['q4h', 'PRN', 'q12h']
  },
  {
    id: 'case-postop-anticoag',
    label: 'Post-op anticoagulation sig',
    text: 'Apixaban 2.5 mg PO BID q12h. Acetaminophen 650 mg PO q6h PRN pain. Oxycodone 5 mg PO q8h PRN severe pain. Return for melena or hematuria.',
    expectedTerms: ['PO', 'BID', 'q12h', 'q6h', 'PRN', 'q8h', 'melena'],
    unexpectedTerms: ['QD', 'QAM', 'eGFR'],
    outOfScopeExpected: ['hematuria']
  },
  {
    id: 'case-thyroid-fasting',
    label: 'Fasting thyroid replacement sig',
    text: 'Levothyroxine 75 mcg PO QAM 60m AC on empty stomach. Amlodipine 5 mg PO QD. Calcium 600 mg PO BID. Check TSH and tachycardia.',
    expectedTerms: ['PO', 'QAM', 'AC', 'QD', 'BID'],
    unexpectedTerms: ['q4h', 'PRN', 'HbA1c']
  },
  {
    id: 'case-plain-control',
    label: 'Plain-language control (no jargon expected)',
    text: 'Take one tablet by mouth every morning with breakfast. Drink water. Call the clinic if you feel worse.',
    expectedTerms: [],
    unexpectedTerms: ['PO', 'BID', 'PRN', 'q4h', 'QD', 'QAM', 'eGFR']
  },
  {
    id: 'case-empty-control',
    label: 'Empty input control',
    text: '   ',
    expectedTerms: [],
    unexpectedTerms: ['PO', 'BID']
  },
  {
    id: 'case-negation-trap',
    label: 'Negation phrase that the token matcher cannot resolve',
    text: 'No dyspnea observed. deny orthostatic hypotension. Discharge summary: PRN only.',
    expectedTerms: ['dyspnea', 'orthostatic-hypotension', 'PRN'],
    unexpectedTerms: ['BID', 'q12h']
  },
  {
    id: 'case-substring-trap',
    label: 'Abbreviation-like substrings inside ordinary words',
    text: 'The patient walked BIDirectionally toward the QDocks at QAMtime.',
    expectedTerms: [],
    unexpectedTerms: ['BID', 'QD', 'QAM', 'PO']
  },
  {
    id: 'case-lower-case-variant',
    label: 'Lowercase clinical abbreviation variants',
    text: 'Take 1 tab po bid with meals. Monitor egfr and hba1c.',
    expectedTerms: ['PO', 'BID', 'eGFR', 'HbA1c'],
    unexpectedTerms: ['q4h', 'PRN', 'QAM'],
    outOfScopeExpected: []
  },
  {
    id: 'case-out-of-lexicon',
    label: 'Dosing sig with clinically expected terms outside the 38-term lexicon',
    text: 'Give 1 tablet SL q3h PRN. Keep NPO after midnight. Watch for hematuria and epistaxis.',
    // A clinical reader would also mark SL (sublingual), q3h (every 3 hours) and
    // hematuria. None of those three are in the frozen lexicon, so the engine cannot
    // report them. They are counted as recall misses rather than silently dropped,
    // which keeps the headline F1 honest and below 1.0.
    expectedTerms: ['PRN', 'NPO', 'epistaxis'],
    unexpectedTerms: ['BID', 'q12h'],
    outOfScopeExpected: ['SL', 'q3h', 'hematuria']
  }
];

/** Labeled medication-collision cases: scenario + OTC add-ons + complete expected alert code set. */
export const GROUND_TRUTH_COLLISIONS = [
  {
    id: 'col-apixaban-nsaid',
    label: 'Apixaban with OTC ibuprofen',
    scenarioId: 'postop-anticoag-ortho',
    otcIds: ['otc-ibuprofen'],
    expectedCodes: ['CRITICALCONTRAINDICATION']
  },
  {
    id: 'col-renal-triple',
    label: 'CKD regimen with OTC ibuprofen',
    scenarioId: 't2d-renal-titration',
    otcIds: ['otc-ibuprofen'],
    expectedCodes: ['RENAL_TRIPLE_WHAMMY']
  },
  {
    id: 'col-levothyroxine-chel',
    label: 'Levothyroxine with calcium and iron',
    scenarioId: 'hypertensive-thyroid-sync',
    otcIds: ['otc-calcium-iron'],
    expectedCodes: ['ABSORPTION_CHELATION']
  },
  {
    id: 'col-opioid-sedation',
    label: 'Oxycodone with diphenhydramine',
    scenarioId: 'postop-anticoag-ortho',
    otcIds: ['otc-diphenhydramine'],
    expectedCodes: ['SEDATION_STACK']
  },
  {
    id: 'col-steroid-nsaid',
    label: 'Prednisone with OTC ibuprofen',
    scenarioId: 'pediatric-asthma-er',
    otcIds: ['otc-ibuprofen'],
    expectedCodes: ['CRITICALCONTRAINDICATION']
  },
  {
    id: 'col-grapefruit',
    label: 'Grapefruit juice with CYP3A4 substrates',
    scenarioId: 'postop-anticoag-ortho',
    otcIds: ['otc-grapefruit'],
    expectedCodes: ['CRITICALCONTRAINDICATION']
  },
  {
    id: 'col-safe-baseline',
    label: 'Prescription-only regimen (no add-ons)',
    scenarioId: 'pediatric-asthma-er',
    otcIds: [],
    expectedCodes: []
  }
];

/** Labeled triage cases: scenario + selected symptom IDs + expected disposition. */
export const GROUND_TRUTH_TRIAGE = [
  {
    id: 'triage-emergency-retractions',
    label: 'Intercostal retractions after ER discharge',
    scenarioId: 'pediatric-asthma-er',
    symptomIds: ['sym-retractions'],
    expectedDisposition: 'IMMEDIATE EMERGENCY DEPARTMENT'
  },
  {
    id: 'triage-emergency-spo2',
    label: 'Home oximeter below 94 percent or rescue inhaler before 4 hours',
    scenarioId: 'pediatric-asthma-er',
    symptomIds: ['sym-spo2-drop'],
    expectedDisposition: 'IMMEDIATE EMERGENCY DEPARTMENT'
  },
  {
    id: 'triage-clinic-night-cough',
    label: 'Night cough despite scheduled therapy',
    scenarioId: 'pediatric-asthma-er',
    symptomIds: ['sym-night-cough'],
    expectedDisposition: 'SAME-DAY CLINIC CALL'
  },
  {
    id: 'triage-routine-jitter',
    label: 'Expected mild albuterol tremor',
    scenarioId: 'pediatric-asthma-er',
    symptomIds: ['sym-mild-jitter'],
    expectedDisposition: 'ROUTINE HOME CARE'
  },
  {
    id: 'triage-none',
    label: 'No warning symptoms selected',
    scenarioId: 'pediatric-asthma-er',
    symptomIds: [],
    expectedDisposition: 'ROUTINE HOME CARE'
  },
  {
    id: 'triage-mixed-emergency-wins',
    label: 'Routine plus emergency symptom (max tier must win)',
    scenarioId: 'pediatric-asthma-er',
    symptomIds: ['sym-mild-jitter', 'sym-retractions'],
    expectedDisposition: 'IMMEDIATE EMERGENCY DEPARTMENT'
  },
  {
    id: 'triage-unknown-id-ignored',
    label: 'Unknown symptom ID must not escalate',
    scenarioId: 'pediatric-asthma-er',
    symptomIds: ['sym-does-not-exist'],
    expectedDisposition: 'ROUTINE HOME CARE'
  }
];

/**
 * Documented, testable failure conditions. Each has a deterministic probe that the
 * suite actually runs, so the UI shows whether the guard currently holds or fails.
 */
export const FAILURE_CONDITIONS = [
  {
    id: 'fail-negation',
    title: 'Negation is not resolved',
    detail: 'The token matcher flags terms inside negated phrases such as "No dyspnea observed". It reports the token as present rather than judging clinical meaning.',
    mitigation: 'Detections are now marked as negated in source spans and the audit trail, but the UI still labels them as terms detected, never as diagnoses. A clinician must read the source note.',
    probe: () => {
      const r = detectJargonMatches('No dyspnea observed.', 'en');
      return { triggered: r.some((m) => m.id === 'dyspnea'), observed: r.map((m) => m.id) };
    },
    expectedTriggered: true
  },
  {
    id: 'fail-unlisted-term',
    title: 'Unlisted abbreviations are missed',
    detail: 'Only the 38 lexicon entries are recognized. Any abbreviation outside the lexicon passes through untouched.',
    mitigation: 'The glossary shows exactly which terms were detected. Unlisted terms remain visible in the source note.',
    probe: () => {
      const r = detectJargonMatches('Give 1 tab SL q3h while NPO.', 'en');
      return { triggered: !r.some((m) => m.id === 'SL'), observed: r.map((m) => m.id) };
    },
    expectedTriggered: true
  },
  {
    id: 'fail-readability-proxy',
    title: 'Grade score is a proxy, not a comprehension measure',
    detail: 'The Flesch-Kincaid grade is computed from syllable and sentence counts. It cannot tell whether a patient actually understood the instruction.',
    mitigation: 'The workbench never claims measured comprehension. The clarity gain is a readability delta on synthetic text.',
    probe: () => {
      const r = dejargonizeClinicalText('Take one tablet by mouth twice a day with food.', 'en');
      return { triggered: Number.isFinite(r.gradeAfter), observed: [r.gradeAfter] };
    },
    expectedTriggered: true
  },
  {
    id: 'fail-otc-coverage',
    title: 'Only four OTC add-ons are screened',
    detail: 'The simulator covers four cabinet items. Real regimens involve many more agents, doses, and timings.',
    mitigation: 'The UI lists exactly which add-ons were simulated and states that a pharmacist must review the full regimen.',
    probe: () => ({ triggered: OTC_ADDONS.length === 4, observed: [OTC_ADDONS.length] }),
    expectedTriggered: true
  },
  {
    id: 'fail-fixed-schedule',
    title: 'Schedule uses fixed clock hours',
    detail: 'Eight fixed clock hours (00:00 to 22:00) model a day. Individual prescription times, missed doses, and renal dose adjustments are not modeled.',
    mitigation: 'The printed sheet is a planning aid, not an administration record. As-needed times are dose opportunities, and every listed interval is checked across midnight.',
    probe: () => {
      const reports = CLINICAL_SCENARIOS.flatMap((scenario) => [
        buildMedicationScheduleAndCollisions(scenario.id, [], 'en'),
        buildMedicationScheduleAndCollisions(scenario.id, OTC_ADDONS.map((otc) => otc.id), 'en')
      ]);
      const fixedClock = ['00:00', '06:00', '08:00', '12:00', '14:00', '18:00', '20:00', '22:00'];
      const sameClock = reports.every((r) => JSON.stringify(r.slots.map((slot) => slot.hour)) === JSON.stringify(fixedClock));
      const covered = CLINICAL_SCENARIOS.every((scenario, i) => scenario.medications.every((med) =>
        med.hours.every((hour) => reports[i * 2].slots.some((slot) => slot.hour === hour && slot.items.some((item) => item.id === med.id)))
      ));
      return {
        triggered: JSON.stringify(DOSING_CLOCK_HOURS) === JSON.stringify(fixedClock) && sameClock && covered,
        observed: [reports.length, ...reports.map((r) => r.slots.map((slot) => slot.hour))]
      };
    },
    expectedTriggered: true
  },
  {
    id: 'fail-triage-checkbox',
    title: 'Triage depends on user-selected checkboxes',
    detail: 'Disposition is computed only from symptoms the user toggles. A missed or mis-selected box changes the output.',
    mitigation: 'The triage panel always shows the selected symptom count and tells the user to call emergency services when in doubt.',
    probe: () => {
      const r = evaluateSymptomTriage('pediatric-asthma-er', [], 'en');
      return { triggered: r.disposition === 'ROUTINE HOME CARE', observed: [r.disposition] };
    },
    expectedTriggered: true
  },
  {
    id: 'fail-language-coverage',
    title: 'Spanish output is lexicon substitution, not translation',
    detail: 'The Spanish pass substitutes curated phrases and a small set of contextual phrase rules. It does not parse grammar.',
    mitigation: 'The UI states that a clinician or interpreter must confirm patient-facing Spanish text.',
    probe: () => {
      const r = dejargonizeClinicalText('Take 1 tablet PO BID with meals.', 'es');
      return { triggered: r.lang === 'es' && r.translatedText.includes('por la boca'), observed: [r.lang] };
    },
    expectedTriggered: true
  },
  {
    id: 'fail-empty-input',
    title: 'Empty input returns a safe zeroed result',
    detail: 'Whitespace-only or non-string input returns zeroed metrics instead of a fabricated grade.',
    mitigation: 'The UI shows an empty state and does not render invented numbers.',
    probe: () => {
      const r = dejargonizeClinicalText('   ', 'en');
      return { triggered: r.gradeAfter === 0 && r.jargonCountBefore === 0, observed: [r.gradeAfter] };
    },
    expectedTriggered: true
  }
];

export const DISCLAIMERS = [
  'These scores measure agreement with a frozen, hand-labeled synthetic reference corpus, not clinical accuracy on real patient discharge notes.',
  'The engine is a deterministic rules and lexicon system. It is not a diagnostic device and must not replace a physician, pharmacist, or interpreter.',
  'Latency is measured locally in the current JavaScript runtime. It excludes network, rendering, and any clinical review time.',
  'The baseline is deliberately naive (raw text, no lexicon, no collision rules, fixed triage). It is a floor, not a published clinical comparator.'
];

/** Score the routine-only baseline against the same authored triage cases. */
const baselineTriage = scoreLabels(GROUND_TRUTH_TRIAGE.map((c) => ({
  expected: c.expectedDisposition,
  predicted: 'ROUTINE HOME CARE'
})));

/** Baseline: what a naive system would produce with no rules at all. */
export const BASELINE = {
  id: 'naive-raw-text',
  label: 'Naive baseline: raw text, no lexicon, no rules',
  termDetectionF1: 0,
  collisionF1: 0,
  triageAccuracy: Number(baselineTriage.accuracy.toFixed(4)),
  triageF1: Number(baselineTriage.f1.toFixed(4)),
  triageCounts: { tp: baselineTriage.tp, fp: baselineTriage.fp, fn: baselineTriage.fn, n: baselineTriage.n },
  meanGradeAfter: 'n/a (no simplification)',
  latencyMs: 0,
  note: 'A system that echoes the source note unchanged, never flags a collision, and always answers ROUTINE HOME CARE.'
};

function safeDivide(num, den) {
  return den === 0 ? 0 : num / den;
}

/** Precision, recall and F1 for a set of predicted vs expected labels. */
export function scoreSet(predicted, expected) {
  const p = new Set(Array.isArray(predicted) ? predicted : []);
  const e = new Set(Array.isArray(expected) ? expected : []);
  let tp = 0;
  for (const id of p) if (e.has(id)) tp += 1;
  const fp = p.size - tp;
  const fn = e.size - tp;
  const precision = safeDivide(tp, tp + fp);
  const recall = safeDivide(tp, tp + fn);
  const f1 = safeDivide(2 * precision * recall, precision + recall);
  return { tp, fp, fn, precision, recall, f1 };
}

/** Micro-averaged classification metrics over single-label cases. */
export function scoreLabels(cases) {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  const perCase = [];
  for (const c of cases) {
    const predicted = c.predicted;
    const expected = c.expected;
    const correct = predicted === expected;
    if (expected === null) {
      if (correct) tn += 1;
      else fp += 1;
    } else if (correct) {
      tp += 1;
    } else {
      fn += 1;
      if (predicted !== null) fp += 1;
    }
    // Preserve any task-specific fields (urgencyScore, allCodes, collisionCount, ...)
    // so the UI case-detail table and the tests can inspect them.
    perCase.push({ ...c, expected, predicted, correct });
  }
  const precision = safeDivide(tp, tp + fp);
  const recall = safeDivide(tp, tp + fn);
  const f1 = safeDivide(2 * precision * recall, precision + recall);
  const accuracy = safeDivide(tp + tn, cases.length);
  return { tp, fp, fn, tn, n: cases.length, precision, recall, f1, accuracy, perCase };
}

/** Brier score for binary decisions (mean squared error of a 0/1 confidence). */
export function brierScore(entries) {
  if (!entries.length) return 0;
  const sum = entries.reduce((acc, x) => acc + (x.confidence - x.outcome) ** 2, 0);
  return sum / entries.length;
}

/** One candidate universe drives set metrics and binary Brier decisions. */
export function scoreTermCase(c, predicted) {
  const expected = [...new Set([...(c.expectedTerms || []), ...(c.outOfScopeExpected || [])])];
  const predictions = [...new Set(predicted)];
  const candidates = [...new Set([
    ...CLINICAL_LEXICON.map((entry) => entry.id),
    ...expected, ...(c.unexpectedTerms || []), ...predictions
  ])];
  const expectedSet = new Set(expected);
  const predictedSet = new Set(predictions);
  const scored = scoreSet(predictions, expected);
  const brierEntries = candidates.map((id) => ({
    confidence: predictedSet.has(id) ? 1 : 0,
    outcome: expectedSet.has(id) ? 1 : 0
  }));
  return {
    id: c.id, label: c.label, expected, predicted: predictions,
    outOfScopeExpected: [...new Set(c.outOfScopeExpected || [])],
    correct: scored.fp === 0 && scored.fn === 0,
    ...scored,
    falseAlarms: predictions.filter((id) => !expectedSet.has(id)),
    candidates, brierEntries, brier: brierScore(brierEntries)
  };
}

/** Deterministic term-detection task with complete expected sets and consistent misses. */
export function evaluateTermDetection() {
  const perCase = GROUND_TRUTH_CASES.map((c) =>
    scoreTermCase(c, detectJargonMatches(c.text, 'en').map((m) => m.id))
  );
  const tp = perCase.reduce((sum, c) => sum + c.tp, 0);
  const fp = perCase.reduce((sum, c) => sum + c.fp, 0);
  const fn = perCase.reduce((sum, c) => sum + c.fn, 0);
  const precision = safeDivide(tp, tp + fp);
  const recall = safeDivide(tp, tp + fn);
  const f1 = safeDivide(2 * precision * recall, precision + recall);
  const brierEntries = perCase.flatMap((c) => c.brierEntries);
  return {
    task: 'Clinical jargon token detection',
    n: GROUND_TRUTH_CASES.length,
    tp, fp, fn, precision, recall, f1,
    exactCaseMatch: perCase.filter((c) => c.correct).length,
    brier: brierScore(brierEntries), candidateCount: brierEntries.length,
    perCase
  };
}

/** Score complete alert sets. An extra code is always a false positive. */
export function evaluateCollisions(corpus = GROUND_TRUTH_COLLISIONS, buildReport = buildMedicationScheduleAndCollisions) {
  const perCase = corpus.map((c) => {
    const report = buildReport(c.scenarioId, c.otcIds, 'en');
    const predicted = [...new Set(report.collisions.map((alert) => alert.code))];
    const expected = [...new Set(c.expectedCodes)];
    const scored = scoreSet(predicted, expected);
    return {
      id: c.id, label: c.label, expected, predicted,
      ...scored, correct: scored.fp === 0 && scored.fn === 0,
      allCodes: predicted, collisionCount: report.collisionCount,
      overallSafetyBand: report.overallSafetyBand
    };
  });
  const tp = perCase.reduce((sum, c) => sum + c.tp, 0);
  const fp = perCase.reduce((sum, c) => sum + c.fp, 0);
  const fn = perCase.reduce((sum, c) => sum + c.fn, 0);
  const precision = safeDivide(tp, tp + fp);
  const recall = safeDivide(tp, tp + fn);
  const f1 = safeDivide(2 * precision * recall, precision + recall);
  return {
    task: 'Medication collision detection', n: perCase.length,
    tp, fp, fn, precision, recall, f1,
    accuracy: safeDivide(perCase.filter((c) => c.correct).length, perCase.length),
    perCase
  };
}

/** Deterministic triage-disposition task. */
export function evaluateTriage() {
  const cases = GROUND_TRUTH_TRIAGE.map((c) => {
    const report = evaluateSymptomTriage(c.scenarioId, c.symptomIds, 'en');
    return {
      id: c.id, label: c.label,
      expected: c.expectedDisposition,
      predicted: report.disposition,
      urgencyScore: report.urgencyScore,
      activeSymptomCount: report.activeSymptomCount
    };
  });
  const scored = scoreLabels(cases);
  // Brier score for the binary event "the predicted disposition is correct".
  // Confidence is 1 for the engine's own prediction; the outcome is 1 when it matches
  // the authored label, 0 otherwise. A perfect run therefore scores 0.
  const brierEntries = scored.perCase.map((c) => ({
    confidence: 1,
    outcome: c.correct ? 1 : 0
  }));
  return { task: 'Red-flag symptom triage', ...scored, brier: brierScore(brierEntries) };
}

/** Readability task on the four real preset scenario notes, EN and ES. */
export function evaluateReadability() {
  const rows = [];
  for (const scenario of CLINICAL_SCENARIOS) {
    for (const lang of ['en', 'es']) {
      const view = buildUiViewState({ scenarioId: scenario.id, lang, customText: '', activeOtcIds: [], selectedSymptomIds: [] });
      const r = view.nlpAnalysis;
      rows.push({
        scenarioId: scenario.id, lang,
        gradeBefore: r.gradeBefore, gradeAfter: r.gradeAfter,
        gradeDrop: r.gradeBefore - r.gradeAfter,
        sourceText: view.rawClinicalNote, renderedText: view.plainPatientParagraph,
        beforeMetrics: r.beforeMetrics, afterMetrics: r.afterMetrics,
        jargonBefore: r.jargonCountBefore, jargonAfter: r.jargonCountAfter,
        clarityGainPct: r.clarityGainPct
      });
    }
  }
  const meanGradeAfter = rows.reduce((a, r) => a + r.gradeAfter, 0) / rows.length;
  const meanGradeDrop = rows.reduce((a, r) => a + r.gradeDrop, 0) / rows.length;
  return {
    task: 'Readability formula on the displayed preset outputs',
    method: 'Uncapped English Flesch-Kincaid formula with estimated syllables. Spanish scores use the same formula and are not validated Spanish reading grades. Remaining counts include explained parenthetical lexicon tokens.',
    n: rows.length,
    meanGradeAfter: Number(meanGradeAfter.toFixed(2)),
    meanGradeDrop: Number(meanGradeDrop.toFixed(2)),
    maxGradeAfter: Math.max(...rows.map((r) => r.gradeAfter)),
    rows
  };
}

/**
 * Deterministic latency probe. Runs a fixed workload of real engine calls and
 * reports mean milliseconds per operation using a caller-supplied clock so Node
 * and browser output are reproducible and never depend on the calendar.
 */
export function measureLatency(nowFn, repeats = 40) {
  const clock = typeof nowFn === 'function' ? nowFn : () => 0;
  const workload = () => {
    for (const c of GROUND_TRUTH_CASES) dejargonizeClinicalText(c.text, 'en');
    for (const c of GROUND_TRUTH_COLLISIONS) buildMedicationScheduleAndCollisions(c.scenarioId, c.otcIds, 'en');
    for (const c of GROUND_TRUTH_TRIAGE) evaluateSymptomTriage(c.scenarioId, c.symptomIds, 'en');
  };
  workload(); // warm up
  const t0 = clock();
  for (let i = 0; i < repeats; i += 1) workload();
  const t1 = clock();
  const operationsPerRepeat =
    GROUND_TRUTH_CASES.length + GROUND_TRUTH_COLLISIONS.length + GROUND_TRUTH_TRIAGE.length;
  const totalOps = operationsPerRepeat * repeats;
  const totalMs = t1 - t0;
  return {
    repeats, operationsPerRepeat, totalOps,
    totalMs: Number(totalMs.toFixed(3)),
    meanMsPerOperation: Number((totalMs / totalOps).toFixed(4)),
    meanMsPerFullSuite: Number((totalMs / repeats).toFixed(4))
  };
}

/** Runs every failure probe and reports whether each documented condition holds. */
export function evaluateFailureModes() {
  return FAILURE_CONDITIONS.map((f) => {
    const result = f.probe();
    return {
      id: f.id, title: f.title, detail: f.detail, mitigation: f.mitigation,
      expectedTriggered: f.expectedTriggered,
      triggered: Boolean(result.triggered),
      observed: result.observed,
      status: Boolean(result.triggered) === f.expectedTriggered ? 'confirmed' : 'unexpected'
    };
  });
}

/**
 * HELD-OUT TERM SET (added 2026-11-18).
 *
 * Twelve new synthetic discharge sigs written after engine v1.1.0 and its 38-term
 * lexicon were frozen. Labels were written first, from the rule below, and the engine
 * was not edited after the first run, so the score is reported exactly as it landed.
 * The author wrote both the notes and the labels, so this is a held-out split of a
 * single-author corpus, not an independent clinical annotation.
 *
 * Scoring compares sets of normalized surface forms per note (lowercase, collapsed
 * whitespace, leading and trailing punctuation removed), so out-of-lexicon terms count
 * as misses for the engine instead of being dropped.
 */
export const HELD_OUT_DATE = '2026-11-18';
export const HELD_OUT_LABEL_RULE =
  'Label every abbreviation, Latin dosing shorthand, lab or vital-sign marker, and medical term that is not everyday conversational English. Drug names, units and numbers are not labeled.';

export const HELD_OUT_TERM_CASES = [
  {
    id: 'ho-copd',
    label: 'COPD flare with rescue inhaler and steroid burst',
    text: 'Discharged after COPD exacerbation. Use albuterol MDI 2 puffs q4h PRN SOB. Prednisone 40 mg PO daily x5d. Return to ED for hemoptysis or SpO2 below 90%.',
    expected: ['copd', 'exacerbation', 'mdi', 'q4h', 'prn', 'sob', 'po', 'x5d', 'ed', 'hemoptysis', 'spo2']
  },
  {
    id: 'ho-diuretic',
    label: 'Loop diuretic with potassium check',
    text: 'Furosemide 20 mg po qam for edema. Hold if SBP < 100. Check BMP in 1 week for hypokalemia. Daily weights; call for weight gain over 2 kg.',
    expected: ['po', 'qam', 'edema', 'sbp', 'bmp', 'hypokalemia']
  },
  {
    id: 'ho-lmwh',
    label: 'Injected blood thinner after joint replacement',
    text: 'Enoxaparin 40 mg subcut q24h x14d after arthroplasty. Report melena, hematuria or epistaxis. Avoid NSAIDs.',
    expected: ['subcut', 'q24h', 'x14d', 'arthroplasty', 'melena', 'hematuria', 'epistaxis', 'nsaids']
  },
  {
    id: 'ho-insulin',
    label: 'Bedtime insulin with glucose checks',
    text: 'Insulin glargine 18 units QHS. Check fingerstick glucose AC and HS. Treat hypoglycemia with 15 g fast carbs. HbA1c 8.4%.',
    expected: ['qhs', 'fingerstick', 'ac', 'hs', 'hypoglycemia', 'hba1c']
  },
  {
    id: 'ho-ace',
    label: 'Blood pressure titration with kidney labs',
    text: 'Lisinopril 10 mg PO QD; titrate to BP goal under 130/80. Watch for orthostatic hypotension and hyperkalemia. eGFR 48.',
    expected: ['po', 'qd', 'titrate', 'bp', 'orthostatic hypotension', 'hyperkalemia', 'egfr']
  },
  {
    id: 'ho-antibiotic',
    label: 'Antibiotic course with dissolving anti-nausea tablet',
    text: 'Amoxicillin 875 mg PO BID x10 days with food. Ondansetron 4 mg ODT q8h PRN nausea.',
    expected: ['po', 'bid', 'x10', 'odt', 'q8h', 'prn']
  },
  {
    id: 'ho-dotted',
    label: 'Dotted Latin shorthand and a heart-rate hold',
    text: 'Metoprolol tartrate 25 mg p.o. b.i.d. Hold for HR < 55. Follow up with cardiology for syncope work-up.',
    expected: ['p.o', 'b.i.d', 'hr', 'syncope']
  },
  {
    id: 'ho-endoscopy',
    label: 'Fasting before an endoscopy',
    text: 'Patient NPO after midnight before EGD. Resume diet postprocedure. Pantoprazole 40 mg PO QAM AC.',
    expected: ['npo', 'egd', 'po', 'qam', 'ac']
  },
  {
    id: 'ho-warfarin',
    label: 'Warfarin with an aspirin warning',
    text: 'Clopidogrel 75 mg PO daily. Anticoagulation with warfarin; INR goal 2 to 3. Aspirin contraindicated due to GI bleed history.',
    expected: ['po', 'anticoagulation', 'inr', 'contraindicated', 'gi']
  },
  {
    id: 'ho-plain',
    label: 'Plain-language control',
    text: 'Take one pill by mouth twice a day with food. Walk a little each day. Call your doctor if the pain gets worse.',
    expected: []
  },
  {
    id: 'ho-iron',
    label: 'Iron tablets spaced from thyroid medicine',
    text: 'Iron sulfate 325 mg PO TID PC; separate from levothyroxine by 4 hours to avoid chelation and malabsorption.',
    expected: ['po', 'tid', 'pc', 'chelation', 'malabsorption']
  },
  {
    id: 'ho-nebs',
    label: 'Nebulizer treatments with breathing warning signs',
    text: 'Albuterol nebs q6h while awake. Monitor RR and work of breathing; return for retractions, cyanosis or dyspnea at rest.',
    expected: ['nebs', 'q6h', 'rr', 'retractions', 'cyanosis', 'dyspnea']
  }
];

/** Lowercase, collapse whitespace, strip leading and trailing punctuation. */
export function normalizeSurface(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^[\s.,;:()[\]]+|[\s.,;:()[\]]+$/g, '');
}

/** Engine prediction: the surface form of every lexicon span found in the note. */
export function engineSurfaceTerms(text) {
  return [...new Set(locateJargonSpans(text).map((s) => normalizeSurface(s.text)))];
}

/**
 * Capitals heuristic baseline: flag any token with two or more capital letters
 * (PO, SpO2, eGFR) or an every-N-hours shape (q4h). It needs no lexicon and cannot
 * explain anything, which makes it a fair "how far does pattern spotting get" floor.
 */
export function capsHeuristicTerms(text) {
  const out = new Set();
  for (const raw of String(text || '').split(/\s+/)) {
    const tok = normalizeSurface(raw.replace(/[;,:]+$/g, ''));
    const orig = raw.replace(/^[.,;:()]+|[.,;:()]+$/g, '');
    if (!tok) continue;
    const capitals = (orig.match(/[A-Z]/g) || []).length;
    if (capitals >= 2 || /^q\d{1,2}h$/i.test(orig)) out.add(tok);
  }
  return [...out];
}

function scoreSurfaceSets(cases, predictFn) {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  const perCase = cases.map((c) => {
    const expected = new Set(c.expected.map(normalizeSurface));
    const predicted = new Set(predictFn(c.text));
    const hits = [...predicted].filter((t) => expected.has(t));
    const falsePos = [...predicted].filter((t) => !expected.has(t));
    const misses = [...expected].filter((t) => !predicted.has(t));
    tp += hits.length;
    fp += falsePos.length;
    fn += misses.length;
    return { id: c.id, label: c.label, hits, falsePos, misses };
  });
  const precision = safeDivide(tp, tp + fp);
  const recall = safeDivide(tp, tp + fn);
  const f1 = safeDivide(2 * precision * recall, precision + recall);
  return {
    tp,
    fp,
    fn,
    precision: Number(precision.toFixed(4)),
    recall: Number(recall.toFixed(4)),
    f1: Number(f1.toFixed(4)),
    perCase
  };
}

/** Held-out score for the engine and two baselines. Pure and deterministic. */
export function evaluateHeldOut(cases = HELD_OUT_TERM_CASES) {
  const engine = scoreSurfaceSets(cases, engineSurfaceTerms);
  const lexiconWords = new Set();
  for (const entry of CLINICAL_LEXICON) {
    for (const w of entry.term.toLowerCase().split(/\s+/)) lexiconWords.add(w);
  }
  let formVariant = 0;
  let outOfLexicon = 0;
  for (const c of engine.perCase) {
    for (const miss of c.misses) {
      const bare = miss.replace(/\./g, '');
      const parts = bare.split(' ');
      if (parts.every((w) => lexiconWords.has(w))) formVariant += 1;
      else outOfLexicon += 1;
    }
  }
  engine.missBreakdown = { formVariant, outOfLexicon };
  const caps = scoreSurfaceSets(cases, capsHeuristicTerms);
  const echo = scoreSurfaceSets(cases, () => []);
  const labelCount = cases.reduce((n, c) => n + new Set(c.expected.map(normalizeSurface)).size, 0);
  return {
    date: HELD_OUT_DATE,
    rule: HELD_OUT_LABEL_RULE,
    notes: cases.length,
    labels: labelCount,
    engine,
    capsBaseline: caps,
    echoBaseline: echo,
    f1GainOverCaps: Number((engine.f1 - caps.f1).toFixed(4)),
    f1GainOverEcho: Number((engine.f1 - echo.f1).toFixed(4))
  };
}

/** Full benchmark report. Pure: the same input always yields the same numbers. */
export function runEvaluation({ nowFn, repeats = 40 } = {}) {
  const term = evaluateTermDetection();
  const collision = evaluateCollisions();
  const triage = evaluateTriage();
  const readability = evaluateReadability();
  const latency = measureLatency(nowFn, repeats);
  const failureModes = evaluateFailureModes();
  const heldOut = evaluateHeldOut();
  const combinedBrier = Number(
    ((term.brier + triage.brier) / 2).toFixed(4)
  );
  return {
    version: EVAL_VERSION,
    date: EVAL_DATE,
    corpus: {
      termCases: GROUND_TRUTH_CASES.length,
      collisionCases: GROUND_TRUTH_COLLISIONS.length,
      triageCases: GROUND_TRUTH_TRIAGE.length,
      readabilityRows: readability.n,
      lexiconEntries: CLINICAL_LEXICON.length,
      otcAddons: OTC_ADDONS.length,
      scenarios: CLINICAL_SCENARIOS.length,
      failureProbes: failureModes.length
    },
    metrics: {
      termDetectionF1: Number(term.f1.toFixed(4)),
      termPrecision: Number(term.precision.toFixed(4)),
      termRecall: Number(term.recall.toFixed(4)),
      termDetectionBrier: Number(term.brier.toFixed(4)),
      collisionF1: Number(collision.f1.toFixed(4)),
      collisionAccuracy: Number(collision.accuracy.toFixed(4)),
      triageAccuracy: Number(triage.accuracy.toFixed(4)),
      triageF1: Number(triage.f1.toFixed(4)),
      triageBrier: Number(triage.brier.toFixed(4)),
      combinedBrier,
      meanGradeAfter: readability.meanGradeAfter,
      meanGradeDrop: readability.meanGradeDrop,
      meanMsPerOperation: latency.meanMsPerOperation,
      meanMsPerFullSuite: latency.meanMsPerFullSuite
    },
    baseline: BASELINE,
    comparison: {
      termDetectionF1Gain: Number((term.f1 - BASELINE.termDetectionF1).toFixed(4)),
      collisionF1Gain: Number((collision.f1 - BASELINE.collisionF1).toFixed(4)),
      triageAccuracyGain: Number((triage.accuracy - BASELINE.triageAccuracy).toFixed(4)),
      triageF1Gain: Number((triage.f1 - BASELINE.triageF1).toFixed(4)),
      latencyVsBaseline: 'Baseline does no work (0 ms). The measured cost is the full rules suite, paid once per interaction in the browser.',
      cost: 'Zero network requests, zero API spend, zero server cost. All computation runs client-side.'
    },
    tasks: { term, collision, triage, readability, latency },
    heldOut,
    failureModes,
    disclaimers: DISCLAIMERS
  };
}

/** Human-readable CLI report. Deterministic except for the optional latency field. */
export function formatCliReport(report) {
  const m = report.metrics;
  const lines = [
    `ClinNote Evaluation & Failure-Mode Benchmark v${report.version} (${report.date})`,
    `Corpus: ${report.corpus.termCases} term cases, ${report.corpus.collisionCases} collision cases, ${report.corpus.triageCases} triage cases, ${report.corpus.readabilityRows} readability rows, ${report.corpus.failureProbes} failure probes`,
    '',
    `Term detection: P ${m.termPrecision} R ${m.termRecall} F1 ${m.termDetectionF1} Brier ${m.termDetectionBrier}`,
    `Collision detection: F1 ${m.collisionF1} accuracy ${m.collisionAccuracy}`,
    `Triage: accuracy ${m.triageAccuracy} F1 ${m.triageF1} Brier ${m.triageBrier}`,
    `Readability: mean grade after ${m.meanGradeAfter}, mean drop ${m.meanGradeDrop}`,
    `Latency: ${m.meanMsPerOperation} ms/operation, ${m.meanMsPerFullSuite} ms/full suite`,
    '',
    `Held-out (${report.heldOut.notes} notes, ${report.heldOut.labels} labels, written ${report.heldOut.date}): engine P ${report.heldOut.engine.precision} R ${report.heldOut.engine.recall} F1 ${report.heldOut.engine.f1}; capitals baseline F1 ${report.heldOut.capsBaseline.f1}; echo baseline F1 ${report.heldOut.echoBaseline.f1}`,
    `Baseline (${report.baseline.id}): term F1 ${report.baseline.termDetectionF1}, collision F1 ${report.baseline.collisionF1}, triage accuracy ${report.baseline.triageAccuracy}, triage F1 ${report.baseline.triageF1}`,
    `Gains: term F1 +${report.comparison.termDetectionF1Gain}, collision F1 +${report.comparison.collisionF1Gain}, triage accuracy +${report.comparison.triageAccuracyGain}, triage F1 +${report.comparison.triageF1Gain}`,
    '',
    'Failure conditions:'
  ];
  for (const f of report.failureModes) lines.push(`  [${f.status}] ${f.title}`);
  lines.push('', 'Guardrails:');
  for (const d of report.disclaimers) lines.push(`  - ${d}`);
  return lines.join('\n');
}
