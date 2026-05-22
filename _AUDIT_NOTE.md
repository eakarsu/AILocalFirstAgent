# Audit Note — AILocalFirstAgent

Stack: Node + Express + React + Postgres + OpenRouter.
Domain: local-first AI agent — on-device/edge runtime, offline-capable, CRDT/sync, personal-data privacy.

## Cataloged (existing)

### AI endpoints (`backend/routes/ai.js`, 9)
- `POST /api/ai/local-task-plan`
- `POST /api/ai/file-semantic-search`
- `POST /api/ai/scheduled-macro`
- `POST /api/ai/draft-reply`
- `POST /api/ai/weekly-summary`
- `POST /api/ai/privacy-classifier`
- `POST /api/ai/model-router-select`
- `POST /api/ai/conflict-finder`
- `POST /api/ai/daily-digest`
- `GET /api/ai/samples`, `GET /api/ai/history`

### Non-AI routes
- `auth` (login, me, users), `dashboard`, `notifications`, `webhooks` (+deliveries), `attachments`
- CRUD via `_crudFactory`: `AgentRuns`, `FileIndexEntries`, `IndexedSources`, `OnDeviceModels`, `PrivacyAuditLog`, `ScheduledMacros`
- `customViews`: sync-timeline, conflict-heatmap, sync-log.pdf, rules CRUD

### Frontend pages (21)
AI pages for all 9 AI endpoints; CRUD pages for each entity; `MacroSchedulerWorkbench`, `TimelineView`, `CodexOperationsFeature`, `CodexCustomVizFeature`, `Dashboard`, `Login`.

### Schema (12 tables)
users, ai_results, notifications, attachments, webhooks, webhook_deliveries, indexed_sources, scheduled_macros, agent_runs, on_device_models, privacy_audit_log, file_index_entries.

## Gap Analysis

### AI gaps
- **COVERED** on-device task router → `model-router-select`
- **COVERED** sync-conflict resolver → `conflict-finder` (note: finder, not auto-resolver)
- **COVERED** privacy classifier → `privacy-classifier`
- **COVERED** local-RAG indexer surface → `file-semantic-search` + `indexed_sources` + `file_index_entries`
- **MISSING-AI** local model fallback orchestrator (cloud-fail → on-device retry with degradation report)
- **MISSING-AI** conflict auto-resolver (CRDT merge proposal, not just detection)
- **MISSING-AI** RAG re-ranker / embedding refresh planner
- **MISSING-AI** prompt-redaction rewriter (paired with classifier, pre-send scrub)

### Non-AI gaps
- **MISSING-NONAI** CRDT sync engine (no Yjs/Automerge service; only `customViews/rules` + heatmap views exist)
- **MISSING-NONAI** encrypted local store (no client-side SQLite/IndexedDB + key mgmt; Postgres only)
- **MISSING-NONAI** plugin manifest / extension registry
- **MISSING-NONAI** capability negotiation handshake (device tier, model availability, network class)
- **MISSING-NONAI** offline service-worker / outbox queue on frontend
- **MISSING-NONAI** sync-vector clock / op-log table

### Custom gaps
- **MISSING-CUSTOM** privacy budget tracker (per-user epsilon/cloud-tokens ledger; `privacy_audit_log` table exists but no budget endpoint)
- **MISSING-CUSTOM** model cache manager (`on_device_models` table is CRUD-only; no pin/evict/quota/checksum verify endpoints)
- **MISSING-CUSTOM** offline-first task queue (no `task_queue` table or replay endpoint; `agent_runs` is a log, not a queue)

## Implemented (this round)
None — audit-only.

## Apply pass 7 (full backlog implementation)

Implements every MECHANICAL + NEEDS-PRODUCT-DECISION item from the Gap Analysis.
CRDT engine + encrypted store are backend-side stubs (no client SQLite/IndexedDB dependency added),
persisting ops/state via the new migration. Plugin manifest is JSON CRUD.

### AI endpoints added (4) — `backend/routes/ai.js`
- `POST /api/ai/local-fallback-orchestrator` — cloud→on-device fallback chain + degradation report
- `POST /api/ai/conflict-auto-resolver` — CRDT merge proposal (ops + residual conflicts)
- `POST /api/ai/rag-rerank-planner` — re-rank current hits, plan embedding refresh
- `POST /api/ai/prompt-redaction-rewriter` — pre-send PII scrub paired with classifier

