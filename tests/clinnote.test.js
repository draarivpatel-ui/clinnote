import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SUPPORTED_LANGUAGES,
  DOSING_CLOCK_HOURS,
  COLLISION_TYPES,
  TRIAGE_DISPOSITIONS,
  CLINICAL_LEXICON,
  OTC_ADDONS,
  CLINICAL_SCENARIOS,
  getScenarioById,
  countWordSyllables,
  detectJargonMatches,
  computeReadabilityMetrics,
  dejargonizeClinicalText,
  buildMedicationScheduleAndCollisions,
  evaluateSymptomTriage,
  createInitialAppState,
  applyAppAction,
  buildUiViewState
} from '../js/clinnote-engine.js';

test('01. supported languages include English (en) and Spanish (es)', () => {
  assert.deepEqual(SUPPORTED_LANGUAGES, ['en', 'es']);
});

test('02. dosing clock hours cover all 7 standard 24-hour clinical checkpoints', () => {
  assert.deepEqual(DOSING_CLOCK_HOURS, [
    '06:00',
    '08:00',
    '12:00',
    '14:00',
    '18:00',
    '20:00',
    '22:00'
  ]);
});

test('03. clinical lexicon contains at least 35 medical abbreviations and terms', () => {
  assert.ok(CLINICAL_LEXICON.length >= 35);
  for (const item of CLINICAL_LEXICON) {
    assert.ok(item.en.length > 3);
    assert.ok(item.es.length > 3);
  }
});

test('04. lexicon translates oral and parenteral route abbreviations (PO, MDI, NPO, subcutaneous)', () => {
  const sample = 'Administer PO or MDI or subcutaneous; keep NPO prior to surgery.';
  const en = dejargonizeClinicalText(sample, 'en');
  assert.ok(en.translatedText.includes('by mouth'));
  assert.ok(en.translatedText.includes('metered-dose inhaler puff device'));
  assert.ok(en.translatedText.includes('injected just under the skin'));
  assert.ok(en.translatedText.includes('nothing by mouth'));
});

test('05. lexicon translates daily dosing frequency terms (QD, BID, TID, QID, QAM, QHS)', () => {
  const sample = 'Schedule: QD, BID, TID, QID, QAM, and QHS.';
  const en = dejargonizeClinicalText(sample, 'en');
  assert.ok(en.translatedText.includes('once every day'));
  assert.ok(en.translatedText.includes('twice a day'));
  assert.ok(en.translatedText.includes('three times a day'));
  assert.ok(en.translatedText.includes('four times a day'));
  assert.ok(en.translatedText.includes('every morning'));
  assert.ok(en.translatedText.includes('every night at bedtime'));
});

test('06. lexicon translates hourly interval and meal timing terms (q4h, q6h, q8h, q12h, PRN, AC, PC, postprandial)', () => {
  const sample = 'Give q4h, q6h, q8h, q12h PRN AC or PC for postprandial symptoms.';
  const en = dejargonizeClinicalText(sample, 'en');
  assert.ok(en.translatedText.includes('every 4 hours'));
  assert.ok(en.translatedText.includes('every 6 hours'));
  assert.ok(en.translatedText.includes('every 8 hours'));
  assert.ok(en.translatedText.includes('every 12 hours'));
  assert.ok(en.translatedText.includes('only as needed'));
  assert.ok(en.translatedText.includes('before meals'));
  assert.ok(en.translatedText.includes('after meals'));
  assert.ok(en.translatedText.includes('after eating a meal'));
});

test('07. lexicon translates respiratory and hemodynamic terms (dyspnea, bronchospasm, intercostal retractions, SpO2, orthostatic hypotension, syncope)', () => {
  const sample = 'Monitor SpO2 for dyspnea, bronchospasm, intercostal retractions, orthostatic hypotension, or syncope.';
  const en = dejargonizeClinicalText(sample, 'en');
  assert.ok(en.translatedText.includes('blood oxygen level (SpO2)'));
  assert.ok(en.translatedText.includes('shortness of breath'));
  assert.ok(en.translatedText.includes('sudden tightening of the lung airways'));
  assert.ok(en.translatedText.includes('skin pulling in between the ribs'));
  assert.ok(en.translatedText.includes('dizziness from a blood pressure drop'));
  assert.ok(en.translatedText.includes('fainting or passing out'));
});

