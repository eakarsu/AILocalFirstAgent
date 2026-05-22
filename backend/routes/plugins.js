// Plugin manifest / extension registry — JSON CRUD.
// A manifest declares: slug, name, version, capabilities[], permissions[], entry_point.
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

async function ensureTables() {
  try {
    await pool.query(`
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
    `);
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM plugin_manifests');
    if (rows[0].n === 0) {
      const seed = [
        { slug: 'mail-indexer', name: 'Mail Indexer', version: '1.2.0', publisher: 'local-first',
          description: 'Indexes Apple Mail .emlx files locally.',
          capabilities: ['index.read', 'rag.embed'], permissions: ['fs:read:~/Library/Mail'],
          entry_point: 'plugins/mail-indexer/main.js' },
        { slug: 'calendar-sync', name: 'Calendar Sync', version: '0.9.4', publisher: 'local-first',
          description: 'CRDT-aware calendar synchronization across devices.',
          capabilities: ['sync.crdt', 'calendar.read', 'calendar.write'], permissions: ['calendar:read', 'calendar:write'],
          entry_point: 'plugins/calendar-sync/main.js' },
        { slug: 'pii-redactor', name: 'PII Redactor', version: '2.0.1', publisher: 'local-first',
          description: 'Pre-send prompt redaction using local classifier.',
          capabilities: ['redact.prompt', 'classify.pii'], permissions: ['net:none'],
          entry_point: 'plugins/pii-redactor/main.js' },
      ];
      for (const p of seed) {
        await pool.query(
          `INSERT INTO plugin_manifests (slug, name, version, publisher, description, capabilities, permissions, entry_point, manifest)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [p.slug, p.name, p.version, p.publisher, p.description,
           JSON.stringify(p.capabilities), JSON.stringify(p.permissions), p.entry_point,
           JSON.stringify({ slug: p.slug, name: p.name, version: p.version, capabilities: p.capabilities, permissions: p.permissions })]
        );
      }
    }
  } catch (e) { console.warn('[plugins] ensureTables warn:', e.message); }
}
let ensured = ensureTables();
router.use(async (req, _res, next) => { try { await ensured; } catch (_) {} next(); });

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM plugin_manifests ORDER BY name ASC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:slug', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM plugin_manifests WHERE slug=$1', [req.params.slug]);
    if (!rows.length) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { slug, name, version, publisher, description, capabilities, permissions, entry_point, enabled, manifest } = req.body || {};
    if (!slug || !name) return res.status(400).json({ error: 'slug and name required' });
    const { rows } = await pool.query(
      `INSERT INTO plugin_manifests (slug, name, version, publisher, description, capabilities, permissions, entry_point, enabled, manifest)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        slug, name, version || '0.1.0', publisher || null, description || null,
        JSON.stringify(capabilities || []),
        JSON.stringify(permissions || []),
        entry_point || null,
        enabled !== false,
        JSON.stringify(manifest || { slug, name, version: version || '0.1.0', capabilities: capabilities || [], permissions: permissions || [] }),
      ]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (String(e.message).includes('duplicate')) return res.status(409).json({ error: 'slug exists' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/:slug', async (req, res) => {
  try {
    const allowed = ['name', 'version', 'publisher', 'description', 'capabilities', 'permissions', 'entry_point', 'enabled', 'manifest'];
    const jsonFields = new Set(['capabilities', 'permissions', 'manifest']);
    const sets = []; const vals = []; let i = 1;
    for (const k of allowed) {
      if (req.body && Object.prototype.hasOwnProperty.call(req.body, k)) {
        sets.push(`${k} = $${i++}`);
        vals.push(jsonFields.has(k) ? JSON.stringify(req.body[k]) : req.body[k]);
      }
    }
    if (!sets.length) return res.status(400).json({ error: 'no fields to update' });
    sets.push('updated_at = NOW()');
    vals.push(req.params.slug);
    const { rows } = await pool.query(`UPDATE plugin_manifests SET ${sets.join(', ')} WHERE slug = $${i} RETURNING *`, vals);
    if (!rows.length) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:slug', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM plugin_manifests WHERE slug=$1', [req.params.slug]);
    if (!rowCount) return res.status(404).json({ error: 'not found' });
    res.json({ deleted: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
