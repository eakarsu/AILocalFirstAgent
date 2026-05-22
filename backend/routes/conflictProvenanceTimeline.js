const express = require('express');
const router = express.Router();
function timeline(input = {}) {
  const conflicts = input.conflicts || [
    { key: 'note:42', actors: ['laptop', 'tablet'], edits: 5, last_writer: 'tablet', semantic_distance: 0.74 },
    { key: 'task:9', actors: ['desktop', 'phone'], edits: 2, last_writer: 'desktop', semantic_distance: 0.18 },
  ];
  return { conflicts: conflicts.map(c => ({ ...c, risk: Math.round(Number(c.semantic_distance) * 80 + Number(c.edits) * 3), action: c.semantic_distance > 0.5 ? 'manual_merge_with_provenance' : 'auto_merge' })) };
}
router.get('/', (req, res) => res.json(timeline()));
router.post('/build', (req, res) => res.json(timeline(req.body || {})));
module.exports = router;
