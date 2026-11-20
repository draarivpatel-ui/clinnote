import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  EVAL_VERSION,
  GROUND_TRUTH_CASES,
  GROUND_TRUTH_COLLISIONS,
  GROUND_TRUTH_TRIAGE,
  FAILURE_CONDITIONS,
  DISCLAIMERS,
  BASELINE,
  scoreSet,
  scoreTermCase,
  scoreLabels,
  brierScore,
  evaluateTermDetection,
  evaluateCollisions,
  evaluateTriage,
  evaluateReadability,
  measureLatency,
  evaluateFailureModes,
  runEvaluation,
  formatCliReport
} from '../js/evaluation.js';
import { CLINICAL_LEXICON, OTC_ADDONS, CLINICAL_SCENARIOS, DOSING_CLOCK_HOURS, computeReadabilityMetrics, buildUiViewState } from '../js/clinnote-engine.js';

const fixedClock = (() => {
  let t = 0;
  return () => { t += 0.01; return t; };
})();

test('Eval 01: corpus is frozen, hand-labeled, and free of private data', () => {
  assert.equal(GROUND_TRUTH_CASES.length, 10);
  assert.equal(GROUND_TRUTH_COLLISIONS.length, 7);
  assert.equal(GROUND_TRUTH_TRIAGE.length, 7);
  assert.equal(FAILURE_CONDITIONS.length, 10);
  assert.ok(DISCLAIMERS.length >= 4);
  for (const c of GROUND_TRUTH_CASES) {
    assert.equal(typeof c.id, 'string');
    assert.equal(typeof c.label, 'string');
    assert.ok(Array.isArray(c.expectedTerms));
    assert.ok(Array.isArray(c.unexpectedTerms));
    // No dash characters anywhere in the corpus copy.
    assert.equal(/[\u2013\u2014]/.test(c.label + c.text), false);
  }
});

test('Eval 02: every expected collision and triage label maps to a real scenario', () => {
  const ids = new Set(CLINICAL_SCENARIOS.map((s) => s.id));
  for (const c of [...GROUND_TRUTH_COLLISIONS, ...GROUND_TRUTH_TRIAGE]) {
    assert.ok(ids.has(c.scenarioId), `${c.id} references unknown scenario ${c.scenarioId}`);
  }
  const otcIds = new Set(OTC_ADDONS.map((o) => o.id));
  for (const c of GROUND_TRUTH_COLLISIONS) {
    for (const id of c.otcIds) assert.ok(otcIds.has(id), `${c.id} references unknown OTC ${id}`);
  }
});

test('Eval 03: scoreSet computes precision, recall and F1 exactly', () => {
  assert.deepEqual(scoreSet(['a', 'b'], ['a', 'b']), { tp: 2, fp: 0, fn: 0, precision: 1, recall: 1, f1: 1 });
  assert.deepEqual(scoreSet(['a', 'x'], ['a', 'b']), { tp: 1, fp: 1, fn: 1, precision: 0.5, recall: 0.5, f1: 0.5 });
  assert.deepEqual(scoreSet([], []), { tp: 0, fp: 0, fn: 0, precision: 0, recall: 0, f1: 0 });
  assert.deepEqual(scoreSet(null, ['a']), { tp: 0, fp: 0, fn: 1, precision: 0, recall: 0, f1: 0 });
});

test('Eval 04: scoreLabels handles the null (safe baseline) class correctly', () => {
  const r = scoreLabels([
    { id: 'a', label: 'a', expected: 'X', predicted: 'X' },
    { id: 'b', label: 'b', expected: 'X', predicted: 'Y' },
    { id: 'c', label: 'c', expected: null, predicted: null },
    { id: 'd', label: 'd', expected: null, predicted: 'X' }
  ]);
  assert.equal(r.tp, 1);
  assert.equal(r.fn, 1);
  assert.equal(r.tn, 1);
  assert.equal(r.fp, 2);
  assert.equal(r.accuracy, 0.5);
  assert.equal(r.f1, 0.4);
});

test('Eval 05: brierScore is the mean squared error and 0 for perfect confidence', () => {
  assert.equal(brierScore([]), 0);
  assert.equal(brierScore([{ confidence: 1, outcome: 1 }]), 0);
  assert.equal(brierScore([{ confidence: 0, outcome: 1 }]), 1);
  assert.equal(brierScore([
    { confidence: 1, outcome: 1 },
    { confidence: 0.5, outcome: 0 }
  ]), 0.125);
});

