import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import {
  isNegatedContext,
  detectNegatedTerms,
  locateJargonSpans,
  extractClaims,
  verifyClaim,
  verifyGeneratedText,
  canonicalDateString,
  extractDateStrings,
  buildAuditTrail,
  exportAuditTrail,
  createInitialAppState,
  buildUiViewState
} from '../js/clinnote-engine.js';
import {
  GROUND_TRUTH_NEGATION,
  GROUND_TRUTH_CLAIM_CHECKS,
  evaluateNegation,
  evaluateClaimVerification,
  runEvaluation
} from '../js/evaluation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
const engineJs = fs.readFileSync(path.join(repoRoot, 'js/clinnote-engine.js'), 'utf8');
const evalJs = fs.readFileSync(path.join(repoRoot, 'js/evaluation.js'), 'utf8');
const appJs = fs.readFileSync(path.join(repoRoot, 'js/app.js'), 'utf8');

const neg = (text, term) => {
  const i = text.toLowerCase().indexOf(term.toLowerCase());
  return i === -1 ? 'term-missing' : isNegatedContext(text, i, term.length);
};

// --- Negation: multi-word and postposed cues the Wave 1 code missed ---

test('Wave2 Neg 01: multi-word cue phrases negate the term', () => {
  for (const [text, term] of [
    ['No history of dyspnea.', 'dyspnea'],
    ['No evidence of dyspnea.', 'dyspnea'],
    ['Workup rules out dyspnea.', 'dyspnea'],
    ['Examination ruled out bronchospasm.', 'bronchospasm'],
    ['Labs negative for hypoglycemia.', 'hypoglycemia'],
    ['Patient now free of dyspnea.', 'dyspnea'],
    ['Discharged without dyspnea.', 'dyspnea'],
    ['Denies any dyspnea or hemoptysis.', 'hemoptysis'],
    ['Noted absence of syncope.', 'syncope']
  ]) {
    assert.equal(neg(text, term), true, `${text} -> ${term}`);
  }
});

test('Wave2 Neg 02: postposed charting cues negate the term', () => {
  for (const [text, term] of [
    ['Resting comfortably; dyspnea denied.', 'dyspnea'],
    ['Dyspnea was denied on exam.', 'dyspnea'],
    ['Dyspnea was ruled out by imaging.', 'dyspnea'],
    ['Respiratory exam: dyspnea: negative.', 'dyspnea'],
    ['Dyspnea resolved overnight.', 'dyspnea'],
    ['Dyspnea, absent on exam.', 'dyspnea']
  ]) {
    assert.equal(neg(text, term), true, `${text} -> ${term}`);
  }
});

test('Wave2 Neg 03: cue scope cannot bleed across sentence or colon boundaries', () => {
  for (const [text, term] of [
    ['Culture negative for hypoglycemia. Dyspnea present.', 'dyspnea'],
    ['Answer: no. Dyspnea persists.', 'dyspnea'],
    ['Patient denies hemoptysis. Dyspnea noted on stairs.', 'dyspnea'],
    ['Fever resolved. Dyspnea noted.', 'dyspnea']
  ]) {
    assert.equal(neg(text, term), false, `${text} -> ${term}`);
  }
});

test('Wave2 Neg 04: bare commas end determiner scope but conjunctions do not', () => {
  assert.equal(neg('He has no fever, dyspnea is worsening.', 'dyspnea'), false);
  assert.equal(neg('No fever but dyspnea persists.', 'dyspnea'), false);
  assert.equal(neg('No fever, chills, or dyspnea.', 'dyspnea'), true);
  assert.equal(neg('Patient denies melena, hemoptysis, dyspnea.', 'dyspnea'), true);
});

test('Wave2 Neg 05: pseudo-negations are not flagged as negated', () => {
  for (const [text, term] of [
    ['Dyspnea not ruled out; workup continues.', 'dyspnea'],
    ['We cannot rule out dyspnea.', 'dyspnea'],
    ['Unable to rule out orthostatic hypotension.', 'orthostatic hypotension'],
    ['Monitor for dyspnea and melena.', 'dyspnea'],
    ['Return to the ED for dyspnea or hemoptysis.', 'dyspnea'],
    ['Patient reports dyspnea.', 'dyspnea']
  ]) {
    assert.equal(neg(text, term), false, `${text} -> ${term}`);
  }
});

