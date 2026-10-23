/**
 * ClinNote Swiss Medical Editorial Workbench UI Controller
 * Drives bilingual EN/ES discharge de-jargonizing, 24-hour SVG dosing timeline,
 * OTC pharmacokinetic collision alerts, red-flag symptom triage, and refrigerator print view.
 */

import {
  CLINICAL_SCENARIOS,
  OTC_ADDONS,
  createInitialAppState,
  applyAppAction,
  buildUiViewState
} from './clinnote-engine.js';

let appState = createInitialAppState();

function escapeHtml(raw) {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
  const svgWidth = 890;
  const svgHeight = 200;

  let nodesMarkup = '';
  slots.forEach((slot, idx) => {
    const cx = startX + idx * colWidth;
    const itemCount = slot.items.length;
    const isCollision = Boolean(slot.hasCollision);
    const hasItems = itemCount > 0;

    const strokeColor = isCollision
      ? '#C92A2A'
      : hasItems
      ? '#0D7A5F'
      : '#949B96';
    const fillColor = isCollision
      ? '#FDECEC'
      : hasItems
      ? '#E6F4EF'
      : '#F7F5F0';
    const textColor = isCollision
      ? '#9B1C1C'
      : hasItems
      ? '#095C47'
      : '#525B65';

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
        ? '#C92A2A'
        : isOtc
        ? '#C8640A'
        : '#111820';
      const shortLabel = escapeHtml(item.name.split(' ').slice(0, 2).join(' '));
      pillPills += `
        <g transform="translate(${cx - 52}, ${py})">
          <rect x="0" y="0" width="104" height="18" rx="3" fill="${pillFill}" />
          <text x="52" y="12.5" text-anchor="middle" fill="#F7F5F0" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="600">${shortLabel}</text>
        </g>
      `;
    });

    nodesMarkup += `
      <g class="clock-node-group">
        <line x1="${cx}" y1="46" x2="${cx}" y2="112" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="${hasItems ? 'none' : '3 3'}" />
        <circle cx="${cx}" cy="76" r="${isCollision ? 20 : 17}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${isCollision ? 2.5 : 1.75}" />
        <text x="${cx}" y="34" text-anchor="middle" fill="#111820" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700">${slot.hour}</text>
        <text x="${cx}" y="80" text-anchor="middle" fill="${textColor}" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700">${itemCount}</text>
        <text x="${cx}" y="108" text-anchor="middle" fill="${textColor}" font-family="JetBrains Mono, monospace" font-size="9" font-weight="600">${statusTag}</text>
        ${pillPills}
      </g>
    `;
  });

  return `
    <svg class="timeline-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-label="24-hour clinical medication dosing timeline from 06:00 to 22:00">
      <rect x="8" y="8" width="${svgWidth - 16}" height="${svgHeight - 16}" rx="6" fill="#EFECE4" stroke="#D5D0C5" stroke-width="1" />
      <line x1="${startX}" y1="76" x2="${startX + 6 * colWidth}" y2="76" stroke="#C5BFB2" stroke-width="2" />
      ${nodesMarkup}
    </svg>
  `;
}

function renderApp() {
  const view = buildUiViewState(appState);
  const isEs = Object.is(view.lang, 'es');

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
  setText('raw-clinical-note-display', view.rawClinicalNote);
  setText('plain-patient-note-display', view.plainPatientParagraph);

  // Readability telemetry metrics
  setText('metric-grade-before', `Grade ${view.nlpAnalysis.gradeBefore.toFixed(1)}`);
  setText('metric-grade-after', `Grade ${view.nlpAnalysis.gradeAfter.toFixed(1)}`);
  setText('metric-clarity-gain', `+${view.nlpAnalysis.clarityGainPct}%`);
  setText(
    'metric-jargon-count',
    `${view.nlpAnalysis.jargonCountBefore} terms -> 0`
  );
  setText(
    'metric-syllable-density',
    `${view.nlpAnalysis.beforeMetrics.syllablesPerWord.toFixed(2)} -> ${view.nlpAnalysis.afterMetrics.syllablesPerWord.toFixed(2)} syl/w`
  );

  // Matched jargon glossary chips/table
  const matches = view.nlpAnalysis.matchedTerms;
  if (matches.length > 0) {
    const rowsHtml = matches
      .map(
        (m) => `
        <tr class="lexicon-row">
          <td class="mono-cell"><span class="jargon-token">${escapeHtml(m.term)}</span></td>
          <td class="category-cell">${escapeHtml(m.category)}</td>
          <td class="plain-cell">${escapeHtml(m.plainReplacement)}</td>
        </tr>
      `
      )
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
  setText('triage-urgency-score', `Urgency ${view.triageReport.urgencyScore}/100`);
  setText('triage-headline-text', view.triageReport.headline);
  setText('triage-rationale-text', view.triageReport.rationale);
  setText('triage-action-steps', view.triageReport.actionSteps);

  // Printable Bilingual Refrigerator Sheet
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
      window.print();
    }
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
}

if (typeof document !== 'undefined') {
  if (Object.is(document.readyState, 'loading')) {
    document.addEventListener('DOMContentLoaded', () => {
      bindEvents();
      renderApp();
    });
  } else {
    bindEvents();
    renderApp();
  }
}
