/**
 * DOM/UI tests for the ClinNote Evaluation drawer.
 *
 * A tiny, dependency-free DOM shim runs the real js/app.js controller, so the
 * tests exercise the actual event wiring, ARIA state, tab keyboard navigation,
 * and live metric rendering rather than a copy of the markup.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { inspectRepository } from './repository-hygiene.mjs';
import { CLINICAL_SCENARIOS } from '../js/clinnote-engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
const stylesCss = fs.readFileSync(path.join(repoRoot, 'styles.css'), 'utf8');
const appJs = fs.readFileSync(path.join(repoRoot, 'js/app.js'), 'utf8');
const evalJs = fs.readFileSync(path.join(repoRoot, 'js/evaluation.js'), 'utf8');
const engineJs = fs.readFileSync(path.join(repoRoot, 'js/clinnote-engine.js'), 'utf8');

function parseStaticIds(html) {
  return new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
}

/** Static attributes of each id-bearing tag, parsed from the raw HTML. */
function parseStaticAttrs(html) {
  const map = new Map();
  for (const m of html.matchAll(/<([a-zA-Z][\w-]*)([^>]*\bid="([^"]+)"[^>]*)>/gs)) {
    const tag = m[1];
    const id = m[3];
    const rest = m[2];
    const attrs = { tag };
    for (const a of rest.matchAll(/([:\w-]+)(?:="([^"]*)")?/g)) {
      attrs[a[1]] = a[2] === undefined ? '' : a[2];
    }
    if (/\bhidden\b/.test(rest)) attrs.hidden = '';
    map.set(id, attrs);
  }
  return map;
}

/** IDs of elements that carry the boolean `hidden` attribute in the raw HTML. */
function parseInitiallyHidden(html) {
  const set = new Set();
  for (const [id, attrs] of parseStaticAttrs(html)) {
    if ('hidden' in attrs) set.add(id);
  }
  return set;
}

/** Minimal element with the subset of the DOM API that js/app.js uses. */
class FakeElement {
  constructor(id, tag = 'div', attrs = {}) {
    this.id = id;
    this.tagName = tag.toUpperCase();
    this._attrs = { ...attrs };
    this._text = '';
    this._html = '';
    this.hidden = 'hidden' in this._attrs;
    this.children = [];
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
    // Supports the [data-*] and #id selectors used by js/app.js.
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
  const hiddenIds = parseInitiallyHidden(indexHtml);
  const attrMap = parseStaticAttrs(indexHtml);
  const elements = new Map();
  for (const id of ids) {
    const attrs = attrMap.get(id) || {};
    const el = new FakeElement(id, attrs.tag || 'div', attrs);
    if (hiddenIds.has(id)) el.hidden = true;
    elements.set(id, el);
  }

  const tabAttrs = [...indexHtml.matchAll(/<button[^>]*data-eval-tab="([^"]+)"[^>]*>/g)].map((m) => m[1]);
  for (const name of tabAttrs) {
    const el = elements.get(`eval-tab-${name}`);
    el._attrs['data-eval-tab'] = name;
  }
  const langBtns = ['en', 'es'].map((code) => {
    const el = new FakeElement(`lang-${code}`, 'button', { 'data-lang-btn': code });
    return el;
  });
  const scenarioBtns = [...indexHtml.matchAll(/data-scenario-tab="([^"]+)"/g)].map((m) =>
    new FakeElement(`scenario-${m[1]}`, 'button', { 'data-scenario-tab': m[1] })
  );
  const otcBtns = ['otc-ibuprofen', 'otc-calcium-iron', 'otc-diphenhydramine', 'otc-grapefruit'].map((id) =>
    new FakeElement(`otc-${id}`, 'button', { 'data-otc-id': id })
  );
  const toggles = [
    ['open-evaluation-btn', 'button'],
    ['run-evaluation-btn', 'button'],
    ['print-fridge-sheet-btn', 'button'],
    ['custom-discharge-textarea', 'textarea'],
    ['evaluation-drawer', 'div']
  ];

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
        .concat(langBtns, scenarioBtns, otcBtns)
        .filter((el) => clauses.every((c) => {
          const v = el.getAttribute(c[1]);
          return v !== null && (!c[2] || v === c[2]);
        }));
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    },
    addEventListener(type, fn) { (this._listeners[type] ||= []).push(fn); },
    fire(type, target, extra = {}) {
      const event = { type, target, preventDefault() { this.defaultPrevented = true; }, ...extra };
      for (const fn of this._listeners[type] || []) fn(event);
      return event;
    },
    printCalls: 0
  };
  for (const [id, tag] of toggles) {
    if (!elements.has(id)) elements.set(id, new FakeElement(id, tag));
  }
  // Wire parent links for closest() to climb from a nested span to its button.
  for (const el of [...langBtns, ...scenarioBtns, ...otcBtns]) el.parent = null;
  return documentShim;
}

