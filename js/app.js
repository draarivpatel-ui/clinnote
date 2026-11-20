/**
 * ClinNote clinical workstation UI controller
 * Drives bilingual EN/ES discharge de-jargonizing, 24-hour SVG dosing timeline,
 * OTC pharmacokinetic collision alerts, red-flag symptom triage, and refrigerator print view.
 */

import {
  CLINICAL_SCENARIOS,
  OTC_ADDONS,
  createInitialAppState,
  applyAppAction,
  buildUiViewState,
  verifyGeneratedText,
  buildAuditTrail,
  exportAuditTrail
} from './clinnote-engine.js';
import { runEvaluation, evaluateHeldOut } from './evaluation.js';

let appState = createInitialAppState();
let evaluationReport = null;
let lastClaimCheck = { results: [], total: 0, supported: 0, unsupported: 0, precision: 1 };
let draftAuditText = '';

function escapeHtml(raw) {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const MONO_STACK = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/**
 * Source note as markup: plain text is escaped, and every lexicon span becomes a
 * numbered, focusable <mark> carrying its term id and exact character range.
 * Overlapping spans (none occur with the current lexicon) are skipped, never merged.
 */
function renderProvenanceNote(text, spans) {
  const source = String(text || '');
  const kept = [];
  let html = '';
  let cursor = 0;
  for (const span of spans || []) {
    if (span.start < cursor) continue;
    kept.push(span);
    const n = kept.length;
    html += escapeHtml(source.slice(cursor, span.start));
    const negCls = span.negated ? ' is-negated' : '';
    html += `<mark class="prov-mark${negCls}" data-term-id="${escapeHtml(span.id)}" data-span-index="${n}" data-start="${span.start}" data-end="${span.end}" tabindex="0" title="${escapeHtml(`${span.term}: characters ${span.start} to ${span.end}${span.negated ? ' (negated)' : ''}`)}"><span class="prov-index" aria-hidden="true">${n}</span>${escapeHtml(span.text)}</mark>`;
    cursor = span.end;
  }
  html += escapeHtml(source.slice(cursor));
  return { html, kept };
}

let linkedTermId = null;
function setLinkedTerm(id) {
  if (linkedTermId === id) return;
  linkedTermId = id;
  document.querySelectorAll('[data-term-id]').forEach((el) => {
    el.classList.toggle('is-linked', id !== null && el.getAttribute('data-term-id') === id);
  });
}

const CLAIM_TYPE_LABELS = {
  medication: 'medication',
  lab: 'lab',
  dosage: 'dose',
  date: 'date'
};

function claimReasonText(r) {
  const c = r.claim;
  if (r.supported) {
    if (r.reason === 'exact-match') return 'exact text found in the source note';
    if (r.reason === 'subject-value-match') return `value ${c.value}${c.unit ? ` ${c.unit}` : ''} confirmed next to ${c.subject} in the source`;
    if (r.reason === 'subject-match') return 'subject found in the source note';
    return 'value found in the source note';
  }
  const found = Array.isArray(r.found) && r.found.length ? `; source shows ${r.found.slice(0, 4).join(', ')}` : '; nothing matching in the source';
  if (r.reason === 'unsupported') return 'subject not found anywhere in the source note';
  if (r.reason === 'unit-mismatch') return `claims ${c.unit}; source uses ${r.detail && r.detail.foundUnit ? r.detail.foundUnit : 'a different unit'} for ${c.subject}`;
  if (r.reason === 'date-mismatch') return `this date is not in the source${found}`;
  if (r.reason === 'lab-value-mismatch') return `claims ${c.value}${c.unit ? ` ${c.unit}` : ''} for ${c.subject}${found}`;
  return `claims ${c.value}${c.unit ? ` ${c.unit}` : ''}${found}`;
}

function claimSourceExcerpt(r, sourceText) {
  if (!r.spans || r.spans.length === 0) return '';
  const s = r.spans[0];
  const lo = Math.max(0, s.start - 24);
  const hi = Math.min(sourceText.length, s.end + 24);
  const before = escapeHtml(sourceText.slice(lo, s.start));
  const mid = escapeHtml(sourceText.slice(s.start, s.end));
  const after = escapeHtml(sourceText.slice(s.end, hi));
  return `<span class="claim-excerpt mono-text" aria-label="source excerpt">${lo > 0 ? '&hellip;' : ''}${before}<mark class="claim-src-mark">${mid}</mark>${after}${hi < sourceText.length ? '&hellip;' : ''}</span>`;
}

/** Output text with unsupported claims wrapped in flagged <mark> badges. */
function renderPlainOutputWithClaims(text, claimCheck) {
  const source = String(text || '');
  const flagged = (claimCheck.results || [])
    .map((r, i) => ({ ...r, idx: i }))
    .filter((r) => !r.supported)
    .sort((a, b) => a.claimStart - b.claimStart);
  let html = '';
  let cursor = 0;
  for (const r of flagged) {
    if (r.claimStart < cursor) continue;
    html += escapeHtml(source.slice(cursor, r.claimStart));
    html += `<mark class="claim-flag" data-claim-idx="${r.idx}" tabindex="0" title="${escapeHtml(`flagged: ${r.reason}`)}">${escapeHtml(source.slice(r.claimStart, r.claimEnd))}</mark>`;
    cursor = r.claimEnd;
  }
  html += escapeHtml(source.slice(cursor));
  return html;
}

function renderClaimCheckPanel(claimCheck, sourceText, isEs) {
  const results = claimCheck.results || [];
  const flagged = results.filter((r) => !r.supported);
  setText('claim-check-summary', results.length === 0
    ? (isEs
      ? 'No se encontraron afirmaciones numericas en esta salida.'
      : 'No checkable numeric claims found in this output.')
    : (isEs
      ? `${results.length} afirmaciones verificadas, ${flagged.length} marcadas.`
      : `${results.length} claims checked, ${flagged.length} flagged.`));
  if (results.length === 0) {
    setHtml('claim-check-list', `<li class="claim-row claim-row-empty" data-status="verified"><span class="claim-detail">${
      isEs ? 'No hay nada que verificar en esta salida.' : 'Nothing to verify in this output.'
    }</span></li>`);
    return;
  }
  const rowsHtml = results
    .map((r, i) => {
      const status = r.supported ? 'verified' : 'flagged';
      const typeLabel = CLAIM_TYPE_LABELS[r.claim.type] || 'claim';
      const excerpt = claimSourceExcerpt(r, sourceText);
      return `
      <li class="claim-row" data-status="${status}">
        <button type="button" class="claim-row-btn" data-claim-idx="${i}" aria-label="${escapeHtml(`${status} claim: ${r.claim.raw}`)}">
          <span class="claim-row-top">
            <span class="claim-raw mono-text">${escapeHtml(r.claim.raw)}</span>
            <span class="claim-kind">${escapeHtml(typeLabel)}</span>
            <span class="claim-pill" data-state="${status}">${status === 'flagged' ? 'flagged' : 'verified'}</span>
          </span>
          <span class="claim-detail">${escapeHtml(claimReasonText(r))}</span>
          ${excerpt}
        </button>
      </li>`;
    })
    .join('');
  setHtml('claim-check-list', rowsHtml);
}

function deferUnjump(el, classes) {
  const clear = () => classes.forEach((c) => el.classList.remove(c));
  if (typeof setTimeout === 'function') {
    setTimeout(clear, 1500);
  } else {
    clear();
  }
}

/** Jump from a claim row or flag badge to the matching span in the source note. */
function jumpToClaimSource(idx) {
  const r = (lastClaimCheck.results || [])[idx];
  const noteBox = document.getElementById('raw-clinical-note-display');
  const row = document.querySelector(`[data-claim-idx="${idx}"]`);
  if (row && row.classList) {
    row.classList.add('is-jump');
    deferUnjump(row, ['is-jump']);
  }
  if (!noteBox) return;
  let target = null;
  if (r && Array.isArray(r.spans) && r.spans.length > 0) {
    const s = r.spans[0];
    const marks = document.querySelectorAll('[data-start]');
    for (const el of marks) {
      const ms = Number(el.getAttribute('data-start'));
      const me = Number(el.getAttribute('data-end'));
      if (Number.isFinite(ms) && Number.isFinite(me) && ms <= s.end && me >= s.start) {
        target = el;
        break;
      }
    }
  }
  const host = target || noteBox;
  if (typeof host.scrollIntoView === 'function') {
    host.scrollIntoView({ block: 'center' });
  }
  host.classList.add(target ? 'is-jump' : 'is-jump-flash');
  deferUnjump(host, ['is-jump', 'is-jump-flash']);
}

/** Build and download the audit trail; returns the payload so tests can read it. */
function downloadAuditTrail(format, view) {
  const auditedView = draftAuditText.trim()
    ? { ...view, plainPatientParagraph: draftAuditText }
    : view;
  const entries = buildAuditTrail(auditedView);
  const payload = exportAuditTrail(entries, format);
  if (
    typeof URL !== 'undefined'
    && typeof URL.createObjectURL === 'function'
    && typeof Blob !== 'undefined'
    && typeof document !== 'undefined'
    && typeof document.createElement === 'function'
  ) {
    const mime = format === 'csv' ? 'text/csv' : 'application/json';
    const blob = new Blob([payload], { type: `${mime};charset=utf-8` });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `clinnote-audit.${format === 'csv' ? 'csv' : 'json'}`;
    a.click();
    if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(a.href);
  }
  return payload;
}

function barRow(label, value, tone, max = 1) {
  const v = Number(value);
  const pct = Math.max(0, Math.min(100, (v / max) * 100));
  return `
    <div class="bar-row" data-tone="${escapeHtml(tone)}">
      <span class="bar-label">${escapeHtml(label)}</span>
      <span class="bar-track" aria-hidden="true"><span class="bar-fill" style="width:${pct.toFixed(1)}%"></span></span>
      <span class="bar-value tabular-nums">${escapeHtml(v.toFixed(4))}</span>
    </div>`;
}

function renderEvalBoard() {
  const h = evaluateHeldOut();
  const dev = runEvaluation({ nowFn: () => 0, repeats: 1 });
  const e = h.engine;
  const c = h.capsBaseline;
  const z = h.echoBaseline;

  setHtml('eval-glance', `
    <div class="glance-figure">
      <strong class="glance-number tabular-nums">${escapeHtml(e.f1.toFixed(4))}</strong>
      <span class="glance-unit">F1 on ${h.notes} unseen notes</span>
    </div>
    <div class="bar-group" role="img" aria-label="Held-out F1. ClinNote ${escapeHtml(e.f1.toFixed(4))}, capitals baseline ${escapeHtml(c.f1.toFixed(4))}, echo baseline ${escapeHtml(z.f1.toFixed(4))}.">
      ${barRow('ClinNote', e.f1, 'engine')}
      ${barRow('Capitals rule', c.f1, 'caps')}
      ${barRow('Echo note', z.f1, 'echo')}
    </div>
    <p class="glance-note">Twelve new discharge notes, labeled before the first run and never used for tuning. A rule that flags any token with two capital letters finds ${c.tp} terms to ClinNote's ${e.tp}, so detection alone is close to a tie. The difference is that every term ClinNote finds comes with a plain explanation and its source span.</p>
    <dl class="glance-facts">
      <div><dt>Precision</dt><dd class="tabular-nums">${escapeHtml(e.precision.toFixed(4))}</dd></div>
      <div><dt>Recall</dt><dd class="tabular-nums">${escapeHtml(e.recall.toFixed(4))}</dd></div>
      <div><dt>False alarms</dt><dd class="tabular-nums">${e.fp}</dd></div>
      <div><dt>Labels found</dt><dd class="tabular-nums">${e.tp} of ${h.labels}</dd></div>
      <div><dt>Notes</dt><dd class="tabular-nums">${h.notes}</dd></div>
      <div><dt>Written</dt><dd class="tabular-nums">${escapeHtml(h.date)}</dd></div>
    </dl>`);

  const metricBlock = (title, key) => `
    <div class="metric-block">
      <span class="metric-block-title">${escapeHtml(title)}</span>
      <div class="bar-group">
        ${barRow('ClinNote', e[key], 'engine')}
        ${barRow('Capitals rule', c[key], 'caps')}
        ${barRow('Echo note', z[key], 'echo')}
      </div>
    </div>`;
  setHtml('heldout-chart', metricBlock('F1', 'f1') + metricBlock('Precision', 'precision') + metricBlock('Recall', 'recall'));
  setText('heldout-caption', `ClinNote finds ${e.tp} of ${h.labels} labeled terms with ${e.fp} false alarms. The capitals rule, which flags any token with two capital letters, finds ${c.tp} with ${c.fp}. Of the ${e.fn} terms ClinNote misses, ${e.missBreakdown.outOfLexicon} are not in its 38-term lexicon and ${e.missBreakdown.formVariant} are spelling variants of terms it knows, so the lexicon is the bottleneck. The capitals rule can only point at a term; ClinNote also explains it.`);

  const m = dev.metrics;
  const b = dev.baseline;
  const pair = (title, engineValue, baseValue) => `
    <div class="metric-block">
      <span class="metric-block-title">${escapeHtml(title)}</span>
      <div class="bar-group">
        ${barRow('ClinNote', engineValue, 'engine')}
        ${barRow('Echo baseline', baseValue, 'echo')}
      </div>
    </div>`;
  setHtml('devset-chart',
    pair('Term detection F1', m.termDetectionF1, b.termDetectionF1) +
    pair('Collision detection F1', m.collisionF1, b.collisionF1) +
    pair('Triage accuracy', m.triageAccuracy, b.triageAccuracy));

  const single = (title, value, note) => `
    <div class="metric-block">
      <span class="metric-block-title">${escapeHtml(title)}</span>
      <div class="bar-group">
        ${barRow('ClinNote', value, 'engine')}
      </div>
      <span class="metric-block-note">${escapeHtml(note)}</span>
    </div>`;
  setHtml('claim-eval-chart',
    single('Negation flag F1', m.negationF1, `precision ${m.negationPrecision.toFixed(4)} / recall ${m.negationRecall.toFixed(4)} on ${dev.corpus.negationCases} labeled notes`) +
    single('Claim catch rate', m.claimCatchRate, `${dev.tasks.claimCheck.actualFlags} flags on planted mismatches across ${dev.corpus.claimCheckCases} cases`) +
    single('Claim flag accuracy', m.claimFlagAccuracy, `exact flag count per case; false-flag rate ${m.claimFalseFlagRate.toFixed(4)}`));
  setText('claim-eval-caption', 'Every dose, lab value and date in the shown output is checked against the source note and flagged when the source does not support it. The negation set includes sentence, comma and pseudo-negation boundary traps so a cue cannot bleed across a clause.');

  const list = (items) => (items.length ? items.map((t) => `<span class="term-chip">${escapeHtml(t)}</span>`).join(' ') : '<span class="term-none">none</span>');
  setHtml('heldout-tbody', e.perCase.map((row, i) => `
    <tr class="lexicon-row">
      <td>${escapeHtml(row.label)}</td>
      <td>${list(row.hits)}</td>
      <td>${list(row.misses)}</td>
      <td>${list(c.perCase[i].misses)}</td>
    </tr>`).join(''));
  setText('heldout-rule', `Labeling rule: ${h.rule} Notes and labels were written on ${h.date}, after the engine and lexicon were frozen, and the score above is the first run. One author wrote both notes and labels.`);
  setText('impact-heldout-recall', `held-out recall ${e.recall.toFixed(4)}, ${e.fn} of ${h.labels} terms missed`);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = String(value);
  }
}