test('Wave2 Neg 06: every labeled negation corpus case matches its authored set', () => {
  for (const c of GROUND_TRUTH_NEGATION) {
    const predicted = new Set(locateJargonSpans(c.text).filter((s) => s.negated).map((s) => s.id));
    const expected = new Set(c.negated);
    assert.deepEqual([...predicted].sort(), [...expected].sort(), `${c.id} ${c.label}`);
    for (const a of c.affirmed || []) assert.equal(predicted.has(a), false, `${c.id}: ${a} wrongly negated`);
  }
});

test('Wave2 Neg 07: negation evaluator reports perfect agreement on the frozen set', () => {
  const r = evaluateNegation();
  assert.equal(r.n, 26);
  assert.equal(r.f1, 1);
  assert.equal(r.accuracy, 1);
  assert.equal(r.fp, 0);
  assert.equal(r.fn, 0);
});

// --- Claim verification: proximity, lab values, units, dates ---

test('Wave2 Claim 01: subject match alone can no longer rescue a wrong dose', () => {
  const src = 'Metformin ER 500 mg PO BID. Lisinopril 10 mg PO QD.';
  const r = verifyClaim({ raw: 'Metformin 10 mg', subject: 'Metformin', value: 10, unit: 'mg' }, src);
  assert.equal(r.supported, false);
  assert.equal(r.reason, 'dosage-mismatch');
  assert.deepEqual(r.found, [500]);
});

test('Wave2 Claim 02: a dose borrowed from a neighboring drug is flagged, the right one verified', () => {
  const src = 'Metformin 500 mg PO BID. Lisinopril 10 mg PO QD.';
  const claims = extractClaims('Take Metformin 10 mg and Lisinopril 10 mg.');
  const report = verifyGeneratedText(src, 'Take Metformin 10 mg and Lisinopril 10 mg.');
  assert.equal(report.unsupported, 1);
  assert.equal(report.supported, 1);
  assert.ok(claims.length >= 2);
});

test('Wave2 Claim 03: lab value drift produces lab-value-mismatch with found values', () => {
  const r = verifyClaim({ type: 'lab', raw: 'A1c is 8.6%', subject: 'A1c', value: 8.6, unit: '%' }, 'HbA1c 7.8%, eGFR 52.');
  assert.equal(r.supported, false);
  assert.equal(r.reason, 'lab-value-mismatch');
  assert.deepEqual(r.found, [7.8]);
});

test('Wave2 Claim 04: lab subject aliases verify across naming variants', () => {
  const r = verifyClaim({ type: 'lab', raw: 'potassium of 4.9', subject: 'potassium', value: 4.9, unit: '' }, 'serum K+ 4.9 mEq/L, Mg 2.0.');
  assert.equal(r.supported, true);
  const r2 = verifyClaim({ type: 'lab', raw: 'A1c is 7.8%', subject: 'A1c', value: 7.8, unit: '%' }, 'HbA1c 7.8%.');
  assert.equal(r2.supported, true);
});

test('Wave2 Claim 05: unit confusion is flagged separately from value drift', () => {
  const r = verifyClaim({ raw: 'Levothyroxine 75 mg', subject: 'Levothyroxine', value: 75, unit: 'mg' }, 'Levothyroxine 75 mcg PO QAM.');
  assert.equal(r.supported, false);
  assert.equal(r.reason, 'unit-mismatch');
  assert.equal(r.detail.foundUnit, 'mcg');
});

test('Wave2 Claim 06: date drift and date equality are checked canonically', () => {
  const drift = verifyClaim({ type: 'date', subject: 'date', raw: '2026-11-28', value: null }, 'Follow-up on 2026-11-18.');
  assert.equal(drift.supported, false);
  assert.equal(drift.reason, 'date-mismatch');
  const same = verifyClaim({ type: 'date', subject: 'date', raw: '2026-11-18', value: null }, 'Follow-up on 2026-11-18.');
  assert.equal(same.supported, true);
  assert.equal(canonicalDateString('Nov 18, 2026'), '20261118');
  assert.equal(canonicalDateString('11/18/2026'), '20261118');
  assert.ok(extractDateStrings('Visit 2026-11-18 and Nov 19, 2026.').length === 2);
});