test('08. lexicon translates renal and metabolic lab markers (eGFR, HbA1c, nephrotoxicity, hypoglycemia, hyperkalemia)', () => {
  const sample = 'Lab check: eGFR and HbA1c; avoid nephrotoxicity, hypoglycemia, and hyperkalemia.';
  const en = dejargonizeClinicalText(sample, 'en');
  assert.ok(en.translatedText.includes('kidney filtration score (eGFR)'));
  assert.ok(en.translatedText.includes('3-month average blood sugar (HbA1c)'));
  assert.ok(en.translatedText.includes('kidney injury from medication'));
  assert.ok(en.translatedText.includes('dangerously low blood sugar'));
  assert.ok(en.translatedText.includes('high potassium level in the blood'));
});

test('09. lexicon translates surgical, anticoagulant, and bleeding warning signs (arthroplasty, anticoagulation, melena, hemoptysis, epistaxis)', () => {
  const sample = 'Post arthroplasty anticoagulation: watch for melena, hemoptysis, or epistaxis.';
  const en = dejargonizeClinicalText(sample, 'en');
  assert.ok(en.translatedText.includes('joint replacement surgery'));
  assert.ok(en.translatedText.includes('blood-thinning treatment to prevent clots'));
  assert.ok(en.translatedText.includes('dark tarry stools caused by stomach bleeding'));
  assert.ok(en.translatedText.includes('coughing up blood'));
  assert.ok(en.translatedText.includes('nosebleed that does not stop easily'));
});

test('10. lexicon translates pharmacokinetic action terms (titrate, contraindicated, chelation, malabsorption)', () => {
  const sample = 'Titrate dose; supplement is contraindicated due to chelation and malabsorption.';
  const en = dejargonizeClinicalText(sample, 'en');
  assert.ok(en.translatedText.includes('adjust the dose step by step'));
  assert.ok(en.translatedText.includes('unsafe to combine or use'));
  assert.ok(en.translatedText.includes('mineral binding in the stomach'));
  assert.ok(en.translatedText.includes('poor medicine absorption in the stomach'));
});

test('11. all 4 clinical scenarios exist with expected IDs and clinical codes', () => {
  assert.equal(CLINICAL_SCENARIOS.length, 4);
  assert.deepEqual(
    CLINICAL_SCENARIOS.map((s) => s.id),
    [
      'pediatric-asthma-er',
      't2d-renal-titration',
      'postop-anticoag-ortho',
      'hypertensive-thyroid-sync'
    ]
  );
});

test('12. getScenarioById returns exact scenario for pediatric-asthma-er', () => {
  const s = getScenarioById('pediatric-asthma-er');
  assert.equal(s.id, 'pediatric-asthma-er');
  assert.equal(s.code, 'ER-PULM-01');
});

test('13. getScenarioById returns exact scenario for t2d-renal-titration', () => {
  const s = getScenarioById('t2d-renal-titration');
  assert.equal(s.id, 't2d-renal-titration');
  assert.equal(s.code, 'NEPH-ENDO-02');
});

test('14. getScenarioById returns exact scenario for postop-anticoag-ortho', () => {
  const s = getScenarioById('postop-anticoag-ortho');
  assert.equal(s.id, 'postop-anticoag-ortho');
  assert.equal(s.code, 'ORTHO-COAG-03');
});

test('15. getScenarioById returns exact scenario for hypertensive-thyroid-sync', () => {
  const s = getScenarioById('hypertensive-thyroid-sync');
  assert.equal(s.id, 'hypertensive-thyroid-sync');
  assert.equal(s.code, 'CARD-ENDO-04');
});

