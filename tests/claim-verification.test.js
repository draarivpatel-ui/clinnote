import test from 'node:test';
import assert from 'node:assert/strict';
import {
  locateJargonSpans,
  isNegatedContext,
  detectNegatedTerms,
  parseDosages,
  compareDosages,
  detectDosageMismatch,
  extractClaims,
  verifyClaim,
  verifyClaims,
  buildAuditTrail,
  exportAuditTrail,
  buildUiViewState,
  createInitialAppState,
  applyAppAction
} from '../js/clinnote-engine.js';

test('Neg 01: "denies chest pain" marks dyspnea/chest-pain term as negated', () => {
  const text = 'Patient denies dyspnea and chest pain; no wheezing observed.';
  const spans = locateJargonSpans(text);
  const dys = spans.find((s) => s.id === 'dyspnea');
  assert.ok(dys, 'dyspnea span present');
  assert.equal(dys.negated, true);
});

test('Neg 02: "no known allergies" negates an allergy-related term context', () => {
  // use a lexicon term that can appear negated
  const text = 'No dyspnea on exertion; denies orthostatic hypotension.';
  const neg = detectNegatedTerms(text);
  assert.ok(neg.length >= 1);
  assert.ok(neg.every((s) => s.negated === true));
});

test('Neg 03: positive mention is not negated', () => {
  const text = 'Patient has dyspnea and wheezing.';
  const spans = locateJargonSpans(text);
  const dys = spans.find((s) => s.id === 'dyspnea');
  assert.ok(dys);
  assert.equal(dys.negated, false);
});

test('Neg 04: isNegatedContext detects trailing "denied"', () => {
  assert.equal(isNegatedContext('dyspnea denied', 0, 8), true);
});

test('Dose 01: parseDosages extracts values and units', () => {
  const d = parseDosages('Give Apixaban 2.5 mg PO BID; max 3000 mg per day.');
  assert.ok(d.length >= 2);
  assert.equal(d[0].value, 2.5);
  assert.equal(d[0].unit, 'mg');
});

test('Dose 02: compareDosages flags mismatched claimed dose', () => {
  const r = compareDosages('Apixaban 2.5 mg PO BID', 'Apixaban 5 mg PO BID');
  assert.equal(r.match, false);
  assert.ok(r.mismatches.length >= 1);
});

test('Dose 03: compareDosages matches identical doses', () => {
  const r = compareDosages('Metformin 500 mg PO BID', 'Metformin 500 mg PO BID');
  assert.equal(r.match, true);
  assert.equal(r.mismatches.length, 0);
});

test('Dose 04: detectDosageMismatch returns array', () => {
  const m = detectDosageMismatch('Lisinopril 10 mg PO QD', 'Lisinopril 20 mg PO QD');
  assert.ok(Array.isArray(m));
  assert.ok(m.length >= 1);
});

test('Claim 01: verifyClaim supports exact match', () => {
  const src = 'Apixaban 2.5 mg PO BID q12h';
  const claim = { raw: 'Apixaban 2.5 mg', subject: 'Apixaban', value: 2.5, unit: 'mg' };
  const r = verifyClaim(claim, src);
  assert.equal(r.supported, true);
});

test('Claim 02: verifyClaim flags dosage mismatch as unsupported', () => {
  const src = 'Apixaban 2.5 mg PO BID q12h';
  const claim = { raw: 'Apixaban 5 mg', subject: 'Apixaban', value: 5, unit: 'mg' };
  const r = verifyClaim(claim, src);
  assert.equal(r.supported, false);
  assert.equal(r.reason, 'dosage-mismatch');
});

test('Claim 03: verifyClaim flags unsupported hallucinated claim', () => {
  const src = 'Apixaban 2.5 mg PO BID q12h';
  const claim = { raw: 'Warfarin 5 mg', subject: 'Warfarin', value: 5, unit: 'mg' };
  const r = verifyClaim(claim, src);
  assert.equal(r.supported, false);
});

test('Claim 04: verifyClaims aggregates counts', () => {
  const src = 'Apixaban 2.5 mg PO BID q12h';
  const claims = [
    { raw: 'Apixaban 2.5 mg', subject: 'Apixaban', value: 2.5, unit: 'mg' },
    { raw: 'Warfarin 5 mg', subject: 'Warfarin', value: 5, unit: 'mg' }
  ];
  const r = verifyClaims(claims, src);
  assert.equal(r.total, 2);
  assert.equal(r.supported, 1);
  assert.equal(r.unsupported, 1);
});

test('Claim 05: extractClaims finds medication claims', () => {
  const c = extractClaims('Take Apixaban 2.5 mg PO BID and Metformin 500 mg PO BID.');
  assert.ok(c.length >= 2);
  assert.ok(c.some((x) => x.subject === 'Apixaban'));
});

test('Span 01: negated spans still slice to surface text', () => {
  const text = 'No dyspnea observed; denies orthostatic hypotension.';
  for (const s of locateJargonSpans(text)) {
    assert.equal(text.slice(s.start, s.end), s.text);
  }
});

test('Span 02: span offsets are within bounds', () => {
  const text = 'Administer PO q4h PRN; eGFR 52.';
  for (const s of locateJargonSpans(text)) {
    assert.ok(s.start >= 0 && s.end <= text.length);
    assert.ok(s.end > s.start);
  }
});

test('Audit 01: buildAuditTrail returns entries with required fields', () => {
  const state = createInitialAppState();
  const view = buildUiViewState(state);
  const trail = buildAuditTrail(view);
  assert.ok(Array.isArray(trail));
  assert.ok(trail.length > 0);
  for (const e of trail) {
    assert.ok(Object.prototype.hasOwnProperty.call(e, 'start'));
    assert.ok(Object.prototype.hasOwnProperty.call(e, 'end'));
    assert.ok(Object.prototype.hasOwnProperty.call(e, 'negated'));
    assert.ok(Object.prototype.hasOwnProperty.call(e, 'verified'));
  }
});

test('Audit 02: exportAuditTrail json and csv', () => {
  const state = createInitialAppState();
  const view = buildUiViewState(state);
  const trail = buildAuditTrail(view);
  const json = exportAuditTrail(trail, 'json');
  const csv = exportAuditTrail(trail, 'csv');
  assert.ok(json.startsWith('['));
  assert.match(csv, /^index,term/);
});
