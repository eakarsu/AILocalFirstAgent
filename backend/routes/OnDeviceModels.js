const buildCrud = require('./_crudFactory');
module.exports = buildCrud({ table: 'on_device_models', fields: ['name','size_gb','quantization','status','last_used'] });