function setHtml(id, html) {
  const el = document.getElementById(id);
  if (el) {
    el.innerHTML = html;
  }
}

function renderSvgTimeline(scheduleReport) {
  const slots = scheduleReport.slots;
  const colWidth = 122;
  const startX = 48;
  const svgWidth = Math.max(890, startX + (slots.length - 1) * colWidth + 64);
  const svgHeight = 200;

  let nodesMarkup = '';
  slots.forEach((slot, idx) => {
    const cx = startX + idx * colWidth;
    const itemCount = slot.items.length;
    const isCollision = Boolean(slot.hasCollision);
    const hasItems = itemCount > 0;

    const strokeColor = isCollision
      ? '#C2352B'
      : hasItems
      ? '#14786A'
      : '#9AA8AA';
    const fillColor = isCollision
      ? '#FCEBE9'
      : hasItems
      ? '#E3F3EF'
      : '#FFFFFF';
    const textColor = isCollision
      ? '#9E2A22'
      : hasItems
      ? '#0E5C51'
      : '#5B6B70';

    const statusTag = isCollision
      ? 'COLLISION'
      : hasItems
      ? `${itemCount} DOSE${itemCount > 1 ? 'S' : ''}`
      : 'CLEAR';

    let pillPills = '';
    slot.items.slice(0, 3).forEach((item, pIdx) => {
      const py = 122 + pIdx * 22;
      const isOtc = Object.is(item.kind, 'OTC');
      const pillFill = isCollision
        ? '#C2352B'
        : isOtc
        ? '#9A520A'
        : '#123236';
      const shortLabel = escapeHtml(item.name.split(' ').slice(0, 2).join(' '));
      pillPills += `
        <g transform="translate(${cx - 52}, ${py})">
          <rect x="0" y="0" width="104" height="18" rx="3" fill="${pillFill}" />
          <text x="52" y="12.5" text-anchor="middle" fill="#FFFFFF" font-family="${MONO_STACK}" font-size="9.5" font-weight="600">${shortLabel}</text>
        </g>
      `;
    });

    nodesMarkup += `
      <g class="clock-node-group">
        <line x1="${cx}" y1="46" x2="${cx}" y2="112" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="${hasItems ? 'none' : '3 3'}" />
        <circle cx="${cx}" cy="76" r="${isCollision ? 20 : 17}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${isCollision ? 2.5 : 1.75}" />
        <text x="${cx}" y="34" text-anchor="middle" fill="#123236" font-family="${MONO_STACK}" font-size="12" font-weight="700">${slot.hour}</text>
        <text x="${cx}" y="80" text-anchor="middle" fill="${textColor}" font-family="${MONO_STACK}" font-size="11" font-weight="700">${itemCount}</text>
        <text x="${cx}" y="108" text-anchor="middle" fill="${textColor}" font-family="${MONO_STACK}" font-size="9" font-weight="600">${statusTag}</text>
        ${pillPills}
      </g>
    `;
  });

  return `
    <svg class="timeline-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-label="24-hour clinical medication dosing timeline from ${slots[0].hour} to ${slots[slots.length - 1].hour}">
      <rect x="8" y="8" width="${svgWidth - 16}" height="${svgHeight - 16}" rx="10" fill="#F5F8F8" stroke="#D9E2E3" stroke-width="1" />
      <line x1="${startX}" y1="76" x2="${startX + (slots.length - 1) * colWidth}" y2="76" stroke="#C9D5D6" stroke-width="2" />
      ${nodesMarkup}
    </svg>
  `;
}

