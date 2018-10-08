/**
 * Person.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {
	tableName: 'predator_user_tokens',
	autoCreatedAt: false,
	autoUpdatedAt: false,
	attributes  : {
	id: {type: 'integer', primaryKey: true, autoIncrement: true},	
    user_id: {type: 'integer', required: true},
	token: {type: 'string', required: true},
	currencies: {type: 'json'},
	exchanges:{type: 'json'},
	min_volume: {type: 'string', required: true},
	fast_coin: {type: 'string', required: true},
	date_created: {type: 'datetime', required: true},
	date_updated: {type: 'datetime', required: true}
  }
};

