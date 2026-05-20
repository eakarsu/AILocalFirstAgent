-- Local-First Agent Console schema
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(120) NOT NULL,
  name VARCHAR(120),
  role VARCHAR(30) DEFAULT 'commander',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_results (
  id SERIAL PRIMARY KEY,
  feature VARCHAR(80) NOT NULL,
  input JSONB,
  output JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_results_feature_created ON ai_results (feature, created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  title VARCHAR(200),
  body TEXT,
  severity VARCHAR(20) DEFAULT 'info',
  source VARCHAR(80),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, read_at);

CREATE TABLE IF NOT EXISTS attachments (
  id SERIAL PRIMARY KEY,
  resource_type VARCHAR(60),
  resource_id INTEGER,
  filename VARCHAR(255),
  original_name VARCHAR(255),
  mimetype VARCHAR(120),
  size_bytes INTEGER,
  uploaded_by VARCHAR(150),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhooks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120),
  url VARCHAR(500),
  secret VARCHAR(120),
  events TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id SERIAL PRIMARY KEY,
  webhook_id INTEGER,
  event VARCHAR(120),
  payload JSONB,
  status_code INTEGER,
  response_body TEXT,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS indexed_sources (
  id SERIAL PRIMARY KEY,
  source_type VARCHAR(255),
  path VARCHAR(255),
  status VARCHAR(255),
  last_indexed TIMESTAMPTZ,
  item_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheduled_macros (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  trigger_cron VARCHAR(255),
  action_summary TEXT,
  status VARCHAR(255),
  last_run TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id SERIAL PRIMARY KEY,
  macro_name VARCHAR(255),
  started_at TIMESTAMPTZ,
  duration_ms INTEGER DEFAULT 0,
  status VARCHAR(255),
  output_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS on_device_models (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  size_gb INTEGER DEFAULT 0,
  quantization VARCHAR(255),
  status VARCHAR(255),
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS privacy_audit_log (
  id SERIAL PRIMARY KEY,
  action VARCHAR(255),
  data_class VARCHAR(255),
  app_name VARCHAR(255),
  allowed VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS file_index_entries (
  id SERIAL PRIMARY KEY,
  path VARCHAR(255),
  mimetype VARCHAR(255),
  size_bytes INTEGER DEFAULT 0,
  embedded VARCHAR(255),
  last_modified TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