function formatEvalNumber(value) {
  return Number(value).toFixed(4);
}

function renderEvaluation() {
  const clock =
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? () => performance.now()
      : () => Date.now();
  evaluationReport = runEvaluation({ nowFn: clock, repeats: 60 });
  const r = evaluationReport;
  const m = r.metrics;

  const metricCards = [
    { label: 'Term detection F1', value: formatEvalNumber(m.termDetectionF1), note: `Precision ${formatEvalNumber(m.termPrecision)} / Recall ${formatEvalNumber(m.termRecall)}` },
    { label: 'Term detection Brier', value: formatEvalNumber(m.termDetectionBrier), note: 'Lower is better (0 = exact)' },
    { label: 'Collision detection F1', value: formatEvalNumber(m.collisionF1), note: `${r.corpus.collisionCases} labeled regimens` },
    { label: 'Triage accuracy', value: formatEvalNumber(m.triageAccuracy), note: `F1 ${formatEvalNumber(m.triageF1)} / Brier ${formatEvalNumber(m.triageBrier)}` },
    { label: 'Negation flag F1', value: formatEvalNumber(m.negationF1), note: `${r.corpus.negationCases} labeled notes, case accuracy ${formatEvalNumber(m.negationAccuracy)}` },
    { label: 'Claim catch rate', value: formatEvalNumber(m.claimCatchRate), note: `Planted mismatches flagged across ${r.corpus.claimCheckCases} cases` },
    { label: 'Mean output formula score', value: m.meanGradeAfter.toFixed(2), note: `Mean source minus output ${m.meanGradeDrop.toFixed(2)}; Spanish estimate unvalidated` },
    { label: 'Latency per operation', value: `${m.meanMsPerOperation} ms`, note: `${m.meanMsPerFullSuite} ms for the full suite` },
    { label: 'Combined Brier', value: formatEvalNumber(m.combinedBrier), note: 'Mean of term and triage Brier' },
    { label: 'Failure probes confirmed', value: `${r.failureModes.filter((f) => f.status === 'confirmed').length}/${r.failureModes.length}`, note: 'Each condition is re-probed live' }
  ];
  setHtml(
    'eval-metrics-grid',
    metricCards
      .map(
        (c) => `
        <article class="eval-metric-card">
          <strong class="eval-metric-value tabular-nums">${escapeHtml(c.value)}</strong>
          <span class="eval-metric-label">${escapeHtml(c.label)}</span>
          <span class="eval-metric-note">${escapeHtml(c.note)}</span>
        </article>`
      )
      .join('')
  );

  setHtml(
    'eval-readability-tbody',
    r.tasks.readability.rows
      .map(
        (row) => `
        <tr class="lexicon-row">
          <td class="mono-cell">${escapeHtml(row.scenarioId)}</td>
          <td>${escapeHtml(row.lang.toUpperCase())}</td>
          <td class="tabular-nums">${escapeHtml(row.gradeBefore.toFixed(1))}</td>
          <td class="tabular-nums">${escapeHtml(row.gradeAfter.toFixed(1))}</td>
          <td class="tabular-nums">${escapeHtml(`${row.jargonBefore} -> ${row.jargonAfter}`)}</td>
        </tr>`
      )
      .join('')
  );

  const b = r.baseline;
  const cmp = r.comparison;
  setHtml(
    'eval-baseline-body',
    `
    <div class="eval-baseline-grid">
      <div class="eval-baseline-card">
        <h3 class="panel-heading">${escapeHtml(b.label)}</h3>
        <p>${escapeHtml(b.note)}</p>
        <ul class="eval-list">
          <li>Term detection F1: <strong class="tabular-nums">${b.termDetectionF1}</strong></li>
          <li>Collision detection F1: <strong class="tabular-nums">${b.collisionF1}</strong></li>
          <li>Triage accuracy: <strong class="tabular-nums">${b.triageAccuracy}</strong></li>
          <li>Triage F1: <strong class="tabular-nums">${b.triageF1}</strong></li>
          <li>Mean grade after: <strong>${escapeHtml(String(b.meanGradeAfter))}</strong></li>
          <li>Latency: <strong class="tabular-nums">${b.latencyMs} ms</strong> (no work performed)</li>
        </ul>
      </div>
      <div class="eval-baseline-card eval-gain-card">
        <h3 class="panel-heading">Measured gain over baseline</h3>
        <ul class="eval-list">
          <li>Term F1: <strong class="tabular-nums">+${cmp.termDetectionF1Gain}</strong></li>
          <li>Collision F1: <strong class="tabular-nums">+${cmp.collisionF1Gain}</strong></li>
          <li>Triage accuracy: <strong class="tabular-nums">+${cmp.triageAccuracyGain}</strong></li>
          <li>Triage F1: <strong class="tabular-nums">+${cmp.triageF1Gain}</strong></li>
        </ul>
        <p><strong>Cost:</strong> ${escapeHtml(cmp.cost)}</p>
        <p><strong>Latency trade-off:</strong> ${escapeHtml(cmp.latencyVsBaseline)}</p>
      </div>
    </div>
    <p class="eval-footnote">Corpus: ${r.corpus.termCases} term cases, ${r.corpus.collisionCases} collision cases, ${r.corpus.triageCases} triage cases, ${r.corpus.readabilityRows} readability rows, ${r.corpus.lexiconEntries} lexicon entries, ${r.corpus.otcAddons} OTC add-ons, ${r.corpus.scenarios} scenarios. Suite version ${escapeHtml(r.version)} dated ${escapeHtml(r.date)}.</p>`
  );

  setHtml(
    'eval-failures-body',
    `<p class="eval-intro">Every condition below is a real, probed limit of the engine. The suite executes each probe on every run and reports whether the documented behavior still holds.</p>
    <div class="eval-failures-list">
      ${r.failureModes
        .map(
          (f) => `
        <article class="eval-failure-card" data-status="${escapeHtml(f.status)}">
          <div class="eval-failure-head">
            <h3 class="eval-failure-title">${escapeHtml(f.title)}</h3>
            <span class="eval-status-pill">${escapeHtml(f.status)}</span>
          </div>
          <p><strong>Condition:</strong> ${escapeHtml(f.detail)}</p>
          <p><strong>Guardrail:</strong> ${escapeHtml(f.mitigation)}</p>
          <p class="eval-probe"><strong>Probe output:</strong> <span class="mono-text">${escapeHtml(JSON.stringify(f.observed))}</span></p>
        </article>`
        )
        .join('')}
    </div>`
  );

  const caseRows = [
    ...r.tasks.term.perCase.map((c) => ({
      label: c.label,
      expected: c.expected.join(', ') || '(none)',
      predicted: c.predicted.join(', ') || '(none)',
      correct: c.correct,
      extra: c.outOfScopeExpected.length
        ? `Out-of-lexicon misses: ${c.outOfScopeExpected.join(', ')}`
        : `TP ${c.tp} / FP ${c.fp} / FN ${c.fn}`
    })),
    ...r.tasks.collision.perCase.map((c) => ({
      label: c.label, expected: c.expected.join(', ') || '(none)', predicted: c.predicted.join(', ') || '(none)', correct: c.correct, extra: `Reported codes: ${c.allCodes ? c.allCodes.join(', ') || '(none)' : '(none)'}`
    })),
    ...r.tasks.triage.perCase.map((c) => ({
      label: c.label, expected: c.expected, predicted: c.predicted, correct: c.correct, extra: `Urgency ${c.urgencyScore}/100, ${c.activeSymptomCount} symptoms`
    })),
    ...r.tasks.negation.perCase.map((c) => ({
      label: c.label, expected: c.expected.join(', ') || '(none negated)', predicted: c.predicted.join(', ') || '(none flagged)', correct: c.correct, extra: `Negated term IDs: tp ${c.tp} / fp ${c.fp} / fn ${c.fn}`
    })),
    ...r.tasks.claimCheck.perCase.map((c) => ({
      label: c.label, expected: c.expected, predicted: c.predicted, correct: c.correct, extra: `Flag reasons: ${c.reasons.join(', ') || '(none)'}`
    }))
  ];
  setHtml(
    'eval-cases-tbody',
    caseRows
      .map(
        (c) => `
        <tr class="lexicon-row">
          <td>${escapeHtml(c.label)}<br/><span class="eval-row-extra">${escapeHtml(c.extra)}</span></td>
          <td class="mono-cell">${escapeHtml(c.expected)}</td>
          <td class="mono-cell">${escapeHtml(c.predicted)}</td>
          <td><span class="eval-result-pill" data-correct="${String(c.correct)}">${c.correct ? 'match' : 'miss'}</span></td>
        </tr>`
      )
      .join('')
  );

  setHtml(
    'eval-guardrails-body',
    `<ul class="eval-list eval-guardrail-list">${r.disclaimers
      .map((d) => `<li>${escapeHtml(d)}</li>`)
      .join('')}</ul>
    <p class="eval-footnote">This benchmark is runnable as <code>node scripts/run-evaluation.mjs</code> and is covered by automated unit and DOM tests. No number in this drawer is a decorative placeholder.</p>`
  );
}

