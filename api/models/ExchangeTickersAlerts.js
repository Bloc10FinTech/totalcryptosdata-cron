/**
 * Person.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {
	tableName: 'exchange_tickers_alerts',
	autoCreatedAt: false,
	autoUpdatedAt: false,
	attributes  : {
	id: {type: 'integer', primaryKey: true},	
	exchange_id: {type : 'integer', required: true},
	tickers: {type: 'json', required: true},
	date_created: {type: 'datetime', required: true}
  }
};

