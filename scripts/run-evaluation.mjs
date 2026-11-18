#!/usr/bin/env node
/**
 * ClinNote Evaluation & Failure-Mode Benchmark CLI.
 * Run: node scripts/run-evaluation.mjs
 * Optional: --json   prints the full machine-readable report
 *           --check  exits with code 1 if any regression threshold is breached
 */
import { performance } from 'node:perf_hooks';
import { runEvaluation, formatCliReport } from '../js/evaluation.js';

const args = new Set(process.argv.slice(2));
const report = runEvaluation({ nowFn: () => performance.now(), repeats: 200 });

if (args.has('--json')) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  process.stdout.write(`${formatCliReport(report)}\n`);
}

if (args.has('--check')) {
  const m = report.metrics;
  const thresholds = [
    ['termDetectionF1', m.termDetectionF1, 0.9],
    ['collisionF1', m.collisionF1, 0.95],
    ['triageAccuracy', m.triageAccuracy, 0.95],
    ['combinedBrier', 1 - m.combinedBrier, 0.9]
  ];
  const failures = thresholds.filter(([, value, min]) => value < min);
  const unexpected = report.failureModes.filter((f) => f.status !== 'confirmed');
  if (failures.length || unexpected.length) {
    for (const [name, value, min] of failures) {
      process.stderr.write(`FAIL ${name}: ${value} below floor ${min}\n`);
    }
    for (const f of unexpected) process.stderr.write(`FAIL failure probe ${f.id}: ${f.status}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write('\nCheck: all regression thresholds and failure probes passed.\n');
  }
}
