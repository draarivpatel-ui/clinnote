import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SUPPORTED_LANGUAGES,
  CLINICAL_SCENARIOS,
  CLINICAL_LEXICON,
  OTC_ADDONS,
  createInitialAppState,
  applyAppAction,
  buildUiViewState
} from '../js/clinnote-engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
const stylesCss = fs.readFileSync(path.join(repoRoot, 'styles.css'), 'utf8');
const appJs = fs.readFileSync(path.join(repoRoot, 'js/app.js'), 'utf8');

test('DOM Smoke 01: index.html starts with HTML5 doctype and lang=en', () => {
  assert.match(indexHtml.trimStart(), /^<!DOCTYPE html>/i);
  assert.match(indexHtml, /<html\s+lang="en"/i);
});

test('DOM Smoke 02: index.html contains exactly one <h1> element', () => {
  const h1Matches = indexHtml.match(/<h1\b[^>]*>/gi) || [];
  assert.equal(h1Matches.length, 1);
});

test('DOM Smoke 03: heading hierarchy in index.html never skips levels', () => {
  const levels = [...indexHtml.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]));
  assert.ok(levels.length >= 10);
  assert.equal(levels[0], 1);
  for (let i = 1; i < levels.length; i += 1) {
    assert.ok(
      levels[i] <= levels[i - 1] + 1,
      `Heading level jumped from h${levels[i - 1]} to h${levels[i]}`
    );
  }
});

test('DOM Smoke 04: all id attributes in index.html are unique', () => {
  const ids = [...indexHtml.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(ids.length >= 25);
  const uniqueIds = new Set(ids);
  assert.equal(uniqueIds.size, ids.length, 'Duplicate IDs found in index.html');
});

test('DOM Smoke 05: OpenGraph and Twitter meta tags are complete', () => {
  assert.match(indexHtml, /property="og:title"\s+content="[^"]+"/);
  assert.match(indexHtml, /property="og:description"\s+content="[^"]+"/);
  assert.match(indexHtml, /property="og:type"\s+content="website"/);
  assert.match(indexHtml, /property="og:url"\s+content="https:\/\/[^"]+"/);
  assert.match(indexHtml, /name="twitter:card"\s+content="summary_large_image"/);
});

test('DOM Smoke 06: inline SVG favicon link is present in <head>', () => {
  assert.match(indexHtml, /<link\s+rel="icon"\s+type="image\/svg\+xml"\s+href="data:image\/svg\+xml,/);
});

test('DOM Smoke 07: accessible skip-link points to #main-workbench and target exists', () => {
  assert.match(indexHtml, /<a\s+href="#main-workbench"\s+class="skip-link">/);
  assert.match(indexHtml, /<main\s+id="main-workbench"/);
});

test('DOM Smoke 08: <noscript> fallback banner is present inside <body>', () => {
  assert.match(indexHtml, /<noscript>[\s\S]*?<div\s+class="noscript-banner"[\s\S]*?<\/noscript>/);
});

test('DOM Smoke 09: styles.css enforces overflow-x: clip on html and body', () => {
  assert.match(stylesCss, /html,\s*body\s*\{\s*overflow-x:\s*clip;/);
});

test('DOM Smoke 10: styles.css provides :focus-visible outline and reduced-motion guard', () => {
  assert.match(stylesCss, /:focus-visible\s*\{[\s\S]*?outline:/);
  assert.match(stylesCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test('DOM Smoke 11: styles.css enforces tabular-nums on numeric readouts', () => {
  assert.match(stylesCss, /font-variant-numeric:\s*tabular-nums/);
});

test('DOM Smoke 12: zero em-dashes or en-dashes across HTML, CSS, and UI JS', () => {
  assert.equal(/[\u2013\u2014]/.test(indexHtml), false);
  assert.equal(/[\u2013\u2014]/.test(stylesCss), false);
  assert.equal(/[\u2013\u2014]/.test(appJs), false);
});

test('DOM Smoke 13: zero emoji characters across HTML, CSS, and UI JS', () => {
  const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  assert.equal(emojiRegex.test(indexHtml), false);
  assert.equal(emojiRegex.test(stylesCss), false);
  assert.equal(emojiRegex.test(appJs), false);
});

test('DOM Smoke 14: zero uppercase CSS transforms in styles.css', () => {
  assert.equal(/text-transform\s*:\s*uppercase/i.test(stylesCss), false);
});

test('DOM Smoke 15: Content-Security-Policy enforces connect-src none for zero PHI cloud leakage', () => {
  assert.match(indexHtml, /http-equiv="Content-Security-Policy"[^>]*connect-src\s+'none'/);
});

test('DOM Smoke 16: both supported language buttons (en, es) exist in index.html', () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    assert.match(indexHtml, new RegExp(`data-lang-btn="${lang}"`));
  }
});

test('DOM Smoke 17: all 4 clinical scenario tab buttons in index.html match CLINICAL_SCENARIOS', () => {
  const tabIds = [...indexHtml.matchAll(/data-scenario-tab="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(tabIds.length, 4);
  assert.deepEqual(tabIds, CLINICAL_SCENARIOS.map((s) => s.id));
});

test('DOM Smoke 18: all DOM IDs updated via setText/setHtml in js/app.js exist in index.html', () => {
  const htmlIds = new Set([...indexHtml.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const boundIds = [...appJs.matchAll(/set(?:Text|Html)\(\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(boundIds.length >= 18);
  for (const id of boundIds) {
    assert.ok(htmlIds.has(id), `ID #${id} updated in js/app.js is missing from index.html`);
  }
});

test('DOM Smoke 19: all 38 clinical lexicon entries and 4 OTC add-ons are free of em/en-dashes', () => {
  assert.equal(CLINICAL_LEXICON.length, 38);
  assert.equal(OTC_ADDONS.length, 4);
  for (const entry of CLINICAL_LEXICON) {
    assert.equal(/[\u2013\u2014]/.test(entry.en), false);
    assert.equal(/[\u2013\u2014]/.test(entry.es), false);
  }
});

test('DOM Smoke 20: buildUiViewState produces complete view models across all 4 scenarios in EN and ES', () => {
  for (const scenario of CLINICAL_SCENARIOS) {
    for (const lang of SUPPORTED_LANGUAGES) {
      let state = createInitialAppState();
      state = applyAppAction(state, { type: 'SELECT_SCENARIO', scenarioId: scenario.id });
      state = applyAppAction(state, { type: 'SET_LANGUAGE', lang });
      const view = buildUiViewState(state);
      assert.equal(view.scenarioId, scenario.id);
      assert.equal(view.lang, lang);
      assert.ok(view.plainPatientParagraph.length > 30);
      assert.equal(view.scheduleReport.slots.length, 7);
    }
  }
});
