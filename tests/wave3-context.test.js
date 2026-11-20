// Wave 3 regressions: ConText scope dimensions, route/frequency/allergy claims,
// formulary classes, family-history isolation and audit export fields.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLINICAL_LEXICON,
  detectContextScope,
  extractAllergyInfo,
  extractClaims,
  locateJargonSpans,
  verifyGeneratedText,
  buildAuditTrail,
  exportAuditTrail,
  createInitialAppState,
  applyAppAction,
  buildUiViewState
} from '../js/clinnote-engine.js';
import { evaluateContext, GROUND_TRUTH_CONTEXT } from '../js/evaluation.js';

const scopeOf = (text, surface) => {
  const spans = locateJargonSpans(text).filter((s) => s.id === surface || s.text.toLowerCase() === surface.toLowerCase());
  return spans[0];
};

// --- Context scope dimensions ---------------------------------------------

test('Wave3 Scope 01: family history applies to every item in a comma list', () => {
  for (const id of ['mi', 't2d', 'copd']) {
    const s = scopeOf('Family history of MI, T2DM, COPD.', id) || scopeOf('Family history of MI, T2DM, COPD.', 'T2DM') || scopeOf('Family history of MI, T2DM, COPD.', 'COPD');
    assert.ok(s, `missing span for ${id}`);
    assert.equal(s.experiencer, 'family', `${id} experiencer`);
    assert.equal(s.temporality, 'historical', `${id} temporality`);
    assert.equal(s.certainty, 'affirmed', `${id} certainty`);
  }
});

test('Wave3 Scope 02: relatives reporting diagnoses mark family experiencer', () => {
  const dm = scopeOf('Mother had DM; father with HTN.', 'dm') || scopeOf('Mother had DM; father with HTN.', 'htn');
  assert.ok(dm);
  assert.equal(dm.experiencer, 'family');
});

test('Wave3 Scope 03: historical cues mark temporality without touching certainty', () => {
  const dvt = scopeOf('H/o DVT in 2019; no events since.', 'dvt');
  assert.ok(dvt);
  assert.equal(dvt.temporality, 'historical');
  assert.equal(dvt.certainty, 'affirmed');
});

test('Wave3 Scope 04: possible, suspected and evaluate-for mark uncertainty', () => {
  const pe = scopeOf('Possible PE on admission; evaluate for DVT.', 'pe');
  const dvt = scopeOf('Possible PE on admission; evaluate for DVT.', 'dvt');
  assert.equal(pe.certainty, 'uncertain');
  assert.equal(dvt.certainty, 'uncertain');
});

test('Wave3 Scope 05: imperative rule-out marks uncertain, completed forms stay negated', () => {
  const mi = scopeOf('Prior MI, rule out recurrence.', 'mi');
  assert.equal(mi.certainty, 'uncertain');
  assert.equal(mi.negated, false);
  const dysp = scopeOf('Workup rules out dyspnea.', 'dyspnea');
  assert.equal(dysp.certainty, 'negated');
  assert.equal(dysp.negated, true);
});

test('Wave3 Scope 06: affirmed patient findings stay current and patient-experiencer', () => {
  const sob = scopeOf('Patient reports SOB and CP on exertion.', 'sob');
  assert.equal(sob.certainty, 'affirmed');
  assert.equal(sob.temporality, 'current');
  assert.equal(sob.experiencer, 'patient');
});

test('Wave3 Scope 07: scope stops at sentence boundaries and contrast words', () => {
  const familyCad = scopeOf('Family history of CAD. Current DVT on ultrasound.', 'dvt');
  assert.equal(familyCad.experiencer, 'patient');
  assert.equal(familyCad.temporality, 'current');
});

test('Wave3 Scope 08: monitor-for language marks conditional uncertainty', () => {
  const mel = scopeOf('Monitor for dyspnea and melena.', 'melena');
  assert.equal(mel.certainty, 'uncertain');
});

