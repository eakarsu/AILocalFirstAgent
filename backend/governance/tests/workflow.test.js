'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluate } = require('../domain');

test('domain workflow accepts a grounded reviewable case', () => {
  const evaluation = evaluate({
  run: { id: 'run1', inputVersion: 'in1', configVersion: 'cfg1', seed: 7, commitSha: 'a'.repeat(40),
    configSha256: 'b'.repeat(64), sandbox: { attestation: 'sandbox:1', networkDefaultDeny: true, cpuSeconds: 20, memoryMb: 512 } },
  steps: [{ id: 's1', type: 'read', toolVersion: 'git-1', inputSha256: 'c'.repeat(64) }],
  artifacts: [{ id: 'a1', type: 'report', sha256: 'd'.repeat(64), sourceStepId: 's1' }],
  evaluation: { fixtureVersion: 'fixture-1', correctness: 1, reliability: 1, latencyMs: 15,
    cost: 0, regressions: 0, providerFailures: 0, maxConcurrency: 1, recoveries: 0 },
  rerun: { originalRunId: 'run0', seed: 7, inputVersion: 'in1', artifactSetSha256: 'e'.repeat(64) }
});
  assert.deepEqual(evaluation.errors, []);
  assert.equal(evaluation.result.decision, 'reviewable');
  assert.ok(Array.isArray(evaluation.assumptions));
  assert.equal(typeof evaluation.uncertainty, 'object');
});

test('domain workflow fails closed on incomplete or unsafe input', () => {
  const evaluation = evaluate({ run: { id: 'r', sandbox: {} }, steps: [{ id: 's', type: 'propose_write', executed: true, secretValue: 'x' }], artifacts: [], evaluation: {}, rerun: {} });
  assert.ok(evaluation.errors.length > 0);
  assert.notEqual(evaluation.result.decision, 'reviewable');
});
