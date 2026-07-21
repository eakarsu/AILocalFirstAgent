'use strict';
const { createRouter } = require('./router');
const { postgres } = require('./store');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { evaluate } = require('./domain');
module.exports = createRouter({ db: postgres(pool), auth: authenticateToken, evaluate,
  workflow: 'local-first-agent-run',
  providers: ['repository','ci-cd','model-provider','telemetry','secret-broker','artifact-store','ticketing'],
  approverRoles: ['analyst','commander','security_reviewer','admin'] });