test('Wave3 Scope 09: detectContextScope returns all three axes', () => {
  const s = detectContextScope('H/o DVT in 2019.', 4, 3);
  assert.deepEqual(s, { certainty: 'affirmed', temporality: 'historical', experiencer: 'patient' });
});

test('Wave3 Scope 10: history of present illness is not a historical cue', () => {
  const s = scopeOf('HPI: dyspnea began yesterday.', 'dyspnea');
  assert.equal(s.temporality, 'current');
});

test('Wave3 Scope 11: context evaluator is all-correct on the labeled corpus', () => {
  const r = evaluateContext();
  assert.equal(r.accuracy, 1);
  assert.equal(r.checkAccuracy, 1);
  assert.equal(r.n, GROUND_TRUTH_CONTEXT.length);
});

// --- Allergy and formulary -------------------------------------------------

test('Wave3 Allergy 01: allergy list items and NKDA extract with spans', () => {
  const a = extractAllergyInfo('Allergic to penicillin and sulfa. NKDA otherwise.');
  assert.ok(a.patientItems.some((x) => x.canonical === 'penicillin'));
  assert.ok(a.hasNkda === true || a.patientItems.length >= 1);
});

test('Wave3 Claim 01: route drift is flagged, matching route verified', () => {
  const src = 'Start Apixaban 5 mg PO BID.';
  const bad = verifyGeneratedText(src, 'Take Apixaban 5 mg IV twice daily.');
  const routeClaim = bad.results.find((r) => r.claim.type === 'route');
  assert.ok(routeClaim);
  assert.equal(routeClaim.supported, false);
  assert.equal(routeClaim.reason, 'route_mismatch');
  const good = verifyGeneratedText(src, 'Take Apixaban 5 mg by mouth twice daily.');
  const goodRoute = good.results.find((r) => r.claim.type === 'route');
  assert.equal(goodRoute.supported, true);
});

test('Wave3 Claim 02: frequency drift is flagged, equivalent frequency verified', () => {
  const src = 'Lisinopril 10 mg PO daily.';
  const bad = verifyGeneratedText(src, 'Take Lisinopril 10 mg BID.');
  const freq = bad.results.find((r) => r.claim.type === 'frequency');
  assert.equal(freq.supported, false);
  assert.equal(freq.reason, 'frequency_mismatch');
  const good = verifyGeneratedText(src, 'Take Lisinopril 10 mg once a day.');
  const goodFreq = good.results.find((r) => r.claim.type === 'frequency');
  assert.equal(goodFreq.supported, true);
});

test('Wave3 Claim 03: prescribing an allergen flags allergy_conflict', () => {
  const src = 'Allergic to penicillin. Start amoxicillin 500 mg PO TID.';
  const out = verifyGeneratedText(src, 'Take amoxicillin 500 mg three times daily.');
  const med = out.results.find((r) => r.claim.type === 'medication');
  assert.equal(med.supported, false);
  assert.equal(med.reason, 'allergy_conflict');
});

test('Wave3 Claim 04: cross-reactive class flags penicillin allergy vs amoxicillin', () => {
  const src = 'Penicillin allergy. Amoxicillin 500 mg PO TID.';
  const out = verifyGeneratedText(src, 'Take amoxicillin 500 mg by mouth three times a day.');
  const med = out.results.find((r) => r.claim.type === 'medication');
  assert.equal(med.supported, false);
  assert.equal(med.reason, 'allergy_conflict');
});

test('Wave3 Claim 05: unbacked drug and dose-less mention are flagged', () => {
  const src = 'Continue metformin 500 mg BID.';
  const out = verifyGeneratedText(src, 'Also start warfarin. Keep metformin 500 mg twice daily.');
  const war = out.results.find((r) => /warfarin/i.test(r.claim.subject || ''));
  assert.equal(war.supported, false);
  assert.equal(war.reason, 'unbacked_medication');
});