function bootApp() {
  const doc = buildDocument();
  const sandbox = {
    document: doc,
    window: { print() { doc.printCalls += 1; }, addEventListener() {} },
    performance: { now: () => 0 },
    console,
    Date,
    JSON,
    Math,
    Set,
    Map,
    Object,
    Array,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    parseInt,
    parseFloat,
    isNaN
  };
  sandbox.globalThis = sandbox;
  const context = vm.createContext(sandbox);
  // Strip ESM import/export syntax so the controller body can run in a vm context.
  const strip = (src) => src
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^export\s+/gm, '');
  const composed = `${strip(engineJs)}\n${strip(evalJs)}\n${strip(appJs)}`;
  vm.runInContext(composed, context, { filename: 'clinnote-composed.js' });
  return { doc, context };
}

test('UI regression: custom notes disable printing and remove preset medications in both languages', () => {
  for (const scenario of CLINICAL_SCENARIOS) {
    for (const lang of ['en', 'es']) {
      const { doc } = bootApp();
      doc.fire('click', new FakeElement('scenario-control', 'button', { 'data-scenario-tab': scenario.id }));
      doc.fire('click', new FakeElement('language-control', 'button', { 'data-lang-btn': lang }));
      const button = doc.getElementById('print-fridge-sheet-btn');
      const input = doc.getElementById('custom-discharge-textarea');
      const label = doc.getElementById('print-fridge-sheet-label');
      label.parent = button;
      assert.equal(button.disabled, false);
      assert.equal(doc.getElementById('print-sheet-plain-en').textContent, scenario.curatedPlainEn);
      assert.equal(doc.getElementById('print-sheet-plain-es').textContent, scenario.curatedPlainEs);
      assert.match(doc.getElementById('print-schedule-tbody').innerHTML, /<tr>/);
      doc.fire('click', label);
      assert.equal(doc.printCalls, 1);

      input.value = 'Custom recovery note. Take 1 tablet PO BID.';
      input.fire('input');
      assert.equal(button.disabled, true);
      assert.equal(button.getAttribute('aria-disabled'), 'true');
      assert.equal(label.textContent, lang === 'es'
        ? 'Impresion desactivada para texto personalizado'
        : 'Print disabled for custom text');
      assert.match(doc.getElementById('print-sheet-plain-en').textContent, /custom text.*clinician or pharmacist/);
      assert.match(doc.getElementById('print-sheet-plain-es').textContent, /texto personalizado.*medico o farmaceutico/);
      assert.equal(doc.getElementById('print-schedule-tbody').innerHTML, '');
      assert.notEqual(doc.getElementById('print-sheet-plain-en').textContent, scenario.curatedPlainEn);
      assert.notEqual(doc.getElementById('print-sheet-plain-es').textContent, scenario.curatedPlainEs);
      doc.fire('click', label);
      assert.equal(doc.printCalls, 1, 'the handler must reject a synthetic click despite native disabled behavior');

      const otherLang = lang === 'es' ? 'en' : 'es';
      doc.fire('click', new FakeElement('other-language', 'button', { 'data-lang-btn': otherLang }));
      assert.equal(button.disabled, true);
      assert.equal(label.textContent, otherLang === 'es'
        ? 'Impresion desactivada para texto personalizado'
        : 'Print disabled for custom text');
      assert.equal(doc.getElementById('print-schedule-tbody').innerHTML, '');
      doc.fire('click', button);
      assert.equal(doc.printCalls, 1);

      doc.fire('click', doc.getElementById('reset-custom-text-btn'));
      assert.equal(button.disabled, false);
      assert.equal(button.getAttribute('aria-disabled'), 'false');
      assert.equal(input.value, '');
      assert.equal(doc.getElementById('print-sheet-plain-en').textContent, scenario.curatedPlainEn);
      assert.equal(doc.getElementById('print-sheet-plain-es').textContent, scenario.curatedPlainEs);
      assert.match(doc.getElementById('print-schedule-tbody').innerHTML, /<tr>/);
      doc.fire('click', button);
      assert.equal(doc.printCalls, 2);
    }
  }
});