test('Eval 06: term detection reports a real, non-perfect recall because of lexicon coverage', () => {
  const r = evaluateTermDetection();
  assert.equal(r.n, 10);
  assert.equal(r.precision, 1);
  assert.ok(r.recall < 1, 'coverage gaps must be visible in the headline metric');
  assert.ok(r.f1 > 0.9 && r.f1 < 1);
  assert.ok(r.brier > 0 && r.brier < 0.2);
  const missed = r.perCase.find((c) => c.id === 'case-out-of-lexicon');
  assert.equal(missed.correct, false);
  assert.equal(missed.fn, 2);
  assert.deepEqual(missed.outOfScopeExpected, ['telemetry', 'WNL']);
});

test('Eval 07: term detection has zero false alarms on control and substring cases', () => {
  const r = evaluateTermDetection();
  for (const id of ['case-plain-control', 'case-empty-control', 'case-substring-trap']) {
    const c = r.perCase.find((x) => x.id === id);
    assert.equal(c.fp, 0, `${id} produced a false alarm`);
    assert.equal(c.predicted.length, 0);
  }
  assert.equal(r.perCase.find((c) => c.id === 'case-lower-case-variant').correct, true);
});

test('Eval 08: negation is a documented, probed failure rather than a hidden claim', () => {
  const r = evaluateTermDetection();
  const c = r.perCase.find((x) => x.id === 'case-negation-trap');
  assert.equal(c.correct, true, 'tokens are still reported, which is the documented behavior');
  assert.ok(c.predicted.includes('dyspnea'));
  const f = evaluateFailureModes().find((x) => x.id === 'fail-negation');
  assert.equal(f.triggered, true);
  assert.equal(f.status, 'confirmed');
  assert.match(f.mitigation, /clinician/i);
});

test('Eval 09: collision detection matches every authored label including the safe baseline', () => {
  const r = evaluateCollisions();
  assert.equal(r.n, 7);
  assert.equal(r.accuracy, 1);
  assert.equal(r.f1, 1);
  assert.equal(r.perCase.filter((c) => c.correct).length, 7);
  const safe = r.perCase.find((c) => c.id === 'col-safe-baseline');
  assert.deepEqual(safe.expected, []);
  assert.deepEqual(safe.predicted, []);
  assert.equal(safe.collisionCount, 0);
  assert.equal(safe.overallSafetyBand, 'SAFE');
});

test('Eval 10: triage matches every label, wins on the highest tier, and ignores unknown IDs', () => {
  const r = evaluateTriage();
  assert.equal(r.n, 7);
  assert.equal(r.accuracy, 1);
  assert.equal(r.f1, 1);
  assert.equal(r.brier, 0);
  const mixed = r.perCase.find((c) => c.id === 'triage-mixed-emergency-wins');
  assert.equal(mixed.predicted, 'IMMEDIATE EMERGENCY DEPARTMENT');
  assert.equal(mixed.urgencyScore, 95);
  const unknown = r.perCase.find((c) => c.id === 'triage-unknown-id-ignored');
  assert.equal(unknown.predicted, 'ROUTINE HOME CARE');
  assert.equal(unknown.activeSymptomCount, 0);
});

test('Eval 11: readability runs on all four scenarios in both languages with no fake values', () => {
  const r = evaluateReadability();
  assert.equal(r.n, CLINICAL_SCENARIOS.length * 2);
  assert.equal(r.rows.length, 8);
  for (const row of r.rows) {
    assert.ok(row.gradeBefore > 0);
    const actual = computeReadabilityMetrics(row.renderedText);
    assert.equal(row.gradeAfter, actual.fleschKincaidGrade);
    assert.equal(row.gradeDrop, row.gradeBefore - row.gradeAfter);
    assert.equal(row.jargonAfter, actual.jargonCount);
    const view = buildUiViewState({ scenarioId: row.scenarioId, lang: row.lang, customText: '', activeOtcIds: [], selectedSymptomIds: [] });
    assert.equal(row.renderedText, view.plainPatientParagraph);
  }
  assert.equal(r.meanGradeAfter, 13.73);
  assert.equal(r.meanGradeDrop, 0.1);
});

test('Eval 12: latency is deterministic under a caller-supplied clock', () => {
  let t = 0;
  const clock = () => { t += 2; return t; };
  const a = measureLatency(clock, 10);
  t = 0;
  const b = measureLatency(clock, 10);
  assert.deepEqual(a, b);
  assert.equal(a.totalOps, a.repeats * a.operationsPerRepeat);
  assert.equal(a.operationsPerRepeat, 10 + 7 + 7);
  assert.ok(a.meanMsPerOperation > 0);
  assert.ok(a.meanMsPerFullSuite > a.meanMsPerOperation);
});

test('Eval 13: all ten failure probes are confirmed with explicit mitigations', () => {
  const modes = evaluateFailureModes();
  assert.equal(modes.length, 10);
  for (const m of modes) {
    assert.equal(m.status, 'confirmed', `${m.id} reported ${m.status}`);
    assert.equal(m.triggered, m.expectedTriggered);
    assert.ok(m.title.length > 8);
    assert.ok(m.detail.length > 20);
    assert.ok(m.mitigation.length > 20);
    assert.ok(Array.isArray(m.observed));
  }
});

