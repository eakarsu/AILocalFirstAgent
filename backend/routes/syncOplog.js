// Sync vector clock / op-log.
// Records per-device ops with Lamport + vector clocks. Computes happens-before relations.
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

async function ensureTables() {
  try {
    await pool.query(`
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
    `);
  } catch (e) { console.warn('[syncOplog] ensureTables warn:', e.message); }
}
let ensured = ensureTables();
router.use(async (req, _res, next) => { try { await ensured; } catch (_) {} next(); });

router.get('/', async (req, res) => {
  try {
    const device = (req.query.device_id || '').toString();
    const entity = (req.query.entity || '').toString();
    const limit = Math.min(500, Math.max(10, parseInt(req.query.limit, 10) || 100));
    let sql = 'SELECT * FROM sync_oplog WHERE 1=1';
    const params = [];
    if (device) { params.push(device); sql += ` AND device_id = $${params.length}`; }
    if (entity) { params.push(entity); sql += ` AND entity = $${params.length}`; }
    params.push(limit); sql += ` ORDER BY recorded_at DESC LIMIT $${params.length}`;
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.device_id || !b.entity || !b.op_type) {
      return res.status(400).json({ error: 'device_id, entity, op_type required' });
    }
    // Get max lamport for this device, bump it
    const { rows: mx } = await pool.query(
      'SELECT COALESCE(MAX(lamport),0)::bigint AS m FROM sync_oplog WHERE device_id=$1',
      [b.device_id]
    );
    const lamport = Math.max(Number(mx[0].m) || 0, Number(b.lamport || 0)) + 1;
    const vc = b.vector_clock || { [b.device_id]: lamport };
    const { rows } = await pool.query(
      `INSERT INTO sync_oplog (device_id, entity, op_type, lamport, vector_clock, payload)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [b.device_id, b.entity, b.op_type, lamport, JSON.stringify(vc), JSON.stringify(b.payload || {})]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Compute per-device vector clock summary
router.get('/vector-clock', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT device_id, MAX(lamport)::bigint AS lamport, COUNT(*)::int AS ops
         FROM sync_oplog GROUP BY device_id ORDER BY device_id ASC`
    );
    const clock = {};
    for (const r of rows) clock[r.device_id] = Number(r.lamport);
    res.json({ vector_clock: clock, per_device: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// happens-before check between two op ids
router.get('/happens-before', async (req, res) => {
  try {
    const a = parseInt(req.query.a, 10);
    const b = parseInt(req.query.b, 10);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return res.status(400).json({ error: 'a and b op ids required' });
    const { rows } = await pool.query(
      'SELECT id, device_id, vector_clock, lamport FROM sync_oplog WHERE id = ANY($1::bigint[])',
      [[a, b]]
    );
    const A = rows.find((r) => Number(r.id) === a);
    const B = rows.find((r) => Number(r.id) === b);
    if (!A || !B) return res.status(404).json({ error: 'op(s) not found' });
    // happens-before iff every VC entry of A is <= B's, and at least one is strictly less.
    const vcA = A.vector_clock || {};
    const vcB = B.vector_clock || {};
    const keys = new Set([...Object.keys(vcA), ...Object.keys(vcB)]);
    let allLe = true, oneLt = false;
    for (const k of keys) {
      const va = Number(vcA[k] || 0);
      const vb = Number(vcB[k] || 0);
      if (va > vb) allLe = false;
      if (va < vb) oneLt = true;
    }
    const a_before_b = allLe && oneLt;
    let b_before_a = true, b_lt = false;
    for (const k of keys) {
      const va = Number(vcA[k] || 0);
      const vb = Number(vcB[k] || 0);
      if (vb > va) b_before_a = false;
      if (vb < va) b_lt = true;
    }
    const concurrent = !a_before_b && !(b_before_a && b_lt);
    res.json({ a, b, a_before_b, b_before_a: b_before_a && b_lt, concurrent });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