test('UI regression: nonpositive source grades display n/a in both languages and reset for valid percentages', () => {
  for (const lang of ['en', 'es']) {
    const { doc } = bootApp();
    doc.fire('click', new FakeElement('language-control', 'button', { 'data-lang-btn': lang }));
    const input = doc.getElementById('custom-discharge-textarea');
    const metric = doc.getElementById('metric-clarity-gain');
    for (const value of ['BID', '...']) {
      input.value = value;
      input.fire('input');
      assert.equal(metric.textContent, 'n/a');
      assert.match(metric.getAttribute('title'), lang === 'es' ? /cero o negativo/ : /zero or negative/);
    }
    input.value = 'Take water daily.';
    input.fire('input');
    assert.equal(metric.textContent, '0%');
    assert.equal(metric.getAttribute('title'), '');
  }
});

test('UI regression: live symptom counts and uncertainty advice remain visible in every triage state and language', () => {
  for (const scenario of CLINICAL_SCENARIOS) {
    for (const lang of ['en', 'es']) {
      const { doc } = bootApp();
      doc.fire('click', new FakeElement('scenario-control', 'button', { 'data-scenario-tab': scenario.id }));
      doc.fire('click', new FakeElement('language-control', 'button', { 'data-lang-btn': lang }));
      const count = doc.getElementById('triage-active-symptom-count');
      const advice = doc.getElementById('triage-uncertainty-advice');
      const label = lang === 'es' ? 'Sintomas seleccionados ' : 'Selected symptoms ';
      const expectedAdvice = lang === 'es'
        ? 'Si tiene dudas, llame a los servicios de emergencia (911).'
        : 'If in doubt, call emergency services (911).';
      const assertTriage = (selected) => {
        assert.equal(count.textContent, label + selected);
        assert.equal(count.hidden, false);
        assert.equal(advice.hidden, false);
        assert.equal(advice.textContent, expectedAdvice);
        assert.equal(doc.getElementById('triage-disposition-panel').hidden, false);
      };
      assertTriage(0);
      for (const symptom of scenario.symptoms) {
        const control = new FakeElement('symptom-control', 'button', { 'data-symptom-id': symptom.id });
        doc.fire('click', control);
        assertTriage(1);
        doc.fire('click', control);
        assertTriage(0);
      }
      scenario.symptoms.forEach((symptom, i) => {
        doc.fire('click', new FakeElement('symptom-control', 'button', { 'data-symptom-id': symptom.id }));
        assertTriage(i + 1);
      });
    }
  }
});

test('Eval DOM 01: evaluation drawer, toggle, tabs and panels all exist in index.html', () => {
  const ids = parseStaticIds(indexHtml);
  for (const id of [
    'open-evaluation-btn', 'run-evaluation-btn', 'evaluation-drawer', 'evaluation-heading',
    'eval-metrics-grid', 'eval-readability-tbody', 'eval-baseline-body',
    'eval-failures-body', 'eval-cases-tbody', 'eval-guardrails-body',
    'eval-panel-metrics', 'eval-panel-baseline', 'eval-panel-failures',
    'eval-panel-cases', 'eval-panel-guardrails',
    'eval-tab-metrics', 'eval-tab-baseline', 'eval-tab-failures',
    'eval-tab-cases', 'eval-tab-guardrails'
  ]) assert.ok(ids.has(id), `missing #${id}`);
  assert.equal((indexHtml.match(/data-eval-tab=/g) || []).length, 5);
  assert.equal((indexHtml.match(/role="tabpanel"/g) || []).length, 5);
  assert.match(indexHtml, /aria-controls="evaluation-drawer"/);
  assert.match(indexHtml, /aria-expanded="false"/);
});

