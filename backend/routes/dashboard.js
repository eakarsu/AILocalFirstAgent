const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const [indexed_sources_q, scheduled_macros_q, agent_runs_q, on_device_models_q, privacy_audit_log_q, file_index_entries_q] = await Promise.all([
      pool.query("SELECT COUNT(*) AS total FROM indexed_sources"),
      pool.query("SELECT COUNT(*) AS total FROM scheduled_macros"),
      pool.query("SELECT COUNT(*) AS total FROM agent_runs"),
      pool.query("SELECT COUNT(*) AS total FROM on_device_models"),
      pool.query("SELECT COUNT(*) AS total FROM privacy_audit_log"),
      pool.query("SELECT COUNT(*) AS total FROM file_index_entries")
    ]);
    res.json({
      indexed_sources: indexed_sources_q.rows[0],
      scheduled_macros: scheduled_macros_q.rows[0],
      agent_runs: agent_runs_q.rows[0],
      on_device_models: on_device_models_q.rows[0],
      privacy_audit_log: privacy_audit_log_q.rows[0],
      file_index_entries: file_index_entries_q.rows[0]
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
