'use strict';
function evaluate(input = {}) {
  const errors = [], run = input.run || {}, steps = input.steps || [], artifacts = input.artifacts || [];
  if (!run.id || !run.inputVersion || !run.configVersion || !Number.isInteger(run.seed) || !/^[a-f0-9]{40}$/i.test(run.commitSha || '') || !/^[a-f0-9]{64}$/i.test(run.configSha256 || '')) errors.push('versioned git input, configuration digest, and deterministic seed required');
  if (!run.sandbox?.attestation || run.sandbox.networkDefaultDeny !== true || !(run.sandbox.cpuSeconds > 0) || !(run.sandbox.memoryMb > 0)) errors.push('resource-capped default-deny sandbox required');
  for (const step of steps) {
    if (!step.id || !['read','evaluate','propose_write','provider_call'].includes(step.type) || !step.toolVersion || !step.inputSha256) errors.push(`step ${step.id || '?'} lacks typed versioned input`);
    if (step.type === 'propose_write' && (!step.approvalId || !step.diffSha256 || step.executed === true)) errors.push(`step ${step.id || '?'} write must remain approved proposal`);
    if (step.secretValue) errors.push(`step ${step.id || '?'} contains raw secret`);
    if (step.type === 'provider_call' && (!step.providerVersion || !step.idempotencyKey)) errors.push(`step ${step.id || '?'} provider boundary incomplete`);
    if (step.type === 'provider_call' && (step.queued !== true || step.executed === true)) errors.push(`step ${step.id || '?'} provider call must remain queued`);
  }
  const stepIds = new Set(steps.map((step) => String(step.id)));
  for (const artifact of artifacts) if (!artifact.id || !artifact.type || !/^[a-f0-9]{64}$/i.test(artifact.sha256 || '') || !stepIds.has(String(artifact.sourceStepId))) errors.push(`artifact ${artifact.id || '?'} lacks provenance/digest`);
  const metrics = input.evaluation || {};
  if (!metrics.fixtureVersion) errors.push('versioned evaluation fixture required');
  for (const key of ['correctness','reliability','latencyMs','cost','regressions','providerFailures','maxConcurrency','recoveries']) if (!Number.isFinite(Number(metrics[key]))) errors.push(`evaluation metric ${key} required`);
  const rerun = input.rerun || {};
  if (!rerun.originalRunId || rerun.seed !== run.seed || rerun.inputVersion !== run.inputVersion || !rerun.artifactSetSha256) errors.push('reproducible rerun identity required');
  return { errors, result: { stepCount: steps.length, artifactCount: artifacts.length, metrics,
    reproducible: !errors.some((e) => e.includes('rerun')), writesExecuted: steps.filter((s) => s.executed === true).length,
    decision: errors.length ? 'revise' : 'reviewable' },
    assumptions: ['repository and provider snapshots are authoritative only at capturedAt'],
    uncertainty: { sandboxImplementationNotIncluded: true, providerNondeterminismRequiresReplay: true, writeExecutionDisabled: true } };
}
module.exports = { evaluate };
