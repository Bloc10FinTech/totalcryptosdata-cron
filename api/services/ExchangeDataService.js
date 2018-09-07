module.exports = {
	fxPairList:function(){
		var _ = require('lodash');
		return new Promise(function(resolve,reject){
			var return_array=[];
			FxTickers.find().exec(function(err,tickers){
				_.forEach(tickers,function(ticker){
					var currency1=_.join(_.split(ticker.symbol,'/',1));
					var currency2=_.replace(ticker.symbol,currency1+'/','');
					return_array.push(_.toLower(currency1+'_'+currency2));
					return_array.push(_.toLower(currency2+'_'+currency1));
				});
				return resolve({data:return_array});
			});
		});
	}
};
