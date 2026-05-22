const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const ai = require('../services/ai');

const SCHEMAS = {
  'local-task-plan': `{"task_summary":string,"steps":[{"step":number,"action":string,"tool":string,"rationale":string}],"data_sources_used":[string],"estimated_runtime_seconds":number,"privacy_notes":[string],"summary":string}`,
  'file-semantic-search': `{"query":string,"matches":[{"path":string,"score":number,"snippet":string,"match_reason":string}],"search_strategy":string,"summary":string}`,
  'scheduled-macro': `{"macro_name":string,"trigger":{"type":string,"spec":string},"actions":[{"step":number,"tool":string,"action":string}],"outputs":[string],"dry_run_preview":string,"summary":string}`,
  'draft-reply': `{"subject":string,"draft":string,"tone_applied":string,"action_items_called_out":[string],"suggested_attachments":[string],"summary":string}`,
  'weekly-summary': `{"period":string,"highlights":[string],"decisions_made":[string],"open_threads":[{"thread":string,"owner":string,"due":string}],"next_week_outlook":string,"summary":string}`,
  'privacy-classifier': `{"data_class":"public"|"personal"|"sensitive"|"medical"|"financial","confidence":number,"detected_pii":[string],"recommended_route":"cloud"|"on-device"|"redact"|"deny","rationale":string,"summary":string}`,
  'model-router-select': `{"chosen_model":string,"reasoning":string,"alternatives":[{"model":string,"trade_off":string}],"on_device":boolean,"estimated_latency_ms":number,"estimated_cost_usd":number,"summary":string}`,
  'conflict-finder': `{"subject":string,"conflicts":[{"description":string,"a_source":string,"b_source":string,"severity":"low"|"medium"|"high"}],"deduplicated_facts":[string],"summary":string}`,
  'daily-digest': `{"date":string,"highlights":[string],"action_items":[{"item":string,"due":string,"owner":string}],"emails_to_reply":[string],"meetings_summary":[string],"unfinished_from_yesterday":[string],"summary":string}`,
  'local-fallback-orchestrator': `{"primary_provider":string,"failure_class":string,"fallback_chain":[{"provider":string,"on_device":boolean,"degradation":string}],"degradation_report":string,"retry_strategy":string,"summary":string}`,
  'conflict-auto-resolver': `{"subject":string,"merge_strategy":string,"proposed_merge":{},"crdt_ops":[{"op":string,"path":string,"value":any}],"residual_conflicts":[string],"confidence":number,"summary":string}`,
  'rag-rerank-planner': `{"query":string,"reranked":[{"path":string,"old_score":number,"new_score":number,"reason":string}],"embedding_refresh_targets":[string],"refresh_priority":"low"|"medium"|"high","summary":string}`,
  'prompt-redaction-rewriter': `{"original":string,"rewritten":string,"redactions":[{"text":string,"category":string,"placeholder":string}],"safe_to_send_cloud":boolean,"summary":string}`
};

