// LLM helper for Local-First Agent Console
const fs = require('fs');
const FALLBACK_ENV = '/Users/erolakarsu/projects/beauty-wellness-ai/.env';
function readFallback() {
  try {
    if (!fs.existsSync(FALLBACK_ENV)) return {};
    const out = {};
    for (const line of fs.readFileSync(FALLBACK_ENV, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      out[m[1]] = v;
    }
    return out;
  } catch (_) { return {}; }
}
function creds() {
  const fb = readFallback();
  return {
    key: process.env.OPENROUTER_API_KEY || fb.OPENROUTER_API_KEY || '',
    model: process.env.OPENROUTER_MODEL || fb.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
  };
}
const SYSTEM_BASE = 'You are a senior analyst supporting the Local-First Agent Console. ' +
  'CRITICAL OUTPUT RULES: (1) Return ONLY raw JSON matching the schema requested. ' +
  '(2) DO NOT wrap in markdown fences. (3) DO NOT add prose before/after. ' +
  '(4) Keep concise to fit token limit; never truncate. ' +
  '(5) First char must be `{`, last must be `}`.';

function callOpenRouter(systemPrompt, userPrompt) {
  return new Promise((resolve) => {
    const { key, model } = creds();
    if (!key) return resolve({ error: 'OPENROUTER_API_KEY not configured' });
    const https = require('https');
    const payload = JSON.stringify({
      model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      temperature: 0.4, max_tokens: 6000, response_format: { type: 'json_object' },
    });
    const req = https.request({
      hostname: 'openrouter.ai', path: '/api/v1/chat/completions', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload),
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': 'http://localhost:4050', 'X-Title': 'Local-First Agent Console' },
    }, (res) => {
      let body = ''; res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) return resolve({ error: parsed.error.message || 'OpenRouter error' });
          resolve(parsed.choices?.[0]?.message?.content || '');
        } catch (e) { resolve({ error: 'parse failed' }); }
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.write(payload); req.end();
  });
}
function stripFences(text) {
  let t = String(text).trim();
  if (t.startsWith('\`\`\`')) {
    t = t.replace(/^\`\`\`(?:json)?\s*/i, '');
    t = t.replace(/\s*\`\`\`\s*$/i, '');
  }
  return t.trim();
}
function repairTruncated(text) {
  if (!text || typeof text !== 'string') return null;
  let inStr = false, esc = false, lastSafe = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === ',' || ch === '}' || ch === ']') lastSafe = i;
  }
  let r = lastSafe >= 0 ? text.slice(0, lastSafe + 1) : text;
  r = r.replace(/,\s*$/, '');
  if (inStr) r += '"';
  const stack = []; let s2 = false, e2 = false;
  for (let i = 0; i < r.length; i++) {
    const ch = r[i];
    if (e2) { e2 = false; continue; }
    if (ch === '\\') { e2 = true; continue; }
    if (ch === '"') { s2 = !s2; continue; }
    if (s2) continue;
    if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' || ch === ']') stack.pop();
  }
  while (stack.length) r += (stack.pop() === '{' ? '}' : ']');
  try { return JSON.parse(r); } catch (_) { return null; }
}
function safeParse(response, fallback) {
  if (response && typeof response === 'object' && response.error) return { ...fallback, error: response.error };
  if (response == null) return { ...fallback, summary: '' };
  if (typeof response === 'object') return response;
  const stripped = stripFences(String(response));
  try { return JSON.parse(stripped); } catch (_) {}
  try {
    const start = stripped.indexOf('{');
    if (start !== -1) {
      let d = 0, s = false, e = false;
      for (let i = start; i < stripped.length; i++) {
        const ch = stripped[i];
        if (e) { e = false; continue; }
        if (ch === '\\') { e = true; continue; }
        if (ch === '"') { s = !s; continue; }
        if (s) continue;
        if (ch === '{') d++;
        else if (ch === '}') { d--; if (d === 0) return JSON.parse(stripped.slice(start, i + 1)); }
      }
    }
  } catch (_) {}
  const start = stripped.indexOf('{');
  if (start !== -1) {
    const r = repairTruncated(stripped.slice(start));
    if (r && typeof r === 'object') return { ...r, _truncated: true };
  }
  return { ...fallback, summary: stripped };
}
async function runFeature(slug, schema, payload) {
  const sys = `${SYSTEM_BASE}\nReturn strict JSON in this schema:\n${schema}`;
  const usr = `Feature: ${slug}\nInputs:\n${JSON.stringify(payload, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeParse(r, { summary: typeof r === 'string' ? r : 'No response' });
}
module.exports = { runFeature };
