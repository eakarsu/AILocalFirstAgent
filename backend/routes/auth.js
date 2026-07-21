const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { JWT_SECRET, authenticateToken, requireCommander } = require('../middleware/auth');
const pool = require('../config/database');
const { verifyPassword } = require('../services/passwords');

router.use((req, res, next) => {
  if (!JWT_SECRET || JWT_SECRET.length < 32 ||
      !/^[A-Za-z0-9][A-Za-z0-9._:-]+$/.test(process.env.GOVERNANCE_TENANT_ID || '')) {
    return res.status(503).json({ error: 'Authentication is not configured' });
  }
  next();
});

async function findDbUser(email, password) {
  try {
    const r = await pool.query('SELECT id, email, password, name, role FROM users WHERE email=$1 LIMIT 1', [email]);
    if (!r.rows.length) return null;
    const u = r.rows[0];
    if (!(await verifyPassword(password, u.password))) return null;
    return { id: u.id, email: u.email, name: u.name, role: u.role };
  } catch (_) { return null; }
}

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const user = await findDbUser(email, password);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ ...user, tenantId: process.env.GOVERNANCE_TENANT_ID }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, created_at FROM users WHERE id = $1 LIMIT 1',
      [req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    return res.json(result.rows[0]);
  } catch (_) {
    return res.status(503).json({ error: 'Authentication service unavailable' });
  }
});

router.get('/users', authenticateToken, requireCommander, async (req, res) => {
  try {
    const r = await pool.query('SELECT id, email, name, role, created_at FROM users ORDER BY id ASC');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