const SAMPLES = {
  'local-task-plan': [
    { label: 'Friday email triage', values: {"goal":"Summarize unread emails received this week and draft replies for 3 oldest unanswered threads.","data_sources":"mail, calendar"} },
    { label: 'Audit doc finder', values: {"goal":"Find all PDFs related to Q3 audit, summarize unique findings.","data_sources":"files"} },
    { label: 'Meeting prep brief', values: {"goal":"Build a 5-minute prep brief for tomorrow first 3 meetings.","data_sources":"calendar, mail, files"} }
  ],
  'file-semantic-search': [
    { label: 'Find lease terms', values: {"query":"office lease termination clauses","context_hint":"~/Documents/Legal"} },
    { label: 'Last quarter expenses', values: {"query":"recurring SaaS expenses over $500/mo","context_hint":"last 90 days"} },
    { label: 'Customer churn analysis', values: {"query":"analyses of customer churn drivers","context_hint":"~/work/analytics"} }
  ],
  'scheduled-macro': [
    { label: 'Weekly inbox triage', values: {"description":"Every Friday 5pm, summarize unread mail and draft replies for 3 oldest unanswered.","frequency":"weekly"} },
    { label: 'Daily calendar brief', values: {"description":"Each weekday 7am, brief today meetings with prep notes from past threads.","frequency":"daily"} },
    { label: 'Hourly doc index', values: {"description":"Every hour, scan ~/Documents for new/changed files and update the local index.","frequency":"hourly"} }
  ],
  'draft-reply': [
    { label: 'Late delivery complaint', values: {"incoming_email":"Hi, my order was supposed to arrive Tuesday and still no sign of it. Frustrated.","tone":"warm"} },
    { label: 'Vendor renewal request', values: {"incoming_email":"Following up on the renewal terms for next year. Can we get a 5% discount?","tone":"professional"} },
    { label: 'Recruiter outreach', values: {"incoming_email":"Saw your profile, would you be open to a chat about a Staff role?","tone":"curt"} }
  ],
  'weekly-summary': [
    { label: 'Work week summary', values: {"focus_area":"work email + calendar","time_range":"last 7 days"} },
    { label: 'Project Apollo only', values: {"focus_area":"Project Apollo threads + meetings","time_range":"last 14 days"} },
    { label: 'Personal/admin', values: {"focus_area":"personal finance, family calendar, health appointments","time_range":"last 7 days"} }
  ],
  'privacy-classifier': [
    { label: 'Email with SSN', values: {"snippet":"Hi, my SSN is 123-45-6789, please file with this.","intended_use":"cloud LLM"} },
    { label: 'Calendar meeting title', values: {"snippet":"1:1 with manager — comp review","intended_use":"cloud LLM"} },
    { label: 'Medical message', values: {"snippet":"Lab results show A1C of 6.4","intended_use":"cloud LLM"} }
  ],
  'model-router-select': [
    { label: 'Quick local classify', values: {"task_description":"Classify email priority.","sensitivity":"personal","latency_target_ms":200} },
    { label: 'Long summarize', values: {"task_description":"Summarize 50-page PDF.","sensitivity":"personal","latency_target_ms":30000} },
    { label: 'Medical', values: {"task_description":"Extract symptoms.","sensitivity":"medical","latency_target_ms":1000} }
  ],
  'conflict-finder': [
    { label: 'Meeting time', values: {"data_streams":"calendar, mail","subject":"Q3 budget review"} },
    { label: 'Status mismatch', values: {"data_streams":"slack, mail","subject":"Apollo milestone"} },
    { label: 'Travel dates', values: {"data_streams":"calendar, mail","subject":"Conference attendance"} }
  ],
  'daily-digest': [
    { label: 'Today brief', values: {"date":"2026-05-17","focus":"work"} },
    { label: 'Past Friday', values: {"date":"2026-05-15","focus":"work + family"} },
    { label: 'Travel day', values: {"date":"2026-06-12","focus":"travel"} }
  ],
  'local-fallback-orchestrator': [
    { label: 'Cloud timeout', values: {"primary_provider":"openrouter:anthropic/claude-sonnet","failure_class":"timeout","sensitivity":"personal","task_description":"Summarize 20 emails"} },
    { label: 'Offline mode', values: {"primary_provider":"openrouter:openai/gpt-4o","failure_class":"network-offline","sensitivity":"medical","task_description":"Classify lab note"} },
    { label: 'Rate-limit', values: {"primary_provider":"openrouter:meta/llama-3","failure_class":"rate-limited","sensitivity":"sensitive","task_description":"Draft reply"} }
  ],
  'conflict-auto-resolver': [
    { label: 'Contact merge', values: {"entity":"contacts","subject":"Jane Doe phone number","a_value":"+1 415-555-0100","b_value":"+1 415-555-0199","a_timestamp":"2026-05-15T10:00Z","b_timestamp":"2026-05-15T11:30Z"} },
    { label: 'Calendar event', values: {"entity":"calendar","subject":"Q3 planning","a_value":"2026-05-20 14:00","b_value":"2026-05-20 15:00","a_timestamp":"2026-05-18T09:00Z","b_timestamp":"2026-05-18T09:05Z"} },
    { label: 'File rename', values: {"entity":"files","subject":"audit.pdf vs audit-final.pdf","a_value":"audit.pdf","b_value":"audit-final.pdf","a_timestamp":"2026-05-10T09:00Z","b_timestamp":"2026-05-10T10:00Z"} }
  ],
  'rag-rerank-planner': [
    { label: 'Stale lease', values: {"query":"office lease termination","top_k":5,"current_results":"lease-2019.pdf, lease-2024.pdf, hr-policy.pdf"} },
    { label: 'Refresh code docs', values: {"query":"webhook retry strategy","top_k":10,"current_results":"webhooks.md, retry.md, README.md"} },
    { label: 'Travel notes', values: {"query":"japan trip itinerary","top_k":5,"current_results":"tokyo.md, kyoto.md, flights.pdf"} }
  ],
  'prompt-redaction-rewriter': [
    { label: 'SSN in email', values: {"prompt":"Reply to Jane: my SSN is 123-45-6789, please update the form.","target":"cloud LLM"} },
    { label: 'Med record', values: {"prompt":"Summarize patient John Doe (DOB 1985-04-12) lab results showing A1C 6.4.","target":"cloud LLM"} },
    { label: 'Internal IP', values: {"prompt":"Investigate failed login from 10.0.0.42 by user@acme.com.","target":"cloud LLM"} }
  ]
};