test('16. getScenarioById falls back to pediatric-asthma-er when passed unknown ID', () => {
  const fallback = getScenarioById('unknown-scenario');
  assert.equal(fallback.id, 'pediatric-asthma-er');
});

test('17. countWordSyllables returns 1 for non-string inputs', () => {
  assert.equal(countWordSyllables(null), 1);
  assert.equal(countWordSyllables(undefined), 1);
  assert.equal(countWordSyllables(42), 1);
});

test('18. countWordSyllables returns 1 for punctuation-only or <= 3 letter words', () => {
  assert.equal(countWordSyllables('---'), 1);
  assert.equal(countWordSyllables('po'), 1);
  assert.equal(countWordSyllables('day'), 1);
});

test('19. countWordSyllables strips silent trailing e and handles vowel clusters', () => {
  assert.equal(countWordSyllables('dose'), 1);
  assert.equal(countWordSyllables('take'), 1);
  assert.equal(countWordSyllables('rhythm'), 1);
  assert.equal(countWordSyllables('brrr'), 1);
});

test('20. countWordSyllables counts polysyllabic medical words accurately', () => {
  assert.ok(countWordSyllables('nephrotoxicity') >= 5);
  assert.ok(countWordSyllables('anticoagulation') >= 5);
});

test('21. detectJargonMatches returns empty array for non-string or whitespace input', () => {
  assert.deepEqual(detectJargonMatches(null), []);
  assert.deepEqual(detectJargonMatches('   '), []);
});

test('22. detectJargonMatches returns English replacements when lang is en', () => {
  const matches = detectJargonMatches('Administer PO BID PRN dyspnea.', 'en');
  assert.equal(matches.length, 4);
  const po = matches.find((m) => m.term === 'PO');
  assert.equal(po.plainReplacement, 'by mouth');
});

test('23. detectJargonMatches returns Spanish replacements when lang is es', () => {
  const matches = detectJargonMatches('Administer PO BID PRN dyspnea.', 'es');
  assert.equal(matches.length, 4);
  const po = matches.find((m) => m.term === 'PO');
  assert.equal(po.plainReplacement, 'por la boca');
});

test('24. computeReadabilityMetrics returns zeros for empty or punctuation-only text', () => {
  const m1 = computeReadabilityMetrics('');
  assert.equal(m1.wordCount, 0);
  assert.equal(m1.fleschKincaidGrade, 0);

  const m2 = computeReadabilityMetrics('... !!!');
  assert.equal(m2.wordCount, 0);
  assert.equal(m2.fleschKincaidGrade, 0);
});

test('25. computeReadabilityMetrics clamps minimum Flesch-Kincaid grade to 3.5', () => {
  const m = computeReadabilityMetrics('Take one pill by mouth now');
  assert.equal(m.sentenceCount, 1);
  assert.equal(m.fleschKincaidGrade, 3.5);
});

test('26. computeReadabilityMetrics clamps maximum Flesch-Kincaid grade to 18.0 on dense clinical prose', () => {
  const m = computeReadabilityMetrics(
    'Contraindicated nephrotoxicity hyperkalemia hypoglycemia orthostatic hypotension intercostal retractions anticoagulation arthroplasty malabsorption postprandial'
  );
  assert.equal(m.fleschKincaidGrade, 18.0);
});

test('27. dejargonizeClinicalText handles empty and null input in EN and ES', () => {
  const en = dejargonizeClinicalText('', 'en');
  assert.equal(en.lang, 'en');
  assert.equal(en.clarityGainPct, 0);

  const es = dejargonizeClinicalText(null, 'es');
  assert.equal(es.lang, 'es');
  assert.equal(es.clarityGainPct, 0);
});