function setActiveEvalTab(tabName, focusTab = false) {
  const tabs = document.querySelectorAll('[data-eval-tab]');
  tabs.forEach((tab) => {
    const active = tab.getAttribute('data-eval-tab') === tabName;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.setAttribute('tabindex', active ? '0' : '-1');
    if (active && focusTab) tab.focus();
  });
  const panels = {
    metrics: 'eval-panel-metrics',
    baseline: 'eval-panel-baseline',
    failures: 'eval-panel-failures',
    cases: 'eval-panel-cases',
    guardrails: 'eval-panel-guardrails'
  };
  for (const [name, id] of Object.entries(panels)) {
    const panel = document.getElementById(id);
    if (panel) panel.hidden = name !== tabName;
  }
}

function renderApp() {
  const view = buildUiViewState(appState);
  const isEs = Object.is(view.lang, 'es');

  const printButton = document.getElementById('print-fridge-sheet-btn');
  if (printButton) {
    printButton.disabled = view.usingCustomText;
    printButton.setAttribute('aria-disabled', String(view.usingCustomText));
  }
  setText('print-fridge-sheet-label', view.usingCustomText
    ? isEs ? 'Impresion desactivada para texto personalizado' : 'Print disabled for custom text'
    : isEs ? 'Imprimir hoja para el refrigerador' : 'Print Refrigerator Sheet');

  // Update language buttons
  document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
    const code = btn.getAttribute('data-lang-btn');
    const active = Object.is(code, view.lang);
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  // Update scenario tabs
  document.querySelectorAll('[data-scenario-tab]').forEach((btn) => {
    const id = btn.getAttribute('data-scenario-tab');
    const active = Object.is(id, view.scenarioId);
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', String(active));
  });

  // Scenario header & clinical notes
  setText('active-scenario-code', view.scenarioCode);
  setText('active-scenario-dept', view.departmentLabel);
  setText('active-scenario-title', view.scenarioTitle);
  setText('active-patient-context', view.patientContext);
  const provenance = renderProvenanceNote(view.rawClinicalNote, view.sourceSpans);
  setHtml('raw-clinical-note-display', provenance.html);
  linkedTermId = null;

  const draft = draftAuditText.trim();
  const auditedText = draft ? draftAuditText : view.plainPatientParagraph;
  lastClaimCheck = verifyGeneratedText(view.rawClinicalNote, auditedText);
  const auditBox = document.getElementById('claim-audit-text');
  if (draft) {
    setHtml('plain-patient-note-display', escapeHtml(view.plainPatientParagraph));
    if (auditBox) {
      setHtml('claim-audit-text', renderPlainOutputWithClaims(draftAuditText, lastClaimCheck));
      auditBox.hidden = false;
    }
    setText('claim-audit-mode', isEs
      ? 'Auditando tu borrador pegado, abajo:'
      : 'Auditing your pasted draft, shown below:');
  } else {
    setHtml('plain-patient-note-display', renderPlainOutputWithClaims(view.plainPatientParagraph, lastClaimCheck));
    if (auditBox) {
      auditBox.hidden = true;
      auditBox.innerHTML = '';
    }
    setText('claim-audit-mode', isEs
      ? 'Auditando la guia generada de arriba.'
      : 'Auditing the generated guide above.');
  }
  renderClaimCheckPanel(lastClaimCheck, view.rawClinicalNote, isEs);

  // Readability telemetry metrics
  setText('metric-grade-before', `Grade ${view.nlpAnalysis.gradeBefore.toFixed(1)}`);
  setText('metric-grade-after', `Grade ${view.nlpAnalysis.gradeAfter.toFixed(1)}`);
  const clarityGainPct = view.nlpAnalysis.clarityGainPct;
  setText('metric-clarity-gain', clarityGainPct === null
    ? 'n/a'
    : `${clarityGainPct > 0 ? '+' : ''}${clarityGainPct}%`);
  const clarityGainMetric = document.getElementById('metric-clarity-gain');
  if (clarityGainMetric) {
    clarityGainMetric.setAttribute('title', clarityGainPct === null
      ? isEs
        ? 'Porcentaje no disponible cuando el nivel de lectura de origen es cero o negativo.'
        : 'Percentage unavailable when the source reading grade is zero or negative.'
      : '');
  }
  setText(
    'metric-jargon-count',
    `${view.nlpAnalysis.jargonCountBefore} -> ${view.nlpAnalysis.jargonCountAfter} terms`
  );
  setText(
    'metric-syllable-density',
    `${view.nlpAnalysis.beforeMetrics.syllablesPerWord.toFixed(2)} -> ${view.nlpAnalysis.afterMetrics.syllablesPerWord.toFixed(2)} syl/w`
  );

  // Matched jargon glossary chips/table
  const matches = view.nlpAnalysis.matchedTerms;
  const negatedCount = provenance.kept.filter((s) => s.negated === true).length;
  setText('provenance-summary', `${provenance.kept.length} ${provenance.kept.length === 1 ? 'span' : 'spans'}, ${matches.length} ${matches.length === 1 ? 'term' : 'terms'}${negatedCount ? `, ${negatedCount} negated` : ''}`);
  if (matches.length > 0) {
    const spanIndex = new Map();
    provenance.kept.forEach((span, i) => {
      if (!spanIndex.has(span.id)) spanIndex.set(span.id, []);
      spanIndex.get(span.id).push({ n: i + 1, start: span.start, end: span.end, negated: span.negated === true });
    });
    const ordered = [...matches].sort((a, b) => {
      const sa = spanIndex.get(a.id);
      const sb = spanIndex.get(b.id);
      return (sa ? sa[0].n : 1e9) - (sb ? sb[0].n : 1e9);
    });
    const rowsHtml = ordered
      .map((m) => {
        const refs = spanIndex.get(m.id) || [];
        const chips = refs
          .map((r) => `<span class="span-chip tabular-nums${r.negated ? ' is-negated' : ''}"><b>${r.n}</b> ${r.start} to ${r.end}${r.negated ? ' <i>negated</i>' : ''}</span>`)
          .join('');
        return `
        <tr class="lexicon-row" data-term-id="${escapeHtml(m.id)}" tabindex="0">
          <td class="mono-cell"><span class="jargon-token">${escapeHtml(m.term)}</span><span class="term-class">${escapeHtml(m.category)}</span></td>
          <td class="plain-cell">${escapeHtml(m.plainReplacement)}</td>
          <td class="span-cell">${chips}</td>
        </tr>`;
      })
      .join('');
    setHtml('jargon-glossary-tbody', rowsHtml);
  } else {
    setHtml(
      'jargon-glossary-tbody',
      `<tr><td colspan="3" class="empty-cell">${
        isEs
          ? 'No se detectaron abreviaturas clinicas en este texto.'
          : 'No clinical jargon abbreviations detected in this text.'
      }</td></tr>`
    );
  }

  // Lab & Vitals Telemetry cards
  const labsHtml = view.labsAndVitals
    .map((lab) => {
      const toneClass = Object.is(lab.status, 'SAFE')
        ? 'status-safe'
        : 'status-caution';
      const explain = isEs ? lab.plainEs : lab.plainEn;
      return `
        <article class="lab-telemetry-item ${toneClass}">
          <div class="lab-item-header">
            <span class="lab-marker-name">${escapeHtml(lab.marker)}</span>
            <span class="lab-status-pill">${escapeHtml(lab.status)}</span>
          </div>
          <div class="lab-value-row">
            <strong class="lab-value-num">${escapeHtml(lab.value)}</strong>
            <span class="lab-target-range">Target: ${escapeHtml(lab.targetRange)}</span>
          </div>
          <p class="lab-plain-note">${escapeHtml(explain)}</p>
        </article>
      `;
    })
    .join('');
  setHtml('labs-telemetry-grid', labsHtml);

  // OTC Toggles
  const otcButtonsHtml = OTC_ADDONS.map((otc) => {
    const isChecked = view.activeOtcIds.includes(otc.id);
    const label = isEs ? otc.nameEs : otc.nameEn;
    return `
      <button
        type="button"
        class="otc-toggle-btn ${isChecked ? 'is-active' : ''}"
        data-otc-id="${escapeHtml(otc.id)}"
        aria-pressed="${String(isChecked)}"
      >
        <span class="otc-indicator" aria-hidden="true">${isChecked ? 'ON' : 'OFF'}</span>
        <span class="otc-label-group">
          <strong class="otc-title">${escapeHtml(label)}</strong>
          <span class="otc-sub">${escapeHtml(otc.classLabel)} : ${escapeHtml(otc.hours.join(', '))}</span>
        </span>
      </button>
    `;
  }).join('');
  setHtml('otc-toggles-container', otcButtonsHtml);

  // 24-Hour SVG Medication Clock/Timeline
  setHtml('medication-svg-stage', renderSvgTimeline(view.scheduleReport));

  // Detailed 24-Hour Schedule Slots
  const scheduleCardsHtml = view.scheduleReport.slots
    .map((slot) => {
      const collisionClass = slot.hasCollision
        ? 'slot-collision'
        : slot.items.length > 0
        ? 'slot-active'
        : 'slot-idle';
      const itemsList =
        slot.items.length > 0
          ? slot.items
              .map(
                (item) => `
              <li class="slot-med-item">
                <div class="slot-med-top">
                  <span class="slot-kind-badge kind-${item.kind.toLowerCase()}">${escapeHtml(item.kind)}</span>
                  <strong class="slot-med-name">${escapeHtml(item.name)}</strong>
                </div>
                <p class="slot-med-instruction">${escapeHtml(item.instruction)}</p>
              </li>
            `
              )
              .join('')
          : `<li class="slot-empty-note">${
              isEs ? 'Sin dosis programada' : 'No scheduled dose at this hour'
            }</li>`;

      return `
        <div class="schedule-hour-row ${collisionClass}">
          <div class="schedule-hour-stamp">
            <span class="clock-hour-num">${escapeHtml(slot.hour)}</span>
            ${
              slot.hasCollision
                ? `<span class="slot-alert-tag">${escapeHtml(slot.collisionCodes[0])}</span>`
                : ''
            }
          </div>
          <ul class="slot-med-list">${itemsList}</ul>
        </div>
      `;
    })
    .join('');
  setHtml('schedule-slots-list', scheduleCardsHtml);

  // Pharmacokinetic Collision Banner & Cards
  const safetyBandEl = document.getElementById('safety-band-badge');
  if (safetyBandEl) {
    safetyBandEl.textContent = `${view.scheduleReport.overallSafetyBand} (${view.scheduleReport.maxSeverityScore}/100)`;
    safetyBandEl.setAttribute(
      'data-band',
      view.scheduleReport.overallSafetyBand.toLowerCase()
    );
  }

  if (view.scheduleReport.collisions.length > 0) {
    const collisionsHtml = view.scheduleReport.collisions
      .map(
        (col) => `
        <article class="collision-alert-card band-${col.severityBand.toLowerCase()}">
          <h4 class="collision-card-title">${escapeHtml(col.title)}</h4>
          <div class="collision-card-head">
            <span class="collision-code-pill">${escapeHtml(col.code)}</span>
            <span class="collision-score-num">Severity ${col.severityScore}/100 at ${escapeHtml(col.collisionHours.join(', '))}</span>
          </div>
          <p class="collision-card-body">${escapeHtml(col.explanation)}</p>
          <p class="collision-card-directive"><strong>${
            isEs ? 'Accion Requerida:' : 'Clinical Action:'
          }</strong> ${escapeHtml(col.actionDirective)}</p>
        </article>
      `
      )
      .join('');
    setHtml('collision-alerts-list', collisionsHtml);
  } else {
    setHtml(
      'collision-alerts-list',
      `<div class="collision-safe-banner">
        <strong>${
          isEs
            ? '0 Colisiones Farmacocineticas Detectadas (Horario Seguro)'
            : '0 Pharmacokinetic Collisions Detected (Regimen Clear)'
        }</strong>
        <p>${
          isEs
            ? 'Las dosis recetadas estan separadas correctamente. Active cualquier suplemento o AINE arriba para simular interacciones.'
            : 'Prescribed doses are properly spaced. Toggle any OTC pain reliever, supplement, or beverage above to simulate collision checks.'
        }</p>
      </div>`
    );
  }

  // Red-Flag Symptom Triage Checkboxes
  const symptomsHtml = view.symptoms
    .map((sym) => {
      const checked = view.selectedSymptomIds.includes(sym.id);
      const label = isEs ? sym.labelEs : sym.labelEn;
      return `
        <button
          type="button"
          class="symptom-check-btn ${checked ? 'is-checked' : ''} tier-${sym.tier.toLowerCase()}"
          data-symptom-id="${escapeHtml(sym.id)}"
          aria-pressed="${String(checked)}"
        >
          <span class="symptom-tier-tag">${escapeHtml(sym.tier)}</span>
          <span class="symptom-label-text">${escapeHtml(label)}</span>
        </button>
      `;
    })
    .join('');
  setHtml('symptom-triage-options', symptomsHtml);

  // Triage Disposition Output
  const dispBox = document.getElementById('triage-disposition-panel');
  if (dispBox) {
    dispBox.setAttribute('data-tone', view.triageReport.tone);
  }
  setText('triage-disposition-code', view.triageReport.disposition);
  setText('triage-urgency-score', `${isEs ? 'Urgencia' : 'Urgency'} ${view.triageReport.urgencyScore}/100`);
  setText('triage-active-symptom-count', `${isEs ? 'Sintomas seleccionados' : 'Selected symptoms'} ${view.triageReport.activeSymptomCount}`);
  setText('triage-headline-text', view.triageReport.headline);
  setText('triage-rationale-text', view.triageReport.rationale);
  setText('triage-action-steps', view.triageReport.actionSteps);
  setText('triage-uncertainty-advice', isEs
    ? 'Si tiene dudas, llame a los servicios de emergencia (911).'
    : 'If in doubt, call emergency services (911).');

  // Printable Bilingual Refrigerator Sheet
  if (view.usingCustomText) {
    setText('print-sheet-title', isEs ? 'Hoja de medicamentos no disponible para texto personalizado' : 'Medication sheet unavailable for custom text');
    setText('print-sheet-plain-en', 'No refrigerator medication sheet is available for custom text. Ask a clinician or pharmacist to confirm your note and medication instructions.');
    setText('print-sheet-plain-es', 'No hay hoja de medicamentos para texto personalizado. Pida a un medico o farmaceutico que confirme su nota y las instrucciones de sus medicamentos.');
    setHtml('print-schedule-tbody', '');
    return;
  }
  setText('print-sheet-title', `${view.scenarioTitle} (${view.scenarioCode})`);
  setText('print-sheet-plain-en', getScenarioPlainByLang(view.scenarioId, 'en'));
  setText('print-sheet-plain-es', getScenarioPlainByLang(view.scenarioId, 'es'));

  const printMedRows = view.medications
    .map(
      (med) => `
      <tr>
        <td class="mono-cell">${escapeHtml(med.hours.join(', '))}</td>
        <td><strong>${escapeHtml(med.name)}</strong><br/><span>${escapeHtml(med.rawSig)}</span></td>
        <td>${escapeHtml(med.plainEn)}</td>
        <td>${escapeHtml(med.plainEs)}</td>
      </tr>
    `
    )
    .join('');
  setHtml('print-schedule-tbody', printMedRows);
}

