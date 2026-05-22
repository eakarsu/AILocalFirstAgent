// Capability negotiation handshake.
// Client posts device tier, RAM, GPU, network class, available models.
// Server records and returns granted capabilities + recommended routing.
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

async function ensureTables() {
  try {
    await pool.query(`
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
    `);
  } catch (e) { console.warn('[capabilities] ensureTables warn:', e.message); }
}
let ensured = ensureTables();
router.use(async (req, _res, next) => { try { await ensured; } catch (_) {} next(); });

function grantCapabilities({ device_tier, ram_gb, has_gpu, network_class, available_models }) {
  const caps = ['sync.read', 'rag.query', 'redact.prompt'];
  if (ram_gb >= 8) caps.push('rag.embed');
  if (ram_gb >= 16 || has_gpu) caps.push('llm.on-device.small');
  if ((ram_gb >= 32 && has_gpu) || (device_tier === 'workstation')) caps.push('llm.on-device.large');
  if (network_class === 'offline') caps.push('outbox.queue');
  else caps.push('llm.cloud');
  if (Array.isArray(available_models) && available_models.length) caps.push('model.local-cache');
  return caps;
}

router.post('/handshake', async (req, res) => {
  try {
    const b = req.body || {};
    const device_id = b.device_id || `dev_${Math.random().toString(36).slice(2, 10)}`;
    const tier = b.device_tier || 'unknown';
    const ram = Number(b.ram_gb || 0) | 0;
    const gpu = !!b.has_gpu;
    const net = b.network_class || 'wifi';
    const models = Array.isArray(b.available_models) ? b.available_models : [];
    const granted = grantCapabilities({ device_tier: tier, ram_gb: ram, has_gpu: gpu, network_class: net, available_models: models });
    const recommended_route = (net === 'offline' || tier === 'phone' && ram < 8)
      ? 'on-device'
      : (ram >= 16 ? 'hybrid' : 'cloud');
    const { rows } = await pool.query(
      `INSERT INTO capability_handshakes
         (device_id, device_tier, network_class, ram_gb, has_gpu, available_models, granted_capabilities, client_version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [device_id, tier, net, ram, gpu, JSON.stringify(models), JSON.stringify(granted), b.client_version || null]
    );
    res.status(201).json({ handshake: rows[0], recommended_route });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/handshakes', async (req, res) => {
  try {
    const device = (req.query.device_id || '').toString();
    const r = device
      ? await pool.query('SELECT * FROM capability_handshakes WHERE device_id=$1 ORDER BY negotiated_at DESC LIMIT 50', [device])
      : await pool.query('SELECT * FROM capability_handshakes ORDER BY negotiated_at DESC LIMIT 100');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/handshakes/:device_id/latest', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM capability_handshakes WHERE device_id=$1 ORDER BY negotiated_at DESC LIMIT 1',
      [req.params.device_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'no handshake recorded' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
