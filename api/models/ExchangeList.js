/**
 * Person.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {
	tableName: 'exchange_list',
	autoCreatedAt: false,
	autoUpdatedAt: false,
	attributes  : {
	id: {type: 'integer', primaryKey: true},	
	name: {type : 'string', required: true},
	url: {type : 'string', required: true},
	is_exchange: {type : 'string', enum:['yes','no'], required: true},
	currencies: {type: 'json'},
	products: {type: 'json'},
	rating: {type : 'string', allowNull: true},
	date_created: {type: 'datetime', required: true}
  }
};

