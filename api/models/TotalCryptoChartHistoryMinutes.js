/**
 * Person.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {
	tableName: 'total_crypto_chart_history_minutes',
	autoCreatedAt: false,
	autoUpdatedAt: false,
	attributes  : {
	id: {type: 'integer', primaryKey: true},	
	prices: {type: 'json', required: true},
	date_created: {type: 'datetime', required: true}
  }
};