### New backend route modules (8) — mounted in `backend/server.js` BEFORE the 404 handler
- `backend/routes/crdt.js`  →  `/api/crdt`
  - `GET/POST /documents`, `GET/DELETE /documents/:doc_key`
  - `POST /documents/:doc_key/ops` (accepts single op or `{ops:[...]}`, replays + returns resolved state)
  - `GET /documents/:doc_key/ops` (op log)
  - Doc types: `lww-map` (Lamport + actor tiebreak) and `or-set` (observed-remove tags)
- `backend/routes/encryptedStore.js`  →  `/api/encrypted-store`
  - Keys: `GET/POST /keys`, `POST /keys/:key_id/rotate`
  - Entries: `GET /entries[?namespace=]`, `PUT /entries`, `GET/DELETE /entries/:ns/:key`
  - `POST /seal-demo` (server-side AES-256-GCM sealing for client wiring/test only)
- `backend/routes/plugins.js`  →  `/api/plugins`
  - `GET /`, `GET /:slug`, `POST /`, `PUT /:slug`, `DELETE /:slug` (JSON CRUD; seeds 3 manifests)
- `backend/routes/capabilities.js`  →  `/api/capabilities`
  - `POST /handshake` (device_tier, ram_gb, has_gpu, network_class, available_models → granted_capabilities + recommended_route)
  - `GET /handshakes[?device_id=]`, `GET /handshakes/:device_id/latest`
- `backend/routes/outbox.js`  →  `/api/outbox`
  - `GET /`, `POST /enqueue`, `POST /replay`, `DELETE /:id`, `GET /stats`
- `backend/routes/syncOplog.js`  →  `/api/sync-oplog`
  - `GET /`, `POST /` (auto-bumps Lamport)
  - `GET /vector-clock`, `GET /happens-before?a=&b=`
- `backend/routes/privacyBudget.js`  →  `/api/privacy-budget`
  - `GET /`, `POST /`, `POST /:user_email/spend` (returns 402 on over-budget),
    `POST /:user_email/reset`, `GET /:user_email/ledger`
- `backend/routes/modelCache.js`  →  `/api/model-cache`
  - `GET /`, `POST /`, `POST /:name/pin|unpin|evict|verify`, `GET /quota`, `DELETE /:name`
  - Evict blocked when pinned (409); verify compares checksum.

### Schema migration — `backend/migrations/002_backlog.sql`
New tables (9): `crdt_documents`, `crdt_ops`, `encrypted_store`, `encryption_keys`,
`plugin_manifests`, `capability_handshakes`, `outbox_queue`, `sync_oplog`,
`privacy_budgets`, `privacy_budget_ledger`, `model_cache`. Each route module also
runs idempotent `CREATE TABLE IF NOT EXISTS` on boot so they work without the migration too.

### Frontend pages added (12) — wired in `frontend/src/App.js` + `frontend/src/components/Sidebar.js`
AI: `AILocalFallbackOrchestratorPage`, `AIConflictAutoResolverPage`, `AIRagRerankPlannerPage`, `AIPromptRedactionRewriterPage`
Infra: `CrdtEnginePage`, `EncryptedStorePage`, `PluginsPage`, `CapabilitiesPage`,
       `OutboxQueuePage`, `SyncOplogPage`, `PrivacyBudgetPage`, `ModelCachePage`
API client extended in `frontend/src/services/api.js` with matching helpers.
New sidebar group "Local-First Infra" lists all 8 infra pages.

### Constraints honored
- No new npm deps (uses existing express + pg + node:crypto).
- No breaking changes — existing AI endpoints, CRUD pages, and customViews untouched.
- All new routes mounted BEFORE the `/api` 404 handler.
- `node --check` clean on every modified/new backend `.js` file.

### Skips
- True client-side encrypted SQLite/IndexedDB + browser KMS: out of scope for backend-stub
  implementation; surfaced as a backend facade that stores opaque ciphertext + IV + key_id
  and offers a `/seal-demo` helper for wiring tests. Real client key custody must come from
  OS keychain / WebCrypto.
- Service worker / cache-storage in the SPA: not added; outbox queue runs server-side as
  per the prompt's backend-stub directive. Client SW would be a separate front-end pass.

## Status
Apply pass 7 complete. 13 AI endpoints (was 9), 14 backend route modules (was 13 incl.
implicit ai/dashboard/notifications etc.; +8 new ones), 33 frontend pages (was 21; +12 new),
21 tables (was 12; +9 new). All gaps in audit closed except the two skips above.
