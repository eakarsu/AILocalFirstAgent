const buildCrud = require('./_crudFactory');
module.exports = buildCrud({ table: 'indexed_sources', fields: ['source_type','path','status','last_indexed','item_count','notes'] });
