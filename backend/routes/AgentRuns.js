const buildCrud = require('./_crudFactory');
module.exports = buildCrud({ table: 'agent_runs', fields: ['macro_name','started_at','duration_ms','status','output_summary'] });
