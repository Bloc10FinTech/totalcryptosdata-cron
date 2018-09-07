/**
 * HomeController
 *
 * @description :: Server-side logic for managing homes
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

require('dotenv').config();
module.exports = {
	subscribe_room:function(request,response){
		PredatorTradeService.subscribe_room(request,function(data){
		  return response.send(data);
	  });
	}
};