test('Eval 14: full report is pure, stable, and carries verified headline metrics', () => {
  const a = runEvaluation({ nowFn: fixedClock, repeats: 5 });
  const b = runEvaluation({ nowFn: fixedClock, repeats: 5 });
  assert.deepEqual(a.metrics, b.metrics);
  assert.deepEqual(a.comparison, b.comparison);
  assert.equal(a.version, EVAL_VERSION);
  assert.equal(a.metrics.termDetectionF1, 0.9762);
  assert.equal(a.metrics.termPrecision, 1);
  assert.equal(a.metrics.collisionF1, 1);
  assert.equal(a.metrics.triageAccuracy, 1);
  assert.equal(a.metrics.combinedBrier, 0.0007);
  assert.equal(a.metrics.meanGradeAfter, 13.73);
  assert.equal(a.metrics.meanGradeDrop, 0.1);
  assert.equal(a.corpus.termCases, 10);
  assert.equal(a.corpus.lexiconEntries, CLINICAL_LEXICON.length);
  assert.equal(a.corpus.otcAddons, OTC_ADDONS.length);
  assert.equal(a.corpus.scenarios, CLINICAL_SCENARIOS.length);
  assert.equal(a.corpus.failureProbes, 10);
  assert.equal(a.corpus.negationCases, 26);
  assert.equal(a.corpus.claimCheckCases, 19);
  assert.equal(a.corpus.contextCases, 11);
  assert.equal(a.tasks.term.n, 10);
  assert.equal(a.tasks.collision.n, 7);
  assert.equal(a.tasks.triage.n, 7);
  assert.equal(a.tasks.negation.n, 26);
  assert.equal(a.tasks.claimCheck.n, 19);
  assert.equal(a.tasks.context.n, 11);
});

test('Eval 15: baseline comparison is explicit and every gain is a real difference', () => {
  const r = runEvaluation({ nowFn: () => 0, repeats: 3 });
  assert.equal(r.baseline.termDetectionF1, 0);
  assert.equal(r.baseline.collisionF1, 0);
  assert.equal(r.baseline.triageAccuracy, 0.4286);
  assert.equal(r.baseline.triageF1, 0.4286);
  assert.equal(BASELINE.latencyMs, 0);
  assert.equal(r.comparison.termDetectionF1Gain, r.metrics.termDetectionF1);
  assert.equal(r.comparison.collisionF1Gain, r.metrics.collisionF1);
  assert.equal(r.comparison.triageAccuracyGain, 0.5714);
  assert.equal(r.comparison.triageF1Gain, 0.5714);
  assert.match(r.comparison.cost, /network requests/);
  assert.match(r.comparison.latencyVsBaseline, /Baseline/);
});

test('Eval 16: CLI report contains exact metrics, baseline, failure states and guardrails', () => {
  const r = runEvaluation({ nowFn: () => 0, repeats: 3 });
  const out = formatCliReport(r);
  assert.match(out, /Term detection: P 1 R 0.9535 F1 0.9762/);
  assert.match(out, /Collision detection: F1 1 accuracy 1/);
  assert.match(out, /Triage: accuracy 1 F1 1 Brier 0/);
  assert.match(out, /Baseline \(naive-raw-text\)/);
  assert.match(out, /Gains: term F1 \+0.9762/);
  assert.match(out, /\[confirmed\] Negation is flagged but not clinically resolved/);
  assert.match(out, /Negation flags: P 1 R 1 F1 1 case accuracy 1/);
  assert.match(out, /Claim check: catch rate 1 flag accuracy 1 false-flag rate 0/);
  assert.match(out, /Guardrails:/);
  assert.match(out, /not clinical accuracy on real patient discharge notes/);
  assert.equal(/[\u2013\u2014]/.test(out), false);
});

test('Eval 17: no source file in the evaluation suite contains em-dashes or en-dashes', () => {
  // The benchmark copy is checked at the string level; the DOM smoke suite checks the files.
  const r = runEvaluation({ nowFn: () => 0, repeats: 2 });
  const serialized = JSON.stringify(r);
  assert.equal(/[\u2013\u2014]/.test(serialized), false);
});


test('Eval 18: forbidden and extra term predictions count once in every metric', () => {
  const c = { id: 'fixture', label: 'fixture', expectedTerms: ['PO'], unexpectedTerms: ['QD'], outOfScopeExpected: ['SL'] };
  const r = scoreTermCase(c, ['PO', 'QD', 'QD', 'extra']);
  assert.equal(r.tp, 1);
  assert.equal(r.fp, 2);
  assert.equal(r.fn, 1);
  assert.equal(r.precision, 1 / 3);
  assert.equal(r.recall, 1 / 2);
  assert.equal(r.f1, 0.4);
  assert.equal(r.candidates.filter((id) => id === 'QD').length, 1);
  assert.equal(r.brierEntries.length, r.candidates.length);
  assert.equal(r.brier, 3 / r.candidates.length);
});

