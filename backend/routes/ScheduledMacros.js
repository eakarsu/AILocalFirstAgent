const buildCrud = require('./_crudFactory');
module.exports = buildCrud({ table: 'scheduled_macros', fields: ['name','trigger_cron','action_summary','status','last_run','notes'] });
