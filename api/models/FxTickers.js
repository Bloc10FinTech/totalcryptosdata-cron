/**
 * Person.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {
	tableName: 'fx_data_table_latest_view',
	autoCreatedAt: false,
	autoUpdatedAt: false,
	attributes  : {
	id: {type: 'integer', primaryKey: true},	
	symbol: {type : 'string', required: true},
	bid: {type: 'string', required: true},
	ask: {type: 'string', required: true},
	timestamp: {type: 'datetime', required: true},
	is_higher: {type: 'integer', required: true}
  }
};

