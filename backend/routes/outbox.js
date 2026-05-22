// Offline-first outbox / task queue.
// Clients enqueue ops while offline; server-side replay endpoint processes them.
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

async function ensureTables() {
  try {
    await pool.query(`
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
    `);
  } catch (e) { console.warn('[outbox] ensureTables warn:', e.message); }
}
let ensured = ensureTables();
router.use(async (req, _res, next) => { try { await ensured; } catch (_) {} next(); });

router.get('/', async (req, res) => {
  try {
    const status = (req.query.status || '').toString();
    const limit = Math.min(500, Math.max(10, parseInt(req.query.limit, 10) || 100));
    const r = status
      ? await pool.query('SELECT * FROM outbox_queue WHERE status=$1 ORDER BY enqueued_at DESC LIMIT $2', [status, limit])
      : await pool.query('SELECT * FROM outbox_queue ORDER BY enqueued_at DESC LIMIT $1', [limit]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/enqueue', async (req, res) => {
  try {
    const b = req.body || {};
    const items = Array.isArray(b.items) ? b.items : [b];
    const inserted = [];
    for (const it of items) {
      const { rows } = await pool.query(
        `INSERT INTO outbox_queue (client_op_id, device_id, endpoint, method, payload, status)
         VALUES ($1,$2,$3,$4,$5,'pending') RETURNING *`,
        [
          it.client_op_id || null,
          it.device_id || null,
          it.endpoint || null,
          (it.method || 'POST').toUpperCase(),
          JSON.stringify(it.payload || {}),
        ]
      );
      inserted.push(rows[0]);
    }
    res.status(201).json({ enqueued: inserted.length, items: inserted });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/replay', async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt((req.body && req.body.limit) || req.query.limit, 10) || 50));
    const { rows: pending } = await pool.query(
      `SELECT * FROM outbox_queue WHERE status='pending' ORDER BY enqueued_at ASC LIMIT $1`,
      [limit]
    );
    let replayed = 0, failed = 0;
    const results = [];
    for (const it of pending) {
      // Simulated replay: mark replayed. Real impl would dispatch to the endpoint.
      try {
        await pool.query(
          `UPDATE outbox_queue SET status='replayed', attempt_count=attempt_count+1, replayed_at=NOW() WHERE id=$1`,
          [it.id]
        );
        replayed++;
        results.push({ id: it.id, status: 'replayed', endpoint: it.endpoint });
      } catch (err) {
        failed++;
        await pool.query(
          `UPDATE outbox_queue SET status='failed', attempt_count=attempt_count+1, last_error=$2 WHERE id=$1`,
          [it.id, String(err.message)]
        );
        results.push({ id: it.id, status: 'failed', error: err.message });
      }
    }
    res.json({ replayed, failed, total: pending.length, results });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });
    const { rowCount } = await pool.query('DELETE FROM outbox_queue WHERE id=$1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not found' });
    res.json({ deleted: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/stats', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT status, COUNT(*)::int AS n FROM outbox_queue GROUP BY status`
    );
    const out = { pending: 0, replayed: 0, failed: 0 };
    for (const r of rows) out[r.status] = r.n;
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