test('28. dejargonizeClinicalText lowers pediatric-asthma-er grade level to Grade 5-6 in English', () => {
  const s = getScenarioById('pediatric-asthma-er');
  const res = dejargonizeClinicalText(s.rawClinicalNote, 'en');
  assert.ok(res.jargonCountBefore >= 6);
  assert.equal(res.jargonCountAfter, 0);
  assert.ok(res.gradeBefore > res.gradeAfter);
  assert.ok(res.gradeAfter >= 4.8 && res.gradeAfter <= 6.4);
  assert.ok(res.clarityGainPct >= 30);
});

test('29. dejargonizeClinicalText translates pediatric-asthma-er into Spanish with contextual phrase rules', () => {
  const s = getScenarioById('pediatric-asthma-er');
  const res = dejargonizeClinicalText(s.rawClinicalNote, 'es');
  assert.equal(res.lang, 'es');
  assert.ok(res.translatedText.includes('inhalador de dosis medida'));
  assert.ok(res.translatedText.includes('con el desayuno'));
  assert.ok(res.translatedText.includes('2 inhalaciones'));
  assert.ok(res.translatedText.includes('silbidos al respirar'));
});

test('30. dejargonizeClinicalText translates t2d-renal-titration in English and Spanish', () => {
  const s = getScenarioById('t2d-renal-titration');
  const en = dejargonizeClinicalText(s.rawClinicalNote, 'en');
  assert.ok(en.translatedText.includes('kidney filtration score (eGFR)'));
  assert.ok(en.translatedText.includes('3-month average blood sugar (HbA1c)'));

  const es = dejargonizeClinicalText(s.rawClinicalNote, 'es');
  assert.ok(es.translatedText.includes('con las comidas'));
  assert.ok(es.translatedText.includes('por la boca'));
});

test('31. dejargonizeClinicalText translates postop-anticoag-ortho and hypertensive-thyroid-sync in Spanish', () => {
  const ortho = getScenarioById('postop-anticoag-ortho');
  const orthoEs = dejargonizeClinicalText(ortho.rawClinicalNote, 'es');
  assert.ok(orthoEs.translatedText.includes('por dolor intenso'));
  assert.ok(orthoEs.translatedText.includes('por dolor'));

  const thyroid = getScenarioById('hypertensive-thyroid-sync');
  const thyroidEs = dejargonizeClinicalText(thyroid.rawClinicalNote, 'es');
  assert.ok(thyroidEs.translatedText.includes('con el estomago vacio'));
});

test('32. dejargonizeClinicalText handles short simple custom text without jargon', () => {
  const res = dejargonizeClinicalText('Take water daily.', 'en');
  assert.equal(res.jargonCountBefore, 0);
  assert.ok(res.gradeBefore > res.gradeAfter);
  assert.ok(res.clarityGainPct >= 18);
});

test('33. buildMedicationScheduleAndCollisions returns SAFE baseline when no OTC add-ons are active', () => {
  const report = buildMedicationScheduleAndCollisions('pediatric-asthma-er', [], 'en');
  assert.equal(report.collisionCount, 0);
  assert.equal(report.maxSeverityScore, 0);
  assert.equal(report.overallSafetyBand, 'SAFE');
  assert.equal(report.slots.length, 7);
  for (const slot of report.slots) {
    assert.equal(slot.hasCollision, false);
  }
});

test('34. buildMedicationScheduleAndCollisions handles non-array activeOtcIds safely', () => {
  const report = buildMedicationScheduleAndCollisions('pediatric-asthma-er', null, 'es');
  assert.equal(report.lang, 'es');
  assert.equal(report.collisionCount, 0);
});

test('35. buildMedicationScheduleAndCollisions flags CRITICALCONTRAINDICATION for Apixaban + Ibuprofen in EN and ES', () => {
  const en = buildMedicationScheduleAndCollisions(
    'postop-anticoag-ortho',
    ['otc-ibuprofen'],
    'en'
  );
  assert.equal(en.collisionCount, 1);
  assert.equal(en.collisions[0].code, COLLISION_TYPES.CRITICAL_CONTRAINDICATION);
  assert.equal(en.maxSeverityScore, 98);
  assert.equal(en.overallSafetyBand, 'CRITICAL');
  const slot08 = en.slots.find((s) => s.hour === '08:00');
  assert.equal(slot08.hasCollision, true);

  const es = buildMedicationScheduleAndCollisions(
    'postop-anticoag-ortho',
    ['otc-ibuprofen'],
    'es'
  );
  assert.ok(es.collisions[0].title.includes('Contraindicacion Critica'));
});