test('Eval DOM 02: every tab declares its panel and every panel is labelled by a tab', () => {
  for (const name of ['metrics', 'baseline', 'failures', 'cases', 'guardrails']) {
    const tabTag = indexHtml.match(new RegExp(`<button[^>]*id="eval-tab-${name}"[^>]*>`, 's'));
    const panelTag = indexHtml.match(new RegExp(`<div[^>]*id="eval-panel-${name}"[^>]*>`, 's'));
    assert.ok(tabTag, `missing tab tag for ${name}`);
    assert.ok(panelTag, `missing panel tag for ${name}`);
    assert.match(tabTag[0], new RegExp(`aria-controls="eval-panel-${name}"`));
    assert.match(panelTag[0], new RegExp(`aria-labelledby="eval-tab-${name}"`));
    assert.match(panelTag[0], /role="tabpanel"/);
    assert.match(tabTag[0], /role="tab"/);
  }
  assert.match(indexHtml, /role="tablist" aria-label="Evaluation report views"/);
});

test('Eval DOM 03: the drawer starts hidden and opens on toggle with metrics recomputed', () => {
  const { doc } = bootApp();
  const drawer = doc.getElementById('evaluation-drawer');
  const toggle = doc.getElementById('open-evaluation-btn');
  assert.equal(drawer.hidden, true);
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  doc.fire('click', toggle);
  assert.equal(drawer.hidden, false);
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  const grid = doc.getElementById('eval-metrics-grid');
  assert.ok(grid.innerHTML.length > 200, 'metrics were not rendered');
  assert.match(grid.innerHTML, /0\.9459/);
  assert.match(grid.innerHTML, /Term detection F1/);
  assert.match(grid.innerHTML, /Latency per operation/);
});

test('Eval DOM 04: all eight metric cards render real computed values, no placeholders', () => {
  const { doc } = bootApp();
  doc.fire('click', doc.getElementById('open-evaluation-btn'));
  const html = doc.getElementById('eval-metrics-grid').innerHTML;
  assert.equal((html.match(/eval-metric-card/g) || []).length, 8);
  assert.match(html, /Combined Brier/);
  assert.match(html, /Failure probes confirmed/);
  assert.equal(/TODO|lorem|placeholder|Coming soon/i.test(html), false);
});

test('Eval DOM 05: re-run button recomputes metrics and keeps the currently selected tab', () => {
  const { doc } = bootApp();
  doc.fire('click', doc.getElementById('open-evaluation-btn'));
  doc.fire('click', doc.getElementById('eval-tab-failures'));
  assert.equal(doc.getElementById('eval-panel-failures').hidden, false);
  doc.fire('click', doc.getElementById('run-evaluation-btn'));
  assert.match(doc.getElementById('eval-metrics-grid').innerHTML, /0\.9459/);
  assert.equal(doc.getElementById('eval-panel-failures').hidden, false);
  assert.equal(doc.getElementById('eval-panel-metrics').hidden, true);
});

test('Eval DOM 06: clicking a tab switches panels and ARIA selected state', () => {
  const { doc } = bootApp();
  doc.fire('click', doc.getElementById('open-evaluation-btn'));
  const casesTab = doc.getElementById('eval-tab-cases');
  doc.fire('click', casesTab);
  assert.equal(casesTab.getAttribute('aria-selected'), 'true');
  assert.equal(casesTab.getAttribute('tabindex'), '0');
  assert.equal(doc.getElementById('eval-tab-metrics').getAttribute('aria-selected'), 'false');
  assert.equal(doc.getElementById('eval-tab-metrics').getAttribute('tabindex'), '-1');
  assert.equal(doc.getElementById('eval-panel-cases').hidden, false);
  assert.equal(doc.getElementById('eval-panel-metrics').hidden, true);
});

