-- Apply pass 7: full backlog implementation
-- New tables for CRDT ops, encrypted local store stub, plugin manifests,
-- capability negotiation, outbox/task queue, privacy budget, model cache mgmt,
-- and op-log / vector-clock support.

-- ----- CRDT sync engine -----
CREATE TABLE IF NOT EXISTS crdt_documents (
  id SERIAL PRIMARY KEY,
  doc_key VARCHAR(160) UNIQUE NOT NULL,
  doc_type VARCHAR(60) DEFAULT 'lww-map',
  state JSONB DEFAULT '{}'::jsonb,
  vector_clock JSONB DEFAULT '{}'::jsonb,
  last_op_id BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crdt_ops (
  id BIGSERIAL PRIMARY KEY,
  doc_key VARCHAR(160) NOT NULL,
  op_type VARCHAR(40) NOT NULL,
  path VARCHAR(255),
  value JSONB,
  actor VARCHAR(80),
  lamport BIGINT DEFAULT 0,
  vector_clock JSONB DEFAULT '{}'::jsonb,
  applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crdt_ops_doc ON crdt_ops (doc_key, lamport ASC);

-- ----- Encrypted local store stub (server-side facade) -----
CREATE TABLE IF NOT EXISTS encrypted_store (
  id SERIAL PRIMARY KEY,
  namespace VARCHAR(80) NOT NULL,
  store_key VARCHAR(160) NOT NULL,
  ciphertext TEXT,
  iv VARCHAR(80),
  key_id VARCHAR(80),
  algo VARCHAR(40) DEFAULT 'aes-256-gcm',
  size_bytes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (namespace, store_key)
);

CREATE TABLE IF NOT EXISTS encryption_keys (
  id SERIAL PRIMARY KEY,
  key_id VARCHAR(80) UNIQUE NOT NULL,
  algo VARCHAR(40) DEFAULT 'aes-256-gcm',
  wrapped_key TEXT,
  rotated_from VARCHAR(80),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----- Plugin manifest / extension registry -----
CREATE TABLE IF NOT EXISTS plugin_manifests (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(120) UNIQUE NOT NULL,
  name VARCHAR(200),
  version VARCHAR(40),
  publisher VARCHAR(120),
  description TEXT,
  capabilities JSONB DEFAULT '[]'::jsonb,
  permissions JSONB DEFAULT '[]'::jsonb,
  entry_point VARCHAR(255),
  enabled BOOLEAN DEFAULT TRUE,
  manifest JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----- Capability negotiation handshakes -----
CREATE TABLE IF NOT EXISTS capability_handshakes (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(120) NOT NULL,
  device_tier VARCHAR(40),
  network_class VARCHAR(40),
  ram_gb INTEGER DEFAULT 0,
  has_gpu BOOLEAN DEFAULT FALSE,
  available_models JSONB DEFAULT '[]'::jsonb,
  granted_capabilities JSONB DEFAULT '[]'::jsonb,
  client_version VARCHAR(40),
  negotiated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_capability_handshakes_device ON capability_handshakes (device_id, negotiated_at DESC);

-- ----- Offline outbox / task queue -----
CREATE TABLE IF NOT EXISTS outbox_queue (
  id BIGSERIAL PRIMARY KEY,
  client_op_id VARCHAR(120),
  device_id VARCHAR(120),
  endpoint VARCHAR(255),
  method VARCHAR(10),
  payload JSONB,
  status VARCHAR(40) DEFAULT 'pending',
  attempt_count INTEGER DEFAULT 0,
  last_error TEXT,
  enqueued_at TIMESTAMPTZ DEFAULT NOW(),
  replayed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox_queue (status, enqueued_at ASC);

-- ----- Sync vector clock / op-log -----
CREATE TABLE IF NOT EXISTS sync_oplog (
  id BIGSERIAL PRIMARY KEY,
  device_id VARCHAR(120) NOT NULL,
  entity VARCHAR(80) NOT NULL,
  op_type VARCHAR(40) NOT NULL,
  lamport BIGINT DEFAULT 0,
  vector_clock JSONB DEFAULT '{}'::jsonb,
  payload JSONB,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sync_oplog_device_lamport ON sync_oplog (device_id, lamport ASC);

-- ----- Privacy budget tracker -----
CREATE TABLE IF NOT EXISTS privacy_budgets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  user_email VARCHAR(150),
  epsilon_total NUMERIC(10,4) DEFAULT 10.0,
  epsilon_spent NUMERIC(10,4) DEFAULT 0,
  cloud_tokens_total BIGINT DEFAULT 1000000,
  cloud_tokens_spent BIGINT DEFAULT 0,
  reset_period VARCHAR(20) DEFAULT 'monthly',
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS privacy_budget_ledger (
  id BIGSERIAL PRIMARY KEY,
  budget_id INTEGER,
  user_email VARCHAR(150),
  delta_epsilon NUMERIC(10,4) DEFAULT 0,
  delta_tokens BIGINT DEFAULT 0,
  reason VARCHAR(255),
  feature VARCHAR(80),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----- Model cache manager -----
CREATE TABLE IF NOT EXISTS model_cache (
  id SERIAL PRIMARY KEY,
  model_name VARCHAR(255) UNIQUE NOT NULL,
  size_gb NUMERIC(8,2) DEFAULT 0,
  quantization VARCHAR(40),
  checksum VARCHAR(128),
  pinned BOOLEAN DEFAULT FALSE,
  last_verified_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  status VARCHAR(40) DEFAULT 'cached',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
