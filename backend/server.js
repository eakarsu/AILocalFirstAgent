const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.BACKEND_PORT || 4051;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:4050').split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({ origin: (origin, cb) => (!origin || allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error('cors'))), credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'AILocalFirstAgent', timestamp: new Date().toISOString() }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api', authenticateToken);

// CRUD entities
app.use('/api/indexed-sources', require('./routes/IndexedSources'));
app.use('/api/scheduled-macros', require('./routes/ScheduledMacros'));
app.use('/api/agent-runs', require('./routes/AgentRuns'));
app.use('/api/on-device-models', require('./routes/OnDeviceModels'));
app.use('/api/privacy-audit-log', require('./routes/PrivacyAuditLog'));
app.use('/api/file-index-entries', require('./routes/FileIndexEntries'));

// AI + cross-cutting
app.use('/api/ai', require('./routes/ai'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/attachments', require('./routes/attachments'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Custom Views — mounted BEFORE any 404 handler
app.use('/api/custom-views', require('./routes/customViews'));

// Apply pass 7: full backlog implementation
app.use('/api/crdt', require('./routes/crdt'));
app.use('/api/encrypted-store', require('./routes/encryptedStore'));
app.use('/api/plugins', require('./routes/plugins'));
app.use('/api/capabilities', require('./routes/capabilities'));
app.use('/api/outbox', require('./routes/outbox'));
app.use('/api/sync-oplog', require('./routes/syncOplog'));
app.use('/api/privacy-budget', require('./routes/privacyBudget'));
app.use('/api/model-cache', require('./routes/modelCache'));
app.use('/api/conflict-provenance-timeline', require('./routes/conflictProvenanceTimeline'));

// 404 for unmatched /api routes (must remain LAST)
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found', path: req.originalUrl }));

app.listen(PORT, () => console.log(`\nLocal-First Agent Console API on http://localhost:${PORT}\n`));
