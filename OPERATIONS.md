# Governed local-first agent operations

## Supported local boundary

The production-shaped path is `/api/governed-agent-runs`. It persists git/config versions and digests, deterministic seeds, resource-capped default-deny sandbox attestations, typed tool steps, write proposals, queued provider calls, artifact provenance, versioned evaluation fixtures, concurrency/recovery metrics, and rerun identity.

Validation forbids executed writes, raw secrets, unqueued provider calls, unknown artifact provenance, and incomplete reruns. The repository validates an attestation but does not provide a security sandbox.

## Authorization and write boundary

JWT and tenant configuration are mandatory. Analyst, commander, security reviewer, or admin may independently approve; self-approval is denied. Full exports/events are creator/approver/admin scoped. A proposed diff's approval ID is evidence only; this route has no write executor. External execution is available only as an approved outbox request and still requires a separately reviewed worker.

Idempotency keys are bound to canonical request SHA-256 digests. Raw credential fields are rejected. Demo authentication has no fallback account or plaintext comparison; optional seeds require an explicit scrypt hash.

## Lifecycle

- `./start.sh check` validates configuration only.
- `./start.sh start` requires preinstalled dependencies and starts only repository-owned processes.
- `ALLOW_SCHEMA_MIGRATION=true DATABASE_URL=... ./start.sh migrate` is the explicit schema path.
- Startup never installs dependencies, seeds, mutates schemas, kills ports, or starts global services. Demo seeding is forbidden in production and separately gated.

Existing local-first CRUD/backlog surfaces are not proof of sandboxed execution. Provider/tool execution remains closed unless the governed boundary and external controls are used.

## External systems and failure

Repository, CI/CD, model, telemetry, secret broker, artifact, and ticketing providers are allow-listed outbox identifiers only. No credentials, worker, sandbox, or provider adapter is bundled. A worker must verify tenant/repository scope, signed commit/diff/artifact digests, sandbox attestation, secret references, provider idempotency, checkpoints, and receipts. Five failures dead-letter; writes and provider calls remain unexecuted without approval and external implementation.

## Verification

Run `node --test backend/governance/tests/*.test.js`, exhaustive changed-code `node --check`, and `bash -n start.sh`. CI covers deterministic fixtures/reruns, sandbox/write/provider boundaries, tenant/RBAC, migration, idempotency mismatch, failure handling, and safe lifecycle without running tools, repos, CI, providers, databases, or generated code.