async function record(feature, input, output) {
  try {
    await pool.query('INSERT INTO ai_results (feature, input, output) VALUES ($1, $2, $3)',
      [feature, input || {}, output || {}]);
  } catch (e) { console.warn('[ai] record failed:', e.message); }
}

router.get('/samples', (req, res) => {
  try {
    const feature = (req.query.feature || '').toString();
    if (!feature) return res.json({ features: Object.keys(SAMPLES) });
    const samples = SAMPLES[feature];
    if (!samples) return res.status(404).json({ error: `unknown feature: ${feature}` });
    res.json({ feature, samples });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/history', async (req, res) => {
  try {
    const feature = (req.query.feature || '').toString();
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 200);
    const r = feature
      ? await pool.query('SELECT id, feature, input, output, created_at FROM ai_results WHERE feature=$1 ORDER BY created_at DESC LIMIT $2', [feature, limit])
      : await pool.query('SELECT id, feature, input, output, created_at FROM ai_results ORDER BY created_at DESC LIMIT $1', [limit]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/local-task-plan', async (req, res) => {
  try {
    const result = await ai.runFeature('local-task-plan', SCHEMAS['local-task-plan'], req.body || {});
    await record('local-task-plan', req.body || {}, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/file-semantic-search', async (req, res) => {
  try {
    const result = await ai.runFeature('file-semantic-search', SCHEMAS['file-semantic-search'], req.body || {});
    await record('file-semantic-search', req.body || {}, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/scheduled-macro', async (req, res) => {
  try {
    const result = await ai.runFeature('scheduled-macro', SCHEMAS['scheduled-macro'], req.body || {});
    await record('scheduled-macro', req.body || {}, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/draft-reply', async (req, res) => {
  try {
    const result = await ai.runFeature('draft-reply', SCHEMAS['draft-reply'], req.body || {});
    await record('draft-reply', req.body || {}, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/weekly-summary', async (req, res) => {
  try {
    const result = await ai.runFeature('weekly-summary', SCHEMAS['weekly-summary'], req.body || {});
    await record('weekly-summary', req.body || {}, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/privacy-classifier', async (req, res) => {
  try {
    const result = await ai.runFeature('privacy-classifier', SCHEMAS['privacy-classifier'], req.body || {});
    await record('privacy-classifier', req.body || {}, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/model-router-select', async (req, res) => {
  try {
    const result = await ai.runFeature('model-router-select', SCHEMAS['model-router-select'], req.body || {});
    await record('model-router-select', req.body || {}, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/conflict-finder', async (req, res) => {
  try {
    const result = await ai.runFeature('conflict-finder', SCHEMAS['conflict-finder'], req.body || {});
    await record('conflict-finder', req.body || {}, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/daily-digest', async (req, res) => {
  try {
    const result = await ai.runFeature('daily-digest', SCHEMAS['daily-digest'], req.body || {});
    await record('daily-digest', req.body || {}, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/local-fallback-orchestrator', async (req, res) => {
  try {
    const result = await ai.runFeature('local-fallback-orchestrator', SCHEMAS['local-fallback-orchestrator'], req.body || {});
    await record('local-fallback-orchestrator', req.body || {}, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/conflict-auto-resolver', async (req, res) => {
  try {
    const result = await ai.runFeature('conflict-auto-resolver', SCHEMAS['conflict-auto-resolver'], req.body || {});
    await record('conflict-auto-resolver', req.body || {}, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/rag-rerank-planner', async (req, res) => {
  try {
    const result = await ai.runFeature('rag-rerank-planner', SCHEMAS['rag-rerank-planner'], req.body || {});
    await record('rag-rerank-planner', req.body || {}, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/prompt-redaction-rewriter', async (req, res) => {
  try {
    const result = await ai.runFeature('prompt-redaction-rewriter', SCHEMAS['prompt-redaction-rewriter'], req.body || {});
    await record('prompt-redaction-rewriter', req.body || {}, result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