test('Wave2 Claim 07: a lab window stops at the neighboring lab subject', () => {
  const r = verifyClaim({ type: 'lab', raw: 'eGFR 48', subject: 'eGFR', value: 48, unit: '' }, 'HbA1c 7.8%, eGFR 52 mL/min/1.73m2.');
  assert.equal(r.supported, false);
  assert.equal(r.reason, 'lab-value-mismatch');
  assert.deepEqual(r.found, [52]);
});

test('Wave2 Claim 07b: a dose parked next to another drug never verifies', () => {
  const r = verifyClaim({ raw: 'Metformin 10 mg', subject: 'Metformin', value: 10, unit: 'mg' }, 'Metformin 500 mg, Lisinopril 10 mg.');
  assert.equal(r.supported, false);
  assert.equal(r.reason, 'dosage-mismatch');
  assert.deepEqual(r.found, [500]);
});

test('Wave2 Claim 08: thousands separators parse as real doses', () => {
  const report = verifyGeneratedText('Apixaban 2.5 mg PO BID.', 'Do not exceed 3,000 mg in 24 hours.');
  const claim = report.results.find((r) => r.claim.value === 3000);
  assert.ok(claim, 'expected a 3,000 mg dosage claim');
  assert.equal(claim.supported, false);
});

test('Wave2 Claim 09: every claim-check corpus case flags exactly the planted count', () => {
  for (const c of GROUND_TRUTH_CLAIM_CHECKS) {
    const report = verifyGeneratedText(c.source, c.generated);
    const flagged = report.results.filter((r) => !r.supported).length;
    assert.equal(flagged, c.expectedFlagged, `${c.id} ${c.label}`);
  }
  const r = evaluateClaimVerification();
  assert.equal(r.catchRate, 1);
  assert.equal(r.flagAccuracy, 1);
  assert.equal(r.falseFlagRate, 0);
});

// --- Audit trail carries claim-check entries ---

test('Wave2 Audit 01: audit trail includes claim-check rows for the shown output', () => {
  const view = buildUiViewState(createInitialAppState());
  const entries = buildAuditTrail(view);
  const claims = entries.filter((e) => e.category === 'claim-check');
  assert.ok(claims.length > 0, 'expected claim-check audit rows');
  for (const e of claims) {
    assert.ok(['verified', 'flagged'].includes(e.status));
    assert.ok(Object.prototype.hasOwnProperty.call(e, 'reason'));
  }
});

test('Wave2 Audit 02: csv export carries status and reason columns', () => {
  const view = buildUiViewState(createInitialAppState());
  const csv = exportAuditTrail(buildAuditTrail(view), 'csv');
  assert.match(csv, /^index,term,id,category,surface,start,end,negated,verified,status,reason\n/);
  assert.match(csv, /claim-check/);
});

// --- DOM wiring for the new panels ---

function parseStaticIds(html) {
  const ids = new Set();
  for (const m of html.matchAll(/\bid="([^"]+)"/g)) ids.add(m[1]);
  return ids;
}

class FakeElement {
  constructor(id, tag = 'div', attrs = {}) {
    this.id = id;
    this.tagName = tag.toUpperCase();
    this._attrs = { ...attrs };
    this._text = '';
    this._html = '';
    this.hidden = 'hidden' in this._attrs;
    this.listeners = {};
    this.style = {};
    this.classList = {
      _set: new Set(),
      add: (c) => this.classList._set.add(c),
      remove: (c) => this.classList._set.delete(c),
      contains: (c) => this.classList._set.has(c),
      toggle: (c, force) => {
        if (force === true) this.classList._set.add(c);
        else if (force === false) this.classList._set.delete(c);
        else if (this.classList._set.has(c)) this.classList._set.delete(c);
        else this.classList._set.add(c);
      }
    };
  }
  get textContent() { return this._text; }
  set textContent(v) { this._text = String(v); }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this._html = String(v); }
  getAttribute(k) { return this._attrs[k] === undefined ? null : String(this._attrs[k]); }
  setAttribute(k, v) { this._attrs[k] = String(v); }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  focus() { documentShim.activeElement = this; }
  closest(selector) {
    let node = this;
    while (node) {
      if (selector.startsWith('#') && node.id === selector.slice(1)) return node;
      const m = selector.match(/^\[([^\]=]+)(?:="([^"]+)")?\]$/);
      if (m && node.getAttribute(m[1]) !== null && (!m[2] || node.getAttribute(m[1]) === m[2])) return node;
      node = node.parent;
    }
    return null;
  }
  fire(type, extra = {}) {
    const event = { type, target: this, preventDefault() { this.defaultPrevented = true; }, ...extra };
    for (const fn of this.listeners[type] || []) fn(event);
    return event;
  }
}

