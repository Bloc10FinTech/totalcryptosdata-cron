/**
 * Person.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {
	tableName: 'exchange_errors',
	autoCreatedAt: false,
	autoUpdatedAt: false,
	attributes  : {
	id: {type: 'integer', primaryKey: true},	
	name: {type : 'string', required: true},
	error_type: {type : 'string', enum:['query_select','query_insert','api'], required: true},
	error: {type: 'text', required: true},
	custom_message: {type: 'string', required: true},
	date_created: {type: 'datetime', required: true},
  }
};

