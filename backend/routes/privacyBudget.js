// Privacy budget tracker — per-user epsilon (differential-privacy noise budget)
// and cloud-token ledger. Spend/reset/inspect endpoints.
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

async function ensureTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS privacy_budgets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        user_email VARCHAR(150),
        epsilon_total NUMERIC(10,4) DEFAULT 10.0,
        epsilon_spent NUMERIC(10,4) DEFAULT 0,
        cloud_tokens_total BIGINT DEFAULT 1000000,
        cloud_tokens_spent BIGINT DEFAULT 0,
        reset_period VARCHAR(20) DEFAULT 'monthly',
        last_reset_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS privacy_budget_ledger (
        id BIGSERIAL PRIMARY KEY,
        budget_id INTEGER,
        user_email VARCHAR(150),
        delta_epsilon NUMERIC(10,4) DEFAULT 0,
        delta_tokens BIGINT DEFAULT 0,
        reason VARCHAR(255),
        feature VARCHAR(80),
        recorded_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } catch (e) { console.warn('[privacyBudget] ensureTables warn:', e.message); }
}
let ensured = ensureTables();
router.use(async (req, _res, next) => { try { await ensured; } catch (_) {} next(); });

router.get('/', async (req, res) => {
  try {
    const email = (req.query.user_email || '').toString();
    const r = email
      ? await pool.query('SELECT * FROM privacy_budgets WHERE user_email=$1', [email])
      : await pool.query('SELECT * FROM privacy_budgets ORDER BY user_email NULLS LAST');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.user_email) return res.status(400).json({ error: 'user_email required' });
    const { rows } = await pool.query(
      `INSERT INTO privacy_budgets (user_id, user_email, epsilon_total, cloud_tokens_total, reset_period)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [b.user_id || null, b.user_email, b.epsilon_total ?? 10.0, b.cloud_tokens_total ?? 1000000, b.reset_period || 'monthly']
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:user_email/spend', async (req, res) => {
  try {
    const email = req.params.user_email;
    const b = req.body || {};
    const epsilon = Number(b.epsilon || 0);
    const tokens = Number(b.tokens || 0) | 0;
    const reason = b.reason || 'cloud-call';
    const feature = b.feature || null;
    const { rows: cur } = await pool.query('SELECT * FROM privacy_budgets WHERE user_email=$1', [email]);
    let budget;
    if (!cur.length) {
      const { rows: created } = await pool.query(
        `INSERT INTO privacy_budgets (user_email) VALUES ($1) RETURNING *`,
        [email]
      );
      budget = created[0];
    } else budget = cur[0];
    const new_eps_spent = Number(budget.epsilon_spent) + epsilon;
    const new_tok_spent = Number(budget.cloud_tokens_spent) + tokens;
    const over_eps = new_eps_spent > Number(budget.epsilon_total);
    const over_tok = new_tok_spent > Number(budget.cloud_tokens_total);
    if (over_eps || over_tok) {
      return res.status(402).json({
        error: 'budget exceeded',
        over_epsilon: over_eps, over_tokens: over_tok,
        budget,
      });
    }
    const { rows: upd } = await pool.query(
      `UPDATE privacy_budgets SET epsilon_spent=$1, cloud_tokens_spent=$2, updated_at=NOW()
       WHERE user_email=$3 RETURNING *`,
      [new_eps_spent, new_tok_spent, email]
    );
    await pool.query(
      `INSERT INTO privacy_budget_ledger (budget_id, user_email, delta_epsilon, delta_tokens, reason, feature)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [upd[0].id, email, epsilon, tokens, reason, feature]
    );
    res.json({ budget: upd[0], spent: { epsilon, tokens, reason, feature } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:user_email/reset', async (req, res) => {
  try {
    const email = req.params.user_email;
    const { rows } = await pool.query(
      `UPDATE privacy_budgets SET epsilon_spent=0, cloud_tokens_spent=0, last_reset_at=NOW(), updated_at=NOW()
       WHERE user_email=$1 RETURNING *`,
      [email]
    );
    if (!rows.length) return res.status(404).json({ error: 'not found' });
    await pool.query(
      `INSERT INTO privacy_budget_ledger (budget_id, user_email, delta_epsilon, delta_tokens, reason)
       VALUES ($1,$2,0,0,'reset')`,
      [rows[0].id, email]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:user_email/ledger', async (req, res) => {
  try {
    const email = req.params.user_email;
    const limit = Math.min(500, Math.max(10, parseInt(req.query.limit, 10) || 100));
    const { rows } = await pool.query(
      'SELECT * FROM privacy_budget_ledger WHERE user_email=$1 ORDER BY recorded_at DESC LIMIT $2',
      [email, limit]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