let documentShim;

function buildDocument() {
  const ids = parseStaticIds(indexHtml);
  const elements = new Map();
  for (const id of ids) elements.set(id, new FakeElement(id, 'div', {}));
  const attrMap = new Map();
  for (const m of indexHtml.matchAll(/<(\w+)[^>]*\bid="([^"]+)"[^>]*>/g)) {
    const attrs = { tag: m[1].toLowerCase() };
    for (const a of m[0].matchAll(/([\w-]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    attrMap.set(m[2], attrs);
  }
  for (const [id, attrs] of attrMap) {
    if (elements.has(id)) {
      const el = new FakeElement(id, attrs.tag, attrs);
      elements.set(id, el);
      if ('hidden' in attrs) el.hidden = true;
    }
  }
  const langBtns = ['en', 'es'].map((code) => new FakeElement(`lang-${code}`, 'button', { 'data-lang-btn': code }));
  const scenarioBtns = [...indexHtml.matchAll(/data-scenario-tab="([^"]+)"/g)].map((m) =>
    new FakeElement(`scenario-${m[1]}`, 'button', { 'data-scenario-tab': m[1] })
  );
  const otcBtns = ['otc-ibuprofen', 'otc-calcium-iron', 'otc-diphenhydramine', 'otc-grapefruit'].map((id) =>
    new FakeElement(`otc-${id}`, 'button', { 'data-otc-id': id })
  );
  const claimBtns = [...indexHtml.matchAll(/data-claim-filter="([^"]+)"/g)].map((m) =>
    elements.get(`claim-filter-${m[1]}`) || new FakeElement(`claim-filter-${m[1]}`, 'button', { 'data-claim-filter': m[1] })
  );
  documentShim = {
    activeElement: null,
    readyState: 'complete',
    _elements: elements,
    _listeners: {},
    getElementById(id) { return elements.get(id) || null; },
    querySelectorAll(selector) {
      const clauses = [...selector.matchAll(/\[([^\]=]+)(?:="([^"]+)")?\]/g)];
      if (!clauses.length) return [];
      return [...elements.values()]
        .concat(langBtns, scenarioBtns, otcBtns, claimBtns)
        .filter((el) => clauses.every((c) => {
          const v = el.getAttribute(c[1]);
          return v !== null && (!c[2] || v === c[2]);
        }));
    },
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
    addEventListener(type, fn) { (this._listeners[type] ||= []).push(fn); },
    fire(type, target, extra = {}) {
      const event = { type, target, preventDefault() { this.defaultPrevented = true; }, ...extra };
      for (const fn of this._listeners[type] || []) fn(event);
      return event;
    },
    printCalls: 0
  };
  for (const el of [...langBtns, ...scenarioBtns, ...otcBtns]) el.parent = null;
  return documentShim;
}

function bootApp() {
  const doc = buildDocument();
  const sandbox = {
    document: doc,
    window: { print() { doc.printCalls += 1; }, addEventListener() {} },
    performance: { now: () => 0 },
    console, Date, JSON, Math, Set, Map, Object, Array, String, Number, Boolean, RegExp, Error,
    parseInt, parseFloat, isNaN
  };
  sandbox.globalThis = sandbox;
  const context = vm.createContext(sandbox);
  const strip = (src) => src
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^export\s+/gm, '');
  vm.runInContext(`${strip(engineJs)}\n${strip(evalJs)}\n${strip(appJs)}`, context, { filename: 'clinnote-composed.js' });
  return { doc, context };
}

test('Wave2 DOM 01: claim-check panel renders rows and a flagged claim gets a red pill', () => {
  const { doc } = bootApp();
  const input = doc.getElementById('custom-discharge-textarea');
  input.value = 'Apixaban 2.5 mg PO BID. Warfarin 5 mg never prescribed.';
  input.fire('input');
  const list = doc.getElementById('claim-check-list').innerHTML;
  assert.match(list, /claim-row/);
  assert.match(list, /data-state="verified"/);
  const summary = doc.getElementById('claim-check-summary').textContent;
  assert.match(summary, /claims checked/);
  assert.match(doc.getElementById('claim-audit-mode').textContent, /generated guide/);
  const draft = doc.getElementById('draft-audit-textarea');
  draft.value = 'Take Digoxin 5 mg daily.';
  draft.fire('input');
  assert.match(doc.getElementById('claim-check-list').innerHTML, /data-state="flagged"/);
  assert.match(doc.getElementById('claim-audit-mode').textContent, /pasted draft/);
});