test('36. buildMedicationScheduleAndCollisions flags RENAL_TRIPLE_WHAMMY for T2D/CKD + Ibuprofen in EN and ES', () => {
  const en = buildMedicationScheduleAndCollisions(
    't2d-renal-titration',
    ['otc-ibuprofen'],
    'en'
  );
  assert.equal(en.collisionCount, 1);
  assert.equal(en.collisions[0].code, COLLISION_TYPES.RENAL_TRIPLE_WHAMMY);
  assert.equal(en.maxSeverityScore, 94);
  assert.equal(en.overallSafetyBand, 'CRITICAL');

  const es = buildMedicationScheduleAndCollisions(
    't2d-renal-titration',
    ['otc-ibuprofen'],
    'es'
  );
  assert.ok(es.collisions[0].title.includes('Peligro Renal'));
});

test('37. buildMedicationScheduleAndCollisions flags ABSORPTION_CHELATION for Levothyroxine + Calcium/Iron in EN and ES', () => {
  const en = buildMedicationScheduleAndCollisions(
    'hypertensive-thyroid-sync',
    ['otc-calcium-iron'],
    'en'
  );
  assert.equal(en.collisionCount, 1);
  assert.equal(en.collisions[0].code, COLLISION_TYPES.ABSORPTION_CHELATION);
  assert.equal(en.maxSeverityScore, 84);
  assert.equal(en.overallSafetyBand, 'HIGH');
  const slot06 = en.slots.find((s) => s.hour === '06:00');
  assert.equal(slot06.hasCollision, true);

  const es = buildMedicationScheduleAndCollisions(
    'hypertensive-thyroid-sync',
    ['otc-calcium-iron'],
    'es'
  );
  assert.ok(es.collisions[0].title.includes('Quelacion de Absorcion'));
});

test('38. buildMedicationScheduleAndCollisions flags HIGH SEDATION_STACK for Oxycodone + Diphenhydramine in EN and ES', () => {
  const en = buildMedicationScheduleAndCollisions(
    'postop-anticoag-ortho',
    ['otc-diphenhydramine'],
    'en'
  );
  assert.equal(en.collisions[0].code, COLLISION_TYPES.SEDATION_STACK);
  assert.equal(en.maxSeverityScore, 88);
  assert.equal(en.overallSafetyBand, 'HIGH');

  const es = buildMedicationScheduleAndCollisions(
    'postop-anticoag-ortho',
    ['otc-diphenhydramine'],
    'es'
  );
  assert.ok(es.collisions[0].title.includes('Acumulacion de Sedacion'));
});

test('39. buildMedicationScheduleAndCollisions flags MODERATE SEDATION_STACK for Diphenhydramine in non-opioid scenario', () => {
  const en = buildMedicationScheduleAndCollisions(
    'pediatric-asthma-er',
    ['otc-diphenhydramine'],
    'en'
  );
  assert.equal(en.collisions[0].code, COLLISION_TYPES.SEDATION_STACK);
  assert.equal(en.maxSeverityScore, 68);
  assert.equal(en.overallSafetyBand, 'MODERATE');

  const es = buildMedicationScheduleAndCollisions(
    'pediatric-asthma-er',
    ['otc-diphenhydramine'],
    'es'
  );
  assert.ok(es.collisions[0].title.includes('Alerta de Sedacion'));
});

