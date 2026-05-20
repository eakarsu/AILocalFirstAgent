const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function main() {
  const migDir = path.join(__dirname, '..', 'migrations');
  for (const f of fs.readdirSync(migDir).filter((x) => x.endsWith('.sql')).sort()) {
    const sql = fs.readFileSync(path.join(migDir, f), 'utf8');
    try { await pool.query(sql); console.log(`[seed] applied ${f}`); }
    catch (e) { console.warn(`[seed] ${f} warn: ${e.message}`); }
  }
  await pool.query(
    "INSERT INTO users (email, password, name, role) VALUES ('admin@local-first-agent.local','secure123','Admin','commander') ON CONFLICT (email) DO NOTHING"
  );
  console.log('[seed] demo user ready');

  // indexed_sources
  for (const row of [{"source_type":"mail","path":"~/Library/Mail","status":"active","last_indexed":null,"item_count":12483,"notes":"Apple Mail"},{"source_type":"files","path":"~/Documents","status":"active","last_indexed":null,"item_count":8421,"notes":null},{"source_type":"messages","path":"~/Library/Messages/chat.db","status":"active","last_indexed":null,"item_count":54221,"notes":null},{"source_type":"calendar","path":"~/Library/Calendars","status":"active","last_indexed":null,"item_count":1842,"notes":null},{"source_type":"browser","path":"~/Library/Safari/History.db","status":"paused","last_indexed":null,"item_count":0,"notes":null}]) {
    try {
      const cols = Object.keys(row);
      const vals = cols.map((k) => row[k]);
      const ph = cols.map((_, i) => `$${i + 1}`).join(',');
      await pool.query(`INSERT INTO indexed_sources (${cols.join(',')}) VALUES (${ph})`, vals);
    } catch (e) { /* ignore unique conflicts */ }
  }

  // scheduled_macros
  for (const row of [{"name":"Friday Email Summary","trigger_cron":"0 17 * * 5","action_summary":"Summarize unread mail, draft 3 replies","status":"active","last_run":null,"notes":null},{"name":"Daily Calendar Brief","trigger_cron":"0 7 * * *","action_summary":"Brief today's meetings with prep notes","status":"active","last_run":null,"notes":null},{"name":"Weekly Doc Roundup","trigger_cron":"0 9 * * 1","action_summary":"Find docs changed last week, summarize","status":"paused","last_run":null,"notes":null}]) {
    try {
      const cols = Object.keys(row);
      const vals = cols.map((k) => row[k]);
      const ph = cols.map((_, i) => `$${i + 1}`).join(',');
      await pool.query(`INSERT INTO scheduled_macros (${cols.join(',')}) VALUES (${ph})`, vals);
    } catch (e) { /* ignore unique conflicts */ }
  }

  // agent_runs
  for (const row of [{"macro_name":"Friday Email Summary","started_at":null,"duration_ms":4820,"status":"success","output_summary":"Drafted 3 replies"},{"macro_name":"Daily Calendar Brief","started_at":null,"duration_ms":1820,"status":"success","output_summary":null},{"macro_name":"Friday Email Summary","started_at":null,"duration_ms":6210,"status":"failed","output_summary":"IMAP timeout"}]) {
    try {
      const cols = Object.keys(row);
      const vals = cols.map((k) => row[k]);
      const ph = cols.map((_, i) => `$${i + 1}`).join(',');
      await pool.query(`INSERT INTO agent_runs (${cols.join(',')}) VALUES (${ph})`, vals);
    } catch (e) { /* ignore unique conflicts */ }
  }

  // on_device_models
  for (const row of [{"name":"Llama-3.1-70B","size_gb":38,"quantization":"Q4_K_M","status":"loaded","last_used":null},{"name":"Llama-3.1-8B","size_gb":5,"quantization":"Q5_K_M","status":"available","last_used":null},{"name":"Phi-3.5-mini","size_gb":2,"quantization":"Q4_K_M","status":"loaded","last_used":null}]) {
    try {
      const cols = Object.keys(row);
      const vals = cols.map((k) => row[k]);
      const ph = cols.map((_, i) => `$${i + 1}`).join(',');
      await pool.query(`INSERT INTO on_device_models (${cols.join(',')}) VALUES (${ph})`, vals);
    } catch (e) { /* ignore unique conflicts */ }
  }

  // privacy_audit_log
  for (const row of [{"action":"read_mail","data_class":"personal","app_name":"local-agent","allowed":"yes","notes":null},{"action":"read_messages","data_class":"sensitive","app_name":"local-agent","allowed":"yes","notes":null},{"action":"cloud_inference","data_class":"sensitive","app_name":"local-agent","allowed":"no","notes":"Routed to on-device model"}]) {
    try {
      const cols = Object.keys(row);
      const vals = cols.map((k) => row[k]);
      const ph = cols.map((_, i) => `$${i + 1}`).join(',');
      await pool.query(`INSERT INTO privacy_audit_log (${cols.join(',')}) VALUES (${ph})`, vals);
    } catch (e) { /* ignore unique conflicts */ }
  }

  // file_index_entries
  for (const row of [{"path":"~/Documents/contract.pdf","mimetype":"application/pdf","size_bytes":284921,"embedded":"yes","last_modified":null},{"path":"~/Documents/notes.md","mimetype":"text/markdown","size_bytes":8421,"embedded":"yes","last_modified":null},{"path":"~/Pictures/IMG_001.heic","mimetype":"image/heic","size_bytes":1820392,"embedded":"no","last_modified":null}]) {
    try {
      const cols = Object.keys(row);
      const vals = cols.map((k) => row[k]);
      const ph = cols.map((_, i) => `$${i + 1}`).join(',');
      await pool.query(`INSERT INTO file_index_entries (${cols.join(',')}) VALUES (${ph})`, vals);
    } catch (e) { /* ignore unique conflicts */ }
  }

  console.log('[seed] domain rows seeded');
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
