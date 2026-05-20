const buildCrud = require('./_crudFactory');
module.exports = buildCrud({ table: 'file_index_entries', fields: ['path','mimetype','size_bytes','embedded','last_modified'] });