test('40. buildMedicationScheduleAndCollisions flags CYP3A4 inhibition for Grapefruit Juice in ortho and thyroid scenarios', () => {
  const orthoEn = buildMedicationScheduleAndCollisions(
    'postop-anticoag-ortho',
    ['otc-grapefruit'],
    'en'
  );
  assert.equal(orthoEn.collisionCount, 1);
  assert.equal(orthoEn.maxSeverityScore, 79);
  assert.deepEqual(orthoEn.collisions[0].involvedAgents, [
    'Apixaban / Oxycodone',
    'Grapefruit Juice (CYP3A4 Inhibitor)'
  ]);

  const thyroidEs = buildMedicationScheduleAndCollisions(
    'hypertensive-thyroid-sync',
    ['otc-grapefruit'],
    'es'
  );
  assert.equal(thyroidEs.collisionCount, 1);
  assert.deepEqual(thyroidEs.collisions[0].involvedAgents, [
    'Amlodipine 5 mg PO',
    'Grapefruit Juice (CYP3A4 Inhibitor)'
  ]);
  assert.ok(thyroidEs.collisions[0].title.includes('CYP3A4'));
});

test('41. buildMedicationScheduleAndCollisions flags Prednisone + Ibuprofen gastric/asthma risk in pediatric-asthma-er', () => {
  const en = buildMedicationScheduleAndCollisions(
    'pediatric-asthma-er',
    ['otc-ibuprofen'],
    'en'
  );
  assert.equal(en.collisionCount, 1);
  assert.equal(en.maxSeverityScore, 76);
  assert.equal(en.overallSafetyBand, 'HIGH');

  const es = buildMedicationScheduleAndCollisions(
    'pediatric-asthma-er',
    ['otc-ibuprofen'],
    'es'
  );
  assert.ok(es.collisions[0].title.includes('Prednisona + Ibuprofeno'));
});

test('42. evaluateSymptomTriage returns ROUTINE HOME CARE with urgency 10 when no symptoms selected', () => {
  const en = evaluateSymptomTriage('pediatric-asthma-er', [], 'en');
  assert.equal(en.disposition, TRIAGE_DISPOSITIONS.ROUTINE);
  assert.equal(en.urgencyScore, 10);
  assert.equal(en.tone, 'safe');

  const es = evaluateSymptomTriage('pediatric-asthma-er', null, 'es');
  assert.ok(es.headline.includes('CUIDADO HABITUAL EN CASA'));
  assert.ok(es.rationale.includes('Ningun sintoma de alarma'));
});

test('43. evaluateSymptomTriage returns ROUTINE HOME CARE with urgency 24 when only routine symptom selected', () => {
  const en = evaluateSymptomTriage(
    'pediatric-asthma-er',
    ['sym-mild-jitter'],
    'en'
  );
  assert.equal(en.disposition, TRIAGE_DISPOSITIONS.ROUTINE);
  assert.equal(en.urgencyScore, 24);
  assert.equal(en.activeSymptomCount, 1);

  const es = evaluateSymptomTriage(
    'pediatric-asthma-er',
    ['sym-mild-jitter'],
    'es'
  );
  assert.ok(es.rationale.includes('Efecto secundario esperado'));
});

test('44. evaluateSymptomTriage returns SAME-DAY CLINIC CALL with urgency 62 for clinic-tier symptom', () => {
  const en = evaluateSymptomTriage(
    'pediatric-asthma-er',
    ['sym-night-cough'],
    'en'
  );
  assert.equal(en.disposition, TRIAGE_DISPOSITIONS.CLINIC);
  assert.equal(en.urgencyScore, 62);
  assert.equal(en.tone, 'caution');

  const es = evaluateSymptomTriage(
    'pediatric-asthma-er',
    ['sym-night-cough'],
    'es'
  );
  assert.ok(es.headline.includes('LLAME HOY MISMO'));
});

