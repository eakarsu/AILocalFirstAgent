// Custom Views — domain: local-first AI agent / sync
// Endpoints:
//   GET    /api/custom-views/sync-timeline       VIZ data for sync activity timeline
//   GET    /api/custom-views/conflict-heatmap    VIZ data for conflict-resolution heatmap (entity x conflict type)
//   GET    /api/custom-views/sync-log.pdf        NON-VIZ — PDF sync log export
//   GET/POST/PUT/DELETE /api/custom-views/rules  NON-VIZ — CRUD for sync/conflict rules
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// ---------- bootstrap: create custom-views tables (idempotent) ----------
async function ensureTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sync_events (
        id SERIAL PRIMARY KEY,
        entity VARCHAR(80) NOT NULL,
        action VARCHAR(40) NOT NULL,
        device VARCHAR(80),
        status VARCHAR(40),
        item_count INTEGER DEFAULT 0,
        latency_ms INTEGER DEFAULT 0,
        occurred_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_sync_events_time ON sync_events (occurred_at DESC);
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sync_conflicts (
        id SERIAL PRIMARY KEY,
        entity VARCHAR(80) NOT NULL,
        conflict_type VARCHAR(80) NOT NULL,
        resolved_by VARCHAR(40),
        resolution VARCHAR(80),
        detected_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_sync_conflicts_entity ON sync_conflicts (entity, conflict_type);
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sync_rules (
        id SERIAL PRIMARY KEY,
        name VARCHAR(160) NOT NULL,
        entity VARCHAR(80) NOT NULL,
        conflict_type VARCHAR(80) NOT NULL,
        strategy VARCHAR(80) NOT NULL,
        priority INTEGER DEFAULT 100,
        active BOOLEAN DEFAULT TRUE,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // seed demo data only if empty
    const { rows: er } = await pool.query('SELECT COUNT(*)::int AS n FROM sync_events');
    if (er[0].n === 0) {
      const entities = ['mail', 'files', 'messages', 'calendar', 'contacts'];
      const actions = ['pull', 'push', 'merge', 'resolve'];
      const devs = ['MBP-16', 'iPhone-15', 'iPad-Pro', 'Mac-Mini'];
      const statuses = ['success', 'success', 'success', 'conflict', 'failed'];
      const now = Date.now();
      for (let i = 0; i < 60; i++) {
        const at = new Date(now - i * 30 * 60 * 1000); // every 30 min for ~30h
        await pool.query(
          `INSERT INTO sync_events (entity, action, device, status, item_count, latency_ms, occurred_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            entities[i % entities.length],
            actions[i % actions.length],
            devs[i % devs.length],
            statuses[i % statuses.length],
            10 + (i * 7) % 230,
            80 + (i * 41) % 1800,
            at,
          ]
        );
      }
    }

    const { rows: cr } = await pool.query('SELECT COUNT(*)::int AS n FROM sync_conflicts');
    if (cr[0].n === 0) {
      const entities = ['mail', 'files', 'messages', 'calendar', 'contacts'];
      const types = ['update-update', 'delete-update', 'duplicate-id', 'schema-drift', 'timestamp-skew'];
      for (let i = 0; i < 45; i++) {
        await pool.query(
          `INSERT INTO sync_conflicts (entity, conflict_type, resolved_by, resolution, detected_at, resolved_at)
           VALUES ($1,$2,$3,$4,NOW() - ($5 || ' hours')::interval, NOW() - ($6 || ' hours')::interval)`,
          [
            entities[i % entities.length],
            types[(i * 3) % types.length],
            i % 3 === 0 ? 'auto' : 'user',
            i % 2 === 0 ? 'last-write-wins' : 'manual-merge',
            String(i * 2),
            String(Math.max(0, i * 2 - 1)),
          ]
        );
      }
    }

    const { rows: rr } = await pool.query('SELECT COUNT(*)::int AS n FROM sync_rules');
    if (rr[0].n === 0) {
      const seed = [
        { name: 'Mail: LWW', entity: 'mail', conflict_type: 'update-update', strategy: 'last-write-wins', priority: 10, notes: 'Apple Mail uses LWW' },
        { name: 'Files: Three-way merge', entity: 'files', conflict_type: 'update-update', strategy: 'three-way-merge', priority: 20, notes: null },
        { name: 'Calendar: prefer-local', entity: 'calendar', conflict_type: 'timestamp-skew', strategy: 'prefer-local', priority: 30, notes: 'Avoid TZ drift' },
        { name: 'Messages: manual', entity: 'messages', conflict_type: 'delete-update', strategy: 'manual-merge', priority: 40, notes: 'Ask the user' },
      ];
      for (const s of seed) {
        await pool.query(
          `INSERT INTO sync_rules (name, entity, conflict_type, strategy, priority, active, notes)
           VALUES ($1,$2,$3,$4,$5,TRUE,$6)`,
          [s.name, s.entity, s.conflict_type, s.strategy, s.priority, s.notes]
        );
      }
    }
  } catch (e) {
    console.warn('[customViews] ensureTables warn:', e.message);
  }
}
let ensured = ensureTables();
router.use(async (req, _res, next) => { try { await ensured; } catch (_) { /* ignore */ } next(); });

// ---------- 1) VIZ: sync activity timeline ----------
router.get('/sync-timeline', async (req, res) => {
  try {
    const hours = Math.min(168, Math.max(1, parseInt(req.query.hours, 10) || 48));
    const { rows: bucketRows } = await pool.query(
      `SELECT date_trunc('hour', occurred_at) AS bucket,
              entity,
              status,
              COUNT(*)::int AS events,
              COALESCE(SUM(item_count),0)::int AS items,
              COALESCE(AVG(latency_ms),0)::int AS avg_latency_ms
         FROM sync_events
        WHERE occurred_at > NOW() - ($1 || ' hours')::interval
        GROUP BY bucket, entity, status
        ORDER BY bucket ASC`,
      [String(hours)]
    );
    const { rows: latest } = await pool.query(
      `SELECT id, entity, action, device, status, item_count, latency_ms, occurred_at
         FROM sync_events
        ORDER BY occurred_at DESC LIMIT 25`
    );
    const { rows: agg } = await pool.query(
      `SELECT COUNT(*)::int AS total_events,
              COALESCE(SUM(item_count),0)::int AS total_items,
              COALESCE(AVG(latency_ms),0)::int AS avg_latency_ms,
              SUM(CASE WHEN status='conflict' THEN 1 ELSE 0 END)::int AS conflicts,
              SUM(CASE WHEN status='failed'   THEN 1 ELSE 0 END)::int AS failures
         FROM sync_events
        WHERE occurred_at > NOW() - ($1 || ' hours')::interval`,
      [String(hours)]
    );
    res.json({ window_hours: hours, summary: agg[0], buckets: bucketRows, latest });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- 2) VIZ: conflict resolution heatmap (entity x conflict_type) ----------
router.get('/conflict-heatmap', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT entity, conflict_type,
              COUNT(*)::int AS total,
              SUM(CASE WHEN resolved_at IS NOT NULL THEN 1 ELSE 0 END)::int AS resolved,
              SUM(CASE WHEN resolved_by='auto' THEN 1 ELSE 0 END)::int AS auto_resolved
         FROM sync_conflicts
        GROUP BY entity, conflict_type
        ORDER BY entity, conflict_type`
    );
    const entities = [...new Set(rows.map((r) => r.entity))].sort();
    const types = [...new Set(rows.map((r) => r.conflict_type))].sort();
    const matrix = entities.map((e) =>
      types.map((t) => {
        const row = rows.find((r) => r.entity === e && r.conflict_type === t);
        return row ? row.total : 0;
      })
    );
    res.json({ entities, conflict_types: types, matrix, cells: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- 3) NON-VIZ: sync log PDF ----------
router.get('/sync-log.pdf', async (req, res) => {
  try {
    const limit = Math.min(500, Math.max(10, parseInt(req.query.limit, 10) || 100));
    const { rows } = await pool.query(
      `SELECT id, entity, action, device, status, item_count, latency_ms, occurred_at
         FROM sync_events ORDER BY occurred_at DESC LIMIT $1`,
      [limit]
    );
    let PDFDocument;
    try { PDFDocument = require('pdfkit'); }
    catch (_) {
      // graceful fallback: minimal PDF assembled by hand if pdfkit missing
      const text = ['Sync Log Export', '================', '',
        ...rows.map((r) => `${new Date(r.occurred_at).toISOString()} ${r.status.padEnd(8)} ${r.entity.padEnd(10)} ${r.action.padEnd(8)} dev=${r.device || '-'} items=${r.item_count} ${r.latency_ms}ms`)].join('\n');
      const pdf = buildMinimalPdf(text);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="sync-log.pdf"');
      return res.end(pdf);
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="sync-log.pdf"');
    const doc = new PDFDocument({ size: 'LETTER', margin: 36 });
    doc.pipe(res);
    doc.fontSize(18).text('Local-First Agent — Sync Log', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#555').text(`Generated: ${new Date().toISOString()}  ·  Rows: ${rows.length}`);
    doc.moveDown(1);
    doc.fillColor('#000').fontSize(10);
    doc.text('TIME (UTC)              STATUS    ENTITY     ACTION    DEVICE         ITEMS  LATENCY');
    doc.moveTo(36, doc.y).lineTo(576, doc.y).stroke();
    doc.moveDown(0.3);
    for (const r of rows) {
      const line = `${new Date(r.occurred_at).toISOString().slice(0, 19).padEnd(22)}  ${String(r.status).padEnd(8)}  ${String(r.entity).padEnd(9)}  ${String(r.action).padEnd(8)}  ${String(r.device || '-').padEnd(13)}  ${String(r.item_count).padStart(5)}  ${String(r.latency_ms).padStart(6)}ms`;
      doc.text(line);
    }
    doc.end();
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// minimal hand-rolled PDF (fallback when pdfkit absent)
function buildMinimalPdf(text) {
  const escape = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const lines = text.split('\n');
  let stream = 'BT /F1 9 Tf 36 740 Td 11 TL\n';
  for (const ln of lines) stream += `(${escape(ln)}) Tj T*\n`;
  stream += 'ET';
  const objs = [];
  objs.push('<< /Type /Catalog /Pages 2 0 R >>');
  objs.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  objs.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');
  objs.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');
  let pdf = '%PDF-1.4\n';
  const xref = [0];
  objs.forEach((o, i) => { xref.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const startxref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objs.length; i++) pdf += String(xref[i]).padStart(10, '0') + ' 00000 n \n';
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}

// ---------- 4) NON-VIZ: sync rules CRUD ----------
router.get('/rules', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM sync_rules ORDER BY priority ASC, id ASC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rules', async (req, res) => {
  try {
    const { name, entity, conflict_type, strategy, priority, active, notes } = req.body || {};
    if (!name || !entity || !conflict_type || !strategy) {
      return res.status(400).json({ error: 'name, entity, conflict_type and strategy are required' });
    }
    const { rows } = await pool.query(
      `INSERT INTO sync_rules (name, entity, conflict_type, strategy, priority, active, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, entity, conflict_type, strategy, priority || 100, active !== false, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/rules/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });
    const allowed = ['name', 'entity', 'conflict_type', 'strategy', 'priority', 'active', 'notes'];
    const sets = []; const vals = []; let i = 1;
    for (const k of allowed) {
      if (req.body && Object.prototype.hasOwnProperty.call(req.body, k)) {
        sets.push(`${k} = $${i++}`); vals.push(req.body[k]);
      }
    }
    if (!sets.length) return res.status(400).json({ error: 'no fields to update' });
    sets.push('updated_at = NOW()');
    vals.push(id);
    const { rows } = await pool.query(`UPDATE sync_rules SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`, vals);
    if (!rows.length) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/rules/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });
    const { rowCount } = await pool.query('DELETE FROM sync_rules WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not found' });
    res.json({ deleted: true, id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