test('Eval 19: every out-of-lexicon miss affects per-case recall, F1 and Brier consistently', () => {
  const report = evaluateTermDetection();
  assert.equal(report.tp, 41);
  assert.equal(report.fp, 0);
  assert.equal(report.fn, 2);
  assert.equal(report.candidateCount, 1452);
  assert.equal(report.recall, 41 / 43);
  assert.equal(report.brier, 2 / 1452);
  const postop = report.perCase.find((c) => c.id === 'case-postop-anticoag');
  assert.equal(postop.fn, 0);
  assert.equal(postop.recall, 1);
  assert.equal(postop.f1, 1);
  const other = report.perCase.find((c) => c.id === 'case-out-of-lexicon');
  assert.equal(other.fn, 2);
  assert.equal(other.recall, 0.75);
  assert.equal(other.f1, 0.8571428571428571);
});

test('Eval 20: complete alert sets penalize extra alerts even when every required code is present', () => {
  const corpus = [{ id: 'fixture', label: 'fixture', expectedCodes: ['required', 'second'], scenarioId: 'fixture', otcIds: [] }];
  const builder = () => ({ collisions: [{ code: 'required' }, { code: 'second' }, { code: 'extra' }, { code: 'extra' }], collisionCount: 4, overallSafetyBand: 'HIGH' });
  const r = evaluateCollisions(corpus, builder);
  assert.equal(r.tp, 2);
  assert.equal(r.fp, 1);
  assert.equal(r.fn, 0);
  assert.equal(r.f1, 0.8);
  assert.equal(r.accuracy, 0);
  assert.deepEqual(r.perCase[0].predicted, ['required', 'second', 'extra']);
  const safe = evaluateCollisions([{ ...corpus[0], expectedCodes: [] }], builder);
  assert.equal(safe.fp, 3);
  assert.equal(safe.accuracy, 0);
});

test('Eval 21: routine-only triage is scored on its three correct cases', () => {
  const expected = scoreLabels(GROUND_TRUTH_TRIAGE.map((c) => ({ expected: c.expectedDisposition, predicted: 'ROUTINE HOME CARE' })));
  assert.equal(expected.tp, 3);
  assert.equal(expected.fp, 4);
  assert.equal(expected.fn, 4);
  assert.equal(expected.accuracy, 3 / 7);
  assert.equal(expected.f1, 3 / 7);
  assert.deepEqual(BASELINE.triageCounts, { tp: 3, fp: 4, fn: 4, n: 7 });
});

test('Eval 22: the clock probe reads real schedule coverage instead of unconditional success', () => {
  const condition = FAILURE_CONDITIONS.find((f) => f.id === 'fail-fixed-schedule');
  const good = condition.probe();
  assert.equal(good.triggered, true);
  assert.equal(good.observed[0], 8);
  for (const hours of good.observed.slice(1)) assert.deepEqual(hours, DOSING_CLOCK_HOURS);
  const med = CLINICAL_SCENARIOS[0].medications[0];
  const original = med.hours;
  try {
    med.hours = [...original, '09:00'];
    assert.equal(condition.probe().triggered, false);
  } finally {
    med.hours = original;
  }
});


test('Eval 23: both published tables match the current nonvolatile benchmark metrics', () => {
  const r = runEvaluation({ nowFn: () => 0, repeats: 1 });
  const m = r.metrics;
  const fixed = (value) => value.toFixed(4);
  const term = [m.termPrecision, m.termRecall, m.termDetectionF1].map(fixed).join(' / ');
  const triage = [m.triageAccuracy, m.triageF1, m.triageBrier].map(fixed).join(' / ');
  for (const name of ['README.md', 'DEVPOST_UPGRADE.md']) {
    const text = fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');
    assert.ok(text.includes('| Jargon token detection | Precision / Recall / F1 | ' + term + ' |'));
    assert.ok(text.includes('| Jargon token detection | Brier | ' + fixed(m.termDetectionBrier) + ' |'));
    assert.ok(text.includes('| Red-flag triage | Accuracy / micro-F1 / Brier | ' + triage + ' |'));
    assert.ok(text.includes(m.meanGradeAfter.toFixed(2) + ' / ' + m.meanGradeDrop.toFixed(2)));
    assert.ok(text.includes(r.baseline.triageAccuracy.toFixed(4)));
    assert.ok(text.includes('+' + r.comparison.triageAccuracyGain.toFixed(4)));
    assert.ok(text.includes(r.tasks.term.candidateCount + ' binary candidates'));
  }
});