test('Eval DOM 07: arrow, Home and End keys move tab focus with roving tabindex', () => {
  const { doc } = bootApp();
  doc.fire('click', doc.getElementById('open-evaluation-btn'));
  const metrics = doc.getElementById('eval-tab-metrics');
  const ev = doc.fire('keydown', metrics, { key: 'ArrowRight' });
  assert.equal(ev.defaultPrevented, true);
  assert.equal(doc.activeElement, doc.getElementById('eval-tab-baseline'));
  assert.equal(doc.getElementById('eval-panel-baseline').hidden, false);
  doc.fire('keydown', doc.getElementById('eval-tab-baseline'), { key: 'End' });
  assert.equal(doc.activeElement, doc.getElementById('eval-tab-guardrails'));
  doc.fire('keydown', doc.getElementById('eval-tab-guardrails'), { key: 'Home' });
  assert.equal(doc.activeElement, doc.getElementById('eval-tab-metrics'));
  doc.fire('keydown', doc.getElementById('eval-tab-metrics'), { key: 'ArrowLeft' });
  assert.equal(doc.activeElement, doc.getElementById('eval-tab-guardrails'));
});

test('Eval DOM 08: failure tab renders all eight probed conditions with status and mitigation', () => {
  const { doc } = bootApp();
  doc.fire('click', doc.getElementById('open-evaluation-btn'));
  const html = doc.getElementById('eval-failures-body').innerHTML;
  assert.equal((html.match(/eval-failure-card/g) || []).length, 8);
  assert.equal((html.match(/eval-status-pill/g) || []).length, 8);
  assert.match(html, /Negation is not resolved/);
  assert.match(html, /Guardrail:/);
  assert.match(html, /Probe output:/);
  assert.equal(/unexpected/.test(html), false);
});

test('Eval DOM 09: baseline tab renders exact baseline numbers and measured gains', () => {
  const { doc } = bootApp();
  doc.fire('click', doc.getElementById('open-evaluation-btn'));
  const html = doc.getElementById('eval-baseline-body').innerHTML;
  assert.match(html, /Naive baseline/);
  assert.match(html, /Term detection F1: <strong[^>]*>0/);
  assert.match(html, /\+0\.9459/);
  assert.match(html, /Cost:/);
  assert.match(html, /Zero network requests/);
  assert.match(html, /Corpus: 10 term cases/);
});

test('Eval DOM 10: case detail tab shows term, collision and triage cases with honest misses', () => {
  const { doc } = bootApp();
  doc.fire('click', doc.getElementById('open-evaluation-btn'));
  const html = doc.getElementById('eval-cases-tbody').innerHTML;
  assert.match(html, /Out-of-lexicon misses: SL, q3h, hematuria/);
  assert.match(html, /data-correct="false"/);
  assert.match(html, /IMMEDIATE EMERGENCY DEPARTMENT/);
  assert.match(html, /RENAL_TRIPLE_WHAMMY|CRITICALCONTRAINDICATION|ABSORPTION_CHELATION/);
  assert.ok((html.match(/eval-result-pill/g) || []).length >= 24);
});

test('Eval DOM 11: guardrails tab lists all disclaimers and names the CLI command', () => {
  const { doc } = bootApp();
  doc.fire('click', doc.getElementById('open-evaluation-btn'));
  const html = doc.getElementById('eval-guardrails-body').innerHTML;
  assert.match(html, /not clinical accuracy on real patient discharge notes/);
  assert.match(html, /not a diagnostic device/);
  assert.match(html, /node scripts\/run-evaluation\.mjs/);
  assert.equal((html.match(/<li>/g) || []).length >= 4, true);
});