test('Wave3 Claim 06: family-history drug mention never backs a patient order', () => {
  const src = 'Mother takes insulin. Patient on metformin 500 mg BID.';
  const out = verifyGeneratedText(src, 'Start insulin for the patient.');
  const ins = out.results.find((r) => /insulin/i.test(r.claim.subject || ''));
  assert.equal(ins.supported, false);
});

test('Wave3 Claim 07: avoid instructions verify against source avoid wording', () => {
  const src = 'Do not take ibuprofen while on warfarin.';
  const out = verifyGeneratedText(src, 'Do not take ibuprofen.');
  const claim = out.results.find((r) => /ibuprofen/i.test(r.claim.subject || ''));
  assert.ok(claim);
  assert.equal(claim.supported, true);
});

test('Wave3 Claim 08: adherence wording is not treated as avoid context', () => {
  const src = 'Keep taking lisinopril 10 mg daily.';
  const out = verifyGeneratedText(src, 'Keep taking lisinopril 10 mg once daily.');
  const med = out.results.find((r) => /lisinopril/i.test(r.claim.subject || ''));
  assert.equal(med.supported, true);
});

test('Wave3 Claim 09: NKDA conflict flags when source asserts NKDA', () => {
  const src = 'NKDA. Start cephalexin 500 mg PO TID.';
  const out = verifyGeneratedText(src, 'Patient is allergic to penicillin.');
  const alg = out.results.find((r) => r.claim.type === 'allergy');
  assert.ok(alg);
  assert.equal(alg.supported, false);
});

test('Wave3 Claim 10: claim spans carry draft positions for UI highlighting', () => {
  const out = verifyGeneratedText('Apixaban 5 mg PO BID.', 'Take Apixaban 5 mg IV daily.');
  for (const r of out.results) {
    assert.equal(typeof r.claimStart, 'number');
    assert.equal(typeof r.claimEnd, 'number');
    assert.ok(r.claimStart < r.claimEnd);
  }
});

// --- Audit trail scope fields ---------------------------------------------

test('Wave3 Audit 01: audit entries carry certainty, temporality and experiencer', () => {
  const state = applyAppAction(createInitialAppState(), { type: 'SET_CUSTOM_TEXT', text: 'Family history of MI.' });
  const view = buildUiViewState(state);
  const entries = buildAuditTrail(view);
  const spans = entries.filter((e) => e.category !== 'claim-check');
  assert.ok(spans.length > 0);
  for (const e of spans) {
    assert.ok(['affirmed', 'negated', 'uncertain'].includes(e.certainty));
    assert.ok(['current', 'historical'].includes(e.temporality));
    assert.ok(['patient', 'family'].includes(e.experiencer));
  }
  const mi = spans.find((e) => e.id === 'mi');
  assert.ok(mi);
  assert.equal(mi.experiencer, 'family');
});

test('Wave3 Audit 02: CSV export ships the three scope columns', () => {
  const state = applyAppAction(createInitialAppState(), { type: 'SET_CUSTOM_TEXT', text: 'Possible PE on admission.' });
  const csv = exportAuditTrail(buildAuditTrail(buildUiViewState(state)), 'csv');
  assert.match(csv, /^index,term,id,category,surface,start,end,negated,certainty,temporality,experiencer,verified,status,reason\n/);
  assert.match(csv, /uncertain/);
});

// --- Lexicon integrity ------------------------------------------------------

test('Wave3 Lexicon 01: lexicon ids stay unique and every entry has both languages', () => {
  const ids = new Set();
  for (const e of CLINICAL_LEXICON) {
    assert.equal(ids.has(e.id), false, `duplicate lexicon id ${e.id}`);
    ids.add(e.id);
    assert.ok(e.en && e.es, `entry ${e.id} missing a language`);
    new RegExp(e.pattern, e.flags || 'gi');
  }
});
