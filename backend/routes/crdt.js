// CRDT sync engine — backend-side stub.
// Accepts ops, persists to crdt_ops + crdt_documents, resolves state by replaying.
// Supports two doc types:
//   - lww-map: last-write-wins keyed map (winner = highest lamport, tiebreak actor asc)
//   - or-set:  observed-remove set (add/remove with op_id tracking)
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

async function ensureTables() {
  try {
    await pool.query(`
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
    `);
  } catch (e) { console.warn('[crdt] ensureTables warn:', e.message); }
}
let ensured = ensureTables();
router.use(async (req, _res, next) => { try { await ensured; } catch (_) {} next(); });

function mergeVectorClock(a, b) {
  const out = { ...(a || {}) };
  for (const k of Object.keys(b || {})) out[k] = Math.max(out[k] || 0, b[k] || 0);
  return out;
}

function resolveLwwMap(ops) {
  // Winner per path = highest lamport, tiebreak actor lexicographically.
  const best = {}; // path -> { lamport, actor, value, op_type }
  for (const op of ops) {
    const cur = best[op.path];
    const better = !cur
      || op.lamport > cur.lamport
      || (op.lamport === cur.lamport && String(op.actor || '') > String(cur.actor || ''));
    if (better) best[op.path] = { lamport: op.lamport, actor: op.actor, value: op.value, op_type: op.op_type };
  }
  const state = {};
  for (const [path, w] of Object.entries(best)) {
    if (w.op_type === 'delete') continue;
    state[path] = w.value;
  }
  return state;
}

function resolveOrSet(ops) {
  // Each add carries a tag (op id); removes carry the tags they observed.
  const tags = {}; // element -> Set of op ids alive
  for (const op of ops) {
    if (op.op_type === 'add') {
      const el = JSON.stringify(op.value);
      if (!tags[el]) tags[el] = new Set();
      tags[el].add(String(op.id));
    } else if (op.op_type === 'remove') {
      const el = JSON.stringify(op.value);
      const observed = Array.isArray(op.value && op.value.observed_tags) ? op.value.observed_tags : null;
      if (tags[el]) {
        if (observed) observed.forEach((t) => tags[el].delete(String(t)));
        else tags[el].clear();
      }
    }
  }
  return Object.keys(tags).filter((k) => tags[k].size > 0).map((k) => { try { return JSON.parse(k); } catch (_) { return k; } });
}

async function recomputeState(docKey) {
  const { rows: docRows } = await pool.query('SELECT doc_type FROM crdt_documents WHERE doc_key=$1', [docKey]);
  const docType = docRows[0]?.doc_type || 'lww-map';
  const { rows: ops } = await pool.query(
    'SELECT id, op_type, path, value, actor, lamport, vector_clock FROM crdt_ops WHERE doc_key=$1 ORDER BY lamport ASC, id ASC',
    [docKey]
  );
  let state;
  if (docType === 'or-set') state = resolveOrSet(ops);
  else state = resolveLwwMap(ops);
  let vc = {};
  for (const o of ops) vc = mergeVectorClock(vc, o.vector_clock || {});
  const lastOpId = ops.length ? ops[ops.length - 1].id : 0;
  await pool.query(
    `UPDATE crdt_documents SET state=$1, vector_clock=$2, last_op_id=$3, updated_at=NOW() WHERE doc_key=$4`,
    [JSON.stringify(state), JSON.stringify(vc), lastOpId, docKey]
  );
  await pool.query('UPDATE crdt_ops SET applied=TRUE WHERE doc_key=$1 AND applied=FALSE', [docKey]);
  return { doc_key: docKey, doc_type: docType, state, vector_clock: vc, last_op_id: Number(lastOpId) };
}

// List documents
router.get('/documents', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT doc_key, doc_type, state, vector_clock, last_op_id, updated_at FROM crdt_documents ORDER BY updated_at DESC LIMIT 200');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create / upsert doc
router.post('/documents', async (req, res) => {
  try {
    const { doc_key, doc_type } = req.body || {};
    if (!doc_key) return res.status(400).json({ error: 'doc_key required' });
    const dt = (doc_type === 'or-set') ? 'or-set' : 'lww-map';
    const { rows } = await pool.query(
      `INSERT INTO crdt_documents (doc_key, doc_type) VALUES ($1,$2)
       ON CONFLICT (doc_key) DO UPDATE SET updated_at=NOW() RETURNING *`,
      [doc_key, dt]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get resolved state
router.get('/documents/:doc_key', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM crdt_documents WHERE doc_key=$1', [req.params.doc_key]);
    if (!rows.length) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Submit op(s)
router.post('/documents/:doc_key/ops', async (req, res) => {
  try {
    const docKey = req.params.doc_key;
    const body = req.body || {};
    const incoming = Array.isArray(body.ops) ? body.ops : [body];
    // ensure doc
    await pool.query(
      `INSERT INTO crdt_documents (doc_key, doc_type) VALUES ($1, COALESCE($2,'lww-map'))
       ON CONFLICT (doc_key) DO NOTHING`,
      [docKey, body.doc_type || null]
    );
    // get current max lamport
    const { rows: maxRows } = await pool.query('SELECT COALESCE(MAX(lamport),0)::bigint AS m FROM crdt_ops WHERE doc_key=$1', [docKey]);
    let lamport = Number(maxRows[0].m) || 0;
    const inserted = [];
    for (const op of incoming) {
      lamport = Math.max(lamport, Number(op.lamport || 0)) + 1;
      const actor = op.actor || 'unknown';
      const vc = op.vector_clock || { [actor]: lamport };
      const r = await pool.query(
        `INSERT INTO crdt_ops (doc_key, op_type, path, value, actor, lamport, vector_clock)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [docKey, op.op_type || 'set', op.path || '', JSON.stringify(op.value ?? null), actor, lamport, JSON.stringify(vc)]
      );
      inserted.push(r.rows[0]);
    }
    const resolved = await recomputeState(docKey);
    res.status(201).json({ ops_accepted: inserted.length, ops: inserted, resolved });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// List op log for a doc
router.get('/documents/:doc_key/ops', async (req, res) => {
  try {
    const limit = Math.min(500, Math.max(10, parseInt(req.query.limit, 10) || 100));
    const { rows } = await pool.query(
      'SELECT id, op_type, path, value, actor, lamport, applied, created_at FROM crdt_ops WHERE doc_key=$1 ORDER BY lamport ASC, id ASC LIMIT $2',
      [req.params.doc_key, limit]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete document and its ops
router.delete('/documents/:doc_key', async (req, res) => {
  try {
    await pool.query('DELETE FROM crdt_ops WHERE doc_key=$1', [req.params.doc_key]);
    const { rowCount } = await pool.query('DELETE FROM crdt_documents WHERE doc_key=$1', [req.params.doc_key]);
    if (!rowCount) return res.status(404).json({ error: 'not found' });
    res.json({ deleted: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
