const buildCrud = require('./_crudFactory');
module.exports = buildCrud({ table: 'privacy_audit_log', fields: ['action','data_class','app_name','allowed','notes'] });