test('Wave2 DOM 02: verified and flagged filter toggle updates the list and button state', () => {
  const { doc } = bootApp();
  doc.fire('click', doc.getElementById('claim-filter-flagged'));
  assert.equal(doc.getElementById('claim-check-list').getAttribute('data-filter'), 'flagged');
  assert.equal(doc.getElementById('claim-filter-flagged').getAttribute('aria-pressed'), 'true');
  doc.fire('click', doc.getElementById('claim-filter-verified'));
  assert.equal(doc.getElementById('claim-check-list').getAttribute('data-filter'), 'verified');
  assert.equal(doc.getElementById('claim-filter-flagged').getAttribute('aria-pressed'), 'false');
  doc.fire('click', doc.getElementById('claim-filter-all'));
  assert.equal(doc.getElementById('claim-check-list').getAttribute('data-filter'), 'all');
});

test('Wave2 DOM 03: flagged claim is marked inside the audited draft text', () => {
  const { doc } = bootApp();
  const input = doc.getElementById('custom-discharge-textarea');
  input.value = 'Apixaban 2.5 mg PO BID.';
  input.fire('input');
  const draft = doc.getElementById('draft-audit-textarea');
  draft.value = 'Take Warfarin 5 mg daily.';
  draft.fire('input');
  const auditText = doc.getElementById('claim-audit-text');
  assert.equal(auditText.hidden, false);
  assert.match(auditText.innerHTML, /claim-flag/);
  assert.match(doc.getElementById('claim-check-summary').textContent, /1 flagged/);
});

test('Wave2 DOM 04: audit export buttons exist and produce JSON and CSV payloads', () => {
  const { doc, context } = bootApp();
  assert.ok(doc.getElementById('audit-export-json-btn'));
  assert.ok(doc.getElementById('audit-export-csv-btn'));
  const json = vm.runInContext(`downloadAuditTrail('json', buildUiViewState(appState))`, context);
  const csv = vm.runInContext(`downloadAuditTrail('csv', buildUiViewState(appState))`, context);
  assert.ok(json.startsWith('['));
  assert.match(json, /claim-check/);
  assert.match(csv, /^index,term,id,category,surface,start,end,negated,verified,status,reason\n/);
});

test('Wave2 DOM 05: synthetic-example labels are present on presets and the meta strip', () => {
  assert.equal((indexHtml.match(/tab-synthetic/g) || []).length, 4);
  assert.match(indexHtml, /synthetic-badge/);
});

test('Wave2 DOM 06: eval board renders the negation and claim audit card', () => {
  const { doc } = bootApp();
  const chart = doc.getElementById('claim-eval-chart').innerHTML;
  assert.match(chart, /Negation flag F1/);
  assert.match(chart, /Claim catch rate/);
  assert.match(doc.getElementById('claim-eval-caption').textContent, /source note/);
});

test('Wave2 DOM 07: provenance summary reports negated spans', () => {
  const { doc } = bootApp();
  const input = doc.getElementById('custom-discharge-textarea');
  input.value = 'No dyspnea observed. Patient denies melena.';
  input.fire('input');
  assert.match(doc.getElementById('provenance-summary').textContent, /negated/);
});

test('Wave2 Eval 01: headline metrics carry the new audit scores', () => {
  const r = runEvaluation({ nowFn: () => 0, repeats: 2 });
  assert.equal(r.metrics.negationF1, 1);
  assert.equal(r.metrics.negationAccuracy, 1);
  assert.equal(r.metrics.claimCatchRate, 1);
  assert.equal(r.metrics.claimFlagAccuracy, 1);
  assert.equal(r.metrics.claimFalseFlagRate, 0);
  assert.equal(r.corpus.negationCases, 26);
  assert.equal(r.corpus.claimCheckCases, 10);
  assert.equal(r.failureModes.length, 10);
});
