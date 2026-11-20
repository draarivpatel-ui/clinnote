import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CLINICAL_SCENARIOS,
  detectJargonMatches,
  locateJargonSpans
} from '../js/clinnote-engine.js';
import {
  GROUND_TRUTH_CASES,
  HELD_OUT_TERM_CASES,
  evaluateHeldOut,
  capsHeuristicTerms,
  normalizeSurface,
  runEvaluation
} from '../js/evaluation.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const allTexts = [
  ...CLINICAL_SCENARIOS.map((s) => s.rawClinicalNote),
  ...GROUND_TRUTH_CASES.map((c) => c.text),
  ...HELD_OUT_TERM_CASES.map((c) => c.text)
];

test('Spans 01: span counts per term equal detectJargonMatches occurrences on every text', () => {
  for (const text of allTexts) {
    const spans = locateJargonSpans(text);
    for (const m of detectJargonMatches(text)) {
      assert.equal(spans.filter((s) => s.id === m.id).length, m.occurrences, `${m.id} in ${text.slice(0, 30)}`);
    }
    assert.equal(spans.length, detectJargonMatches(text).reduce((n, m) => n + m.occurrences, 0));
  }
});

test('Spans 02: every span slices back to its surface text, in order, with no overlaps', () => {
  for (const text of allTexts) {
    let lastEnd = -1;
    for (const s of locateJargonSpans(text)) {
      assert.equal(text.slice(s.start, s.end), s.text);
      assert.ok(s.start >= lastEnd, `overlap at ${s.start}`);
      lastEnd = s.end;
    }
  }
  assert.deepEqual(locateJargonSpans(''), []);
  assert.deepEqual(locateJargonSpans(null), []);
});

test('Held-out 01: frozen held-out corpus is disjoint from the development corpus', () => {
  const devTexts = new Set(GROUND_TRUTH_CASES.map((c) => c.text));
  const devIds = new Set(GROUND_TRUTH_CASES.map((c) => c.id));
  assert.equal(HELD_OUT_TERM_CASES.length, 12);
  for (const c of HELD_OUT_TERM_CASES) {
    assert.equal(devTexts.has(c.text), false);
    assert.equal(devIds.has(c.id), false);
  }
});

test('Held-out 02: engine and baselines score exactly as first recorded', () => {
  const h = evaluateHeldOut();
  assert.equal(h.notes, 12);
  assert.equal(h.labels, 69);
  assert.deepEqual([h.engine.tp, h.engine.fp, h.engine.fn], [69, 0, 0]);
  assert.equal(h.engine.f1, 1);
  assert.equal(h.engine.recall, 1);
  assert.deepEqual([h.capsBaseline.tp, h.capsBaseline.fp, h.capsBaseline.fn], [39, 0, 30]);
  assert.equal(h.capsBaseline.f1, 0.7222);
  assert.equal(h.echoBaseline.f1, 0);
  assert.deepEqual(h.engine.missBreakdown, { formVariant: 0, outOfLexicon: 0 });
  assert.equal(runEvaluation({ nowFn: () => 0, repeats: 1 }).heldOut.engine.f1, 1);
});

test('Held-out 03: normalization and the capitals baseline behave as documented', () => {
  assert.equal(normalizeSurface('  b.i.d.  '), 'b.i.d');
  assert.equal(normalizeSurface('Orthostatic\n Hypotension,'), 'orthostatic hypotension');
  assert.deepEqual(capsHeuristicTerms('Take PO q4h; check SpO2 and eGFR, not Apixaban.').sort(), ['egfr', 'po', 'q4h', 'spo2']);
});

test('Offline 01: the page loads no external fonts, scripts or styles', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.equal(/fonts\.googleapis|fonts\.gstatic/.test(html), false);
  for (const m of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)) {
    assert.equal(/^https?:/i.test(m[1]), false, `external asset ${m[1]}`);
  }
  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  assert.equal(/https?:/.test(csp), false);
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  assert.equal(/@import|url\(\s*['"]?https?:/i.test(css), false);
});

test('Docs 01: README carries the Evaluation, Who benefits / harmed and Limitations sections', () => {
  const md = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  for (const h of ['## Evaluation', '## Who benefits / harmed', '## Limitations']) {
    assert.ok(md.includes(`\n${h}\n`), `missing ${h}`);
  }
});