function getScenarioPlainByLang(scenarioId, lang) {
  const found = CLINICAL_SCENARIOS.find((s) => Object.is(s.id, scenarioId));
  if (!found) {
    return '';
  }
  return Object.is(lang, 'es') ? found.curatedPlainEs : found.curatedPlainEn;
}

function dispatch(action) {
  appState = applyAppAction(appState, action);
  renderApp();
}

function bindEvents() {
  document.addEventListener('click', (event) => {
    const langBtn = event.target.closest('[data-lang-btn]');
    if (langBtn) {
      dispatch({
        type: 'SET_LANGUAGE',
        lang: langBtn.getAttribute('data-lang-btn')
      });
      return;
    }

    const scenarioBtn = event.target.closest('[data-scenario-tab]');
    if (scenarioBtn) {
      const customInput = document.getElementById('custom-discharge-textarea');
      if (customInput) {
        customInput.value = '';
      }
      dispatch({
        type: 'SELECT_SCENARIO',
        scenarioId: scenarioBtn.getAttribute('data-scenario-tab')
      });
      return;
    }

    const otcBtn = event.target.closest('[data-otc-id]');
    if (otcBtn) {
      dispatch({
        type: 'TOGGLE_OTC',
        otcId: otcBtn.getAttribute('data-otc-id')
      });
      return;
    }

    const symBtn = event.target.closest('[data-symptom-id]');
    if (symBtn) {
      dispatch({
        type: 'TOGGLE_SYMPTOM',
        symptomId: symBtn.getAttribute('data-symptom-id')
      });
      return;
    }

    const resetCustomBtn = event.target.closest('#reset-custom-text-btn');
    if (resetCustomBtn) {
      const customInput = document.getElementById('custom-discharge-textarea');
      if (customInput) {
        customInput.value = '';
      }
      dispatch({
        type: 'SET_CUSTOM_TEXT',
        text: ''
      });
      return;
    }

    const loadSampleBtn = event.target.closest('#load-sample-jargon-btn');
    if (loadSampleBtn) {
      const sampleText =
        'Discharge post arthroplasty. Administer Apixaban 2.5 mg PO BID q12h for anticoagulation. Give Acetaminophen 650 mg PO q6h PRN pain. NSAIDs are contraindicated due to nephrotoxicity and melena risk. Check SpO2 and eGFR; return for dyspnea, hemoptysis, or orthostatic hypotension.';
      const customInput = document.getElementById('custom-discharge-textarea');
      if (customInput) {
        customInput.value = sampleText;
      }
      dispatch({
        type: 'SET_CUSTOM_TEXT',
        text: sampleText
      });
      return;
    }

    const printBtn = event.target.closest('#print-fridge-sheet-btn');
    if (printBtn) {
      if (buildUiViewState(appState).usingCustomText) return;
      window.print();
      return;
    }

    const evalToggle = event.target.closest('#open-evaluation-btn');
    if (evalToggle) {
      const drawer = document.getElementById('evaluation-drawer');
      if (drawer) {
        const willOpen = drawer.hidden;
        drawer.hidden = !willOpen;
        evalToggle.setAttribute('aria-expanded', String(willOpen));
        if (willOpen) {
          renderEvaluation();
          setActiveEvalTab('metrics', true);
          const section = document.getElementById('evaluation-heading');
          if (section && typeof section.scrollIntoView === 'function') {
            section.scrollIntoView({ block: 'start' });
          }
        }
      }
      return;
    }

    const runEvalBtn = event.target.closest('#run-evaluation-btn');
    if (runEvalBtn) {
      renderEvalBoard();
      const drawer = document.getElementById('evaluation-drawer');
      const toggle = document.getElementById('open-evaluation-btn');
      if (drawer && drawer.hidden) {
        drawer.hidden = false;
        if (toggle) toggle.setAttribute('aria-expanded', 'true');
      }
      renderEvaluation();
      const activeTab = document.querySelector('[data-eval-tab][aria-selected="true"]');
      setActiveEvalTab(activeTab ? activeTab.getAttribute('data-eval-tab') : 'metrics', false);
      return;
    }

    const evalTab = event.target.closest('[data-eval-tab]');
    if (evalTab) {
      setActiveEvalTab(evalTab.getAttribute('data-eval-tab'), false);
      return;
    }

    const claimFilterBtn = event.target.closest('[data-claim-filter]');
    if (claimFilterBtn) {
      const filter = claimFilterBtn.getAttribute('data-claim-filter') || 'all';
      const list = document.getElementById('claim-check-list');
      if (list) list.setAttribute('data-filter', filter);
      document.querySelectorAll('[data-claim-filter]').forEach((btn) => {
        const active = btn.getAttribute('data-claim-filter') === filter;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
      });
      return;
    }

    const claimEl = event.target.closest('[data-claim-idx]');
    if (claimEl) {
      const idx = Number(claimEl.getAttribute('data-claim-idx'));
      if (Number.isFinite(idx)) jumpToClaimSource(idx);
      return;
    }

    const auditJsonBtn = event.target.closest('#audit-export-json-btn');
    if (auditJsonBtn) {
      downloadAuditTrail('json', buildUiViewState(appState));
      return;
    }

    const auditCsvBtn = event.target.closest('#audit-export-csv-btn');
    if (auditCsvBtn) {
      downloadAuditTrail('csv', buildUiViewState(appState));
      return;
    }

    const glossaryRow = event.target.closest('[data-term-id]');
    if (glossaryRow && glossaryRow.tagName === 'TR') {
      const id = glossaryRow.getAttribute('data-term-id');
      const firstMark = [...document.querySelectorAll('[data-term-id]')].find(
        (el) => el.tagName === 'MARK' && el.getAttribute('data-term-id') === id
      );
      if (firstMark) {
        firstMark.focus();
        setLinkedTerm(id);
      }
    }
  });

  const linkFromEvent = (event) => {
    const host = event.target && event.target.closest ? event.target.closest('[data-term-id]') : null;
    setLinkedTerm(host ? host.getAttribute('data-term-id') : null);
  };
  document.addEventListener('mouseover', linkFromEvent);
  document.addEventListener('focusin', linkFromEvent);

  document.addEventListener('keydown', (event) => {
    const tab = event.target.closest && event.target.closest('[data-eval-tab]');
    if (!tab) return;
    const tabs = [...document.querySelectorAll('[data-eval-tab]')];
    const idx = tabs.indexOf(tab);
    let next = -1;
    if (event.key === 'ArrowRight') next = (idx + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    setActiveEvalTab(tabs[next].getAttribute('data-eval-tab'), true);
  });

  const customInput = document.getElementById('custom-discharge-textarea');
  if (customInput) {
    customInput.addEventListener('input', (event) => {
      dispatch({
        type: 'SET_CUSTOM_TEXT',
        text: event.target.value
      });
    });
  }

  const draftInput = document.getElementById('draft-audit-textarea');
  if (draftInput) {
    draftInput.addEventListener('input', (event) => {
      draftAuditText = event.target.value || '';
      renderApp();
    });
  }
}

if (typeof document !== 'undefined') {
  if (Object.is(document.readyState, 'loading')) {
    document.addEventListener('DOMContentLoaded', () => {
      bindEvents();
      renderApp();
      renderEvalBoard();
    });
  } else {
    bindEvents();
    renderApp();
    renderEvalBoard();
  }
}
