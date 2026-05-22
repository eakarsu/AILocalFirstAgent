// Model cache manager — pin/evict/quota/checksum verify for on-device models.
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../config/database');

async function ensureTables() {
  try {
    await pool.query(`
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
    `);
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM model_cache');
    if (rows[0].n === 0) {
      const seed = [
        { name: 'llama-3-8b-q4', size: 4.8, quant: 'Q4_K_M', pinned: true },
        { name: 'phi-3-mini', size: 2.4, quant: 'Q5_0', pinned: false },
        { name: 'whisper-small', size: 0.9, quant: 'fp16', pinned: false },
      ];
      for (const s of seed) {
        await pool.query(
          `INSERT INTO model_cache (model_name, size_gb, quantization, checksum, pinned, status, last_verified_at, last_used_at)
           VALUES ($1,$2,$3,$4,$5,'cached',NOW(),NOW())`,
          [s.name, s.size, s.quant, crypto.createHash('sha256').update(s.name).digest('hex').slice(0, 32), s.pinned]
        );
      }
    }
  } catch (e) { console.warn('[modelCache] ensureTables warn:', e.message); }
}
let ensured = ensureTables();
router.use(async (req, _res, next) => { try { await ensured; } catch (_) {} next(); });

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM model_cache ORDER BY pinned DESC, last_used_at DESC NULLS LAST');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.model_name) return res.status(400).json({ error: 'model_name required' });
    const checksum = b.checksum || crypto.createHash('sha256').update(b.model_name).digest('hex').slice(0, 32);
    const { rows } = await pool.query(
      `INSERT INTO model_cache (model_name, size_gb, quantization, checksum, pinned, status, last_verified_at)
       VALUES ($1,$2,$3,$4,$5,'cached',NOW())
       ON CONFLICT (model_name) DO UPDATE
         SET size_gb=EXCLUDED.size_gb, quantization=EXCLUDED.quantization,
             checksum=EXCLUDED.checksum, updated_at=NOW()
       RETURNING *`,
      [b.model_name, b.size_gb || 0, b.quantization || null, checksum, !!b.pinned]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:name/pin', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE model_cache SET pinned=TRUE, updated_at=NOW() WHERE model_name=$1 RETURNING *',
      [req.params.name]
    );
    if (!rows.length) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:name/unpin', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE model_cache SET pinned=FALSE, updated_at=NOW() WHERE model_name=$1 RETURNING *',
      [req.params.name]
    );
    if (!rows.length) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:name/evict', async (req, res) => {
  try {
    const { rows: cur } = await pool.query('SELECT pinned FROM model_cache WHERE model_name=$1', [req.params.name]);
    if (!cur.length) return res.status(404).json({ error: 'not found' });
    if (cur[0].pinned) return res.status(409).json({ error: 'cannot evict pinned model' });
    const { rows } = await pool.query(
      `UPDATE model_cache SET status='evicted', updated_at=NOW() WHERE model_name=$1 RETURNING *`,
      [req.params.name]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:name/verify', async (req, res) => {
  try {
    const expected = (req.body && req.body.expected_checksum) || null;
    const { rows } = await pool.query('SELECT * FROM model_cache WHERE model_name=$1', [req.params.name]);
    if (!rows.length) return res.status(404).json({ error: 'not found' });
    const cur = rows[0];
    const ok = expected ? expected === cur.checksum : !!cur.checksum;
    await pool.query(
      `UPDATE model_cache SET last_verified_at=NOW(), status=$2, updated_at=NOW() WHERE model_name=$1`,
      [req.params.name, ok ? 'cached' : 'corrupt']
    );
    res.json({ model_name: cur.model_name, ok, checksum: cur.checksum, expected_checksum: expected || null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/quota', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS models,
              COALESCE(SUM(size_gb),0)::float AS used_gb,
              COALESCE(SUM(CASE WHEN pinned THEN size_gb ELSE 0 END),0)::float AS pinned_gb
         FROM model_cache WHERE status <> 'evicted'`
    );
    const quota_gb = 32;
    res.json({ quota_gb, ...rows[0], free_gb: Math.max(0, quota_gb - rows[0].used_gb) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:name', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM model_cache WHERE model_name=$1', [req.params.name]);
    if (!rowCount) return res.status(404).json({ error: 'not found' });
    res.json({ deleted: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
