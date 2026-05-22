// Encrypted local store — backend-side facade.
// Clients submit ciphertext + IV + key_id; backend persists and returns metadata.
// Plaintext is NEVER stored. Keys are wrapped (kept as opaque blobs).
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../config/database');

async function ensureTables() {
  try {
    await pool.query(`
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
    `);
  } catch (e) { console.warn('[encryptedStore] ensureTables warn:', e.message); }
}
let ensured = ensureTables();
router.use(async (req, _res, next) => { try { await ensured; } catch (_) {} next(); });

// ---- key mgmt ----
router.get('/keys', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, key_id, algo, rotated_from, active, created_at FROM encryption_keys ORDER BY id DESC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/keys', async (req, res) => {
  try {
    const { algo, wrapped_key, rotated_from } = req.body || {};
    const key_id = `k_${crypto.randomBytes(8).toString('hex')}`;
    const wk = wrapped_key || crypto.randomBytes(48).toString('base64');
    if (rotated_from) {
      await pool.query('UPDATE encryption_keys SET active=FALSE WHERE key_id=$1', [rotated_from]);
    }
    const { rows } = await pool.query(
      `INSERT INTO encryption_keys (key_id, algo, wrapped_key, rotated_from, active)
       VALUES ($1,$2,$3,$4,TRUE) RETURNING id, key_id, algo, rotated_from, active, created_at`,
      [key_id, algo || 'aes-256-gcm', wk, rotated_from || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/keys/:key_id/rotate', async (req, res) => {
  try {
    const old = req.params.key_id;
    const { rows: cur } = await pool.query('SELECT * FROM encryption_keys WHERE key_id=$1', [old]);
    if (!cur.length) return res.status(404).json({ error: 'key not found' });
    await pool.query('UPDATE encryption_keys SET active=FALSE WHERE key_id=$1', [old]);
    const newId = `k_${crypto.randomBytes(8).toString('hex')}`;
    const wk = crypto.randomBytes(48).toString('base64');
    const { rows } = await pool.query(
      `INSERT INTO encryption_keys (key_id, algo, wrapped_key, rotated_from, active)
       VALUES ($1,$2,$3,$4,TRUE) RETURNING id, key_id, algo, rotated_from, active, created_at`,
      [newId, cur[0].algo, wk, old]
    );
    res.status(201).json({ old_key_id: old, new_key: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---- store entries ----
router.get('/entries', async (req, res) => {
  try {
    const ns = (req.query.namespace || '').toString();
    const r = ns
      ? await pool.query('SELECT id, namespace, store_key, key_id, algo, size_bytes, created_at, updated_at FROM encrypted_store WHERE namespace=$1 ORDER BY updated_at DESC LIMIT 500', [ns])
      : await pool.query('SELECT id, namespace, store_key, key_id, algo, size_bytes, created_at, updated_at FROM encrypted_store ORDER BY updated_at DESC LIMIT 500');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/entries', async (req, res) => {
  try {
    const { namespace, store_key, ciphertext, iv, key_id, algo } = req.body || {};
    if (!namespace || !store_key || !ciphertext || !iv || !key_id) {
      return res.status(400).json({ error: 'namespace, store_key, ciphertext, iv, key_id all required' });
    }
    const size = Buffer.byteLength(String(ciphertext), 'utf8');
    const { rows } = await pool.query(
      `INSERT INTO encrypted_store (namespace, store_key, ciphertext, iv, key_id, algo, size_bytes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (namespace, store_key) DO UPDATE
         SET ciphertext=EXCLUDED.ciphertext, iv=EXCLUDED.iv, key_id=EXCLUDED.key_id,
             algo=EXCLUDED.algo, size_bytes=EXCLUDED.size_bytes, updated_at=NOW()
       RETURNING id, namespace, store_key, key_id, algo, size_bytes, created_at, updated_at`,
      [namespace, store_key, ciphertext, iv, key_id, algo || 'aes-256-gcm', size]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/entries/:namespace/:store_key', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, namespace, store_key, ciphertext, iv, key_id, algo, size_bytes, created_at, updated_at FROM encrypted_store WHERE namespace=$1 AND store_key=$2',
      [req.params.namespace, req.params.store_key]
    );
    if (!rows.length) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/entries/:namespace/:store_key', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM encrypted_store WHERE namespace=$1 AND store_key=$2',
      [req.params.namespace, req.params.store_key]
    );
    if (!rowCount) return res.status(404).json({ error: 'not found' });
    res.json({ deleted: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// helper: server-side seal demo (clients still own real plaintext)
router.post('/seal-demo', async (req, res) => {
  try {
    const { plaintext, key_id } = req.body || {};
    if (!plaintext) return res.status(400).json({ error: 'plaintext required (demo only)' });
    const key = crypto.randomBytes(32); // ephemeral demo key
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([c.update(String(plaintext), 'utf8'), c.final()]);
    const tag = c.getAuthTag();
    res.json({
      key_id: key_id || `demo_${crypto.randomBytes(4).toString('hex')}`,
      iv: iv.toString('base64'),
      ciphertext: Buffer.concat([enc, tag]).toString('base64'),
      algo: 'aes-256-gcm',
      note: 'Demo seal; real keys must come from client KMS / OS keychain.'
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