test('Eval DOM 12: readability table has one row per scenario per language', () => {
  const { doc } = bootApp();
  doc.fire('click', doc.getElementById('open-evaluation-btn'));
  const html = doc.getElementById('eval-readability-tbody').innerHTML;
  assert.equal((html.match(/<tr class="lexicon-row">/g) || []).length, 8);
  assert.match(html, /pediatric-asthma-er/);
  assert.match(html, /t2d-renal-titration/);
  assert.match(html, />EN</);
  assert.match(html, />ES</);
});

test('Eval DOM 13: CSS provides mobile-responsive eval grids and zero-overflow guards', () => {
  assert.match(stylesCss, /html,\s*body\s*\{\s*overflow-x:\s*clip;/);
  assert.match(stylesCss, /@media \(max-width: 640px\)[\s\S]*?\.eval-metrics-grid,\s*\.eval-baseline-grid\s*\{\s*grid-template-columns: 1fr;/);
  assert.match(stylesCss, /@media \(max-width: 400px\)/);
  assert.match(stylesCss, /\.eval-tab:focus-visible/);
  assert.match(stylesCss, /\.evaluation-drawer\[hidden\],\s*\.eval-panel\[hidden\]\s*\{\s*display: none;/);
  assert.match(stylesCss, /font-variant-numeric:\s*tabular-nums/);
});

test('Eval DOM 14: no em-dashes, en-dashes, emoji, or uppercase transforms in new UI files', () => {
  for (const [name, src] of [['index.html', indexHtml], ['styles.css', stylesCss], ['js/app.js', appJs], ['js/evaluation.js', evalJs]]) {
    assert.equal(/[\u2013\u2014]/.test(src), false, `${name} contains a dash`);
    assert.equal(/text-transform\s*:\s*uppercase/i.test(src), false, `${name} has an uppercase transform`);
    assert.equal(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(src), false, `${name} has an emoji`);
  }
});

test('Eval DOM 15: repository text and binary asset metadata satisfy content hygiene', () => {
  assert.deepEqual(inspectRepository(repoRoot), []);
  assert.equal(/STEM2Connect/.test(indexHtml), false);
});

test('Eval DOM 16: print button still works after the evaluation drawer was added', () => {
  const { doc } = bootApp();
  doc.fire('click', doc.getElementById('open-evaluation-btn'));
  doc.fire('click', doc.getElementById('print-fridge-sheet-btn'));
  assert.equal(doc.printCalls, 1);
  assert.equal(doc.getElementById('evaluation-drawer').hidden, false);
});


test('Eval DOM 17: rendered telemetry reports actual retained terms and a signed change', () => {
  const { doc, context: ctx } = bootApp();
  const v = vm.runInContext('buildUiViewState(createInitialAppState())', ctx);
  assert.equal(doc.getElementById('metric-jargon-count').textContent, `${v.nlpAnalysis.jargonCountBefore} -> ${v.nlpAnalysis.jargonCountAfter} terms`);
  assert.ok(v.nlpAnalysis.jargonCountAfter > 0);
  doc.fire('click', doc.querySelectorAll('[data-lang-btn]')[1]);
  assert.match(doc.getElementById('metric-clarity-gain').textContent, /^-/);
});

test('Eval DOM 18: baseline rendering includes the real routine accuracy and gain', () => {
  const { doc } = bootApp();
  doc.fire('click', doc.getElementById('open-evaluation-btn'));
  assert.match(doc.getElementById('eval-baseline-body').innerHTML, /0\.4286/);
  assert.match(doc.getElementById('eval-baseline-body').innerHTML, /\+0\.5714/);
});

test('Eval DOM 19: dosing timeline renders every clock slot without clipping the final column', () => {
  const { context: ctx } = bootApp();
  const svg = vm.runInContext('renderSvgTimeline(buildMedicationScheduleAndCollisions("postop-anticoag-ortho"))', ctx);
  assert.match(svg, /00:00/);
  assert.match(svg, /22:00/);
  assert.equal((svg.match(/class="clock-node-group"/g) || []).length, 8);
  const width = Number(svg.match(/viewBox="0 0 (\d+)/)[1]);
  const finalX = 48 + 7 * 122;
  assert.ok(width > finalX + 52);
});