test('45. evaluateSymptomTriage returns IMMEDIATE EMERGENCY DEPARTMENT with urgency 95 for emergency symptom', () => {
  const en = evaluateSymptomTriage(
    'pediatric-asthma-er',
    ['sym-retractions', 'sym-night-cough'],
    'en'
  );
  assert.equal(en.disposition, TRIAGE_DISPOSITIONS.EMERGENCY);
  assert.equal(en.urgencyScore, 95);
  assert.equal(en.tone, 'critical');

  const es = evaluateSymptomTriage(
    'pediatric-asthma-er',
    ['sym-retractions'],
    'es'
  );
  assert.ok(es.headline.includes('URGENC'));
});

test('46. createInitialAppState initializes with pediatric-asthma-er in English', () => {
  const s = createInitialAppState();
  assert.equal(s.scenarioId, 'pediatric-asthma-er');
  assert.equal(s.lang, 'en');
  assert.equal(s.customText, '');
  assert.deepEqual(s.activeOtcIds, []);
  assert.deepEqual(s.selectedSymptomIds, []);
});

test('47. applyAppAction handles null state and invalid actions safely', () => {
  const fromNull = applyAppAction(null, null);
  assert.equal(fromNull.scenarioId, 'pediatric-asthma-er');
  const s = createInitialAppState();
  assert.equal(applyAppAction(s, { type: 'UNKNOWN' }), s);
});

test('48. applyAppAction SELECT_SCENARIO resets OTCs, symptoms, and customText', () => {
  let s = createInitialAppState();
  s = applyAppAction(s, { type: 'TOGGLE_OTC', otcId: 'otc-ibuprofen' });
  s = applyAppAction(s, { type: 'SET_CUSTOM_TEXT', text: 'CustomPO' });
  s = applyAppAction(s, {
    type: 'SELECT_SCENARIO',
    scenarioId: 't2d-renal-titration'
  });
  assert.equal(s.scenarioId, 't2d-renal-titration');
  assert.equal(s.customText, '');
  assert.deepEqual(s.activeOtcIds, []);
});

test('49. applyAppAction SET_LANGUAGE switches between en and es', () => {
  let s = createInitialAppState();
  s = applyAppAction(s, { type: 'SET_LANGUAGE', lang: 'es' });
  assert.equal(s.lang, 'es');
  s = applyAppAction(s, { type: 'SET_LANGUAGE', lang: 'en' });
  assert.equal(s.lang, 'en');
});

test('50. applyAppAction TOGGLE_OTC and TOGGLE_SYMPTOM add and remove IDs deterministically', () => {
  let s = createInitialAppState();
  s = applyAppAction(s, { type: 'TOGGLE_OTC', otcId: 'otc-ibuprofen' });
  assert.deepEqual(s.activeOtcIds, ['otc-ibuprofen']);
  s = applyAppAction(s, { type: 'TOGGLE_OTC', otcId: 'otc-ibuprofen' });
  assert.deepEqual(s.activeOtcIds, []);

  s = applyAppAction(s, { type: 'TOGGLE_SYMPTOM', symptomId: 'sym-retractions' });
  assert.deepEqual(s.selectedSymptomIds, ['sym-retractions']);
  s = applyAppAction(s, { type: 'TOGGLE_SYMPTOM', symptomId: 'sym-retractions' });
  assert.deepEqual(s.selectedSymptomIds, []);
});

test('51. buildUiViewState builds complete view state for preset and custom text in EN and ES', () => {
  const vDefault = buildUiViewState(null);
  assert.equal(vDefault.usingCustomText, false);
  assert.equal(vDefault.lang, 'en');

  let s = createInitialAppState();
  s = applyAppAction(s, { type: 'SET_LANGUAGE', lang: 'es' });
  const vEs = buildUiViewState(s);
  assert.equal(vEs.lang, 'es');
  assert.ok(vEs.departmentLabel.includes('Urgencias'));

  s = applyAppAction(s, {
    type: 'SET_CUSTOM_TEXT',
    text: 'Administer 5 mg PO BID PRN dyspnea.'
  });
  const vCustom = buildUiViewState(s);
  assert.equal(vCustom.usingCustomText, true);
  assert.ok(vCustom.plainPatientParagraph.includes('por la boca'));
});
