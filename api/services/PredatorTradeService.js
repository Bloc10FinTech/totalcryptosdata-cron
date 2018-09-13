module.exports = {
	subscribe_room:function(request,callBack){
		var roomName=request.param('roomName');
		PredatorUserTokens.count({token:roomName},function(err, count){
			if(count>0){
				sails.sockets.join(request, roomName, function(err) {
					if (err){ callBack({errCode:500,message: 'Server error'});}
				});
				//PROCESS TO SEND DAILY TRADE ALERTS
				PredatorTradeService.createdayTradingAlerts();
				callBack({errCode:1,message: 'Subscribed to a room called '+roomName});
			}
			else{
				callBack({errCode:404,message: 'Failed to subscribed to a room called '+roomName});
			}
		});
	},
	
	predators_data_alerts:function(exchange_updated){
		var _ = require('lodash');
		var moment = require('moment');
		var request = require('request');
		
		var select_after = moment().subtract(6, 'hours').toDate();
		//var roomName=request.param('roomName');
		//var currencies=['btc','usd','eth','bch','gbp','ltc','eur','etc'];
		//var currencies_temp=currencies;
		
		ExchangeList.find({select:['id','name'],is_exchange:'yes'},function(err, exchange_list){
			if(_.isEmpty(exchange_list)){exchange_list=[];}
			return Promise.all(exchange_list.map((exchange) => {
				return new Promise(function(resolve,reject){
					var tickers=ExchangeTickersAlerts.findOne();
					tickers.where({exchange_id:exchange.id,date_created:{'>':select_after}});
					tickers.sort('id DESC');
					tickers.then(function(tickers){
						if(!_.isEmpty(tickers)){
							var date_created=moment(tickers.date_created).format('YYYY-MM-DD HH:mm:ss');
							var tickers=tickers.tickers;
							switch(exchange.name){
								case 'gdax':
									var temp_array=[];
									_.forEach(tickers,function(ticker){
										temp_array.push({product:_.toLower(_.replace(ticker.id,'-','_')),record:{buy:ticker.bid,sell:ticker.ask,volume:ticker.volume,ask:ticker.ask,bid:ticker.bid,last:ticker.price,exchange:exchange.name,date_created:date_created}});
									});	
									return resolve(temp_array);
								break;
								case 'bittrex':
									var temp_array=[];
									tickers=tickers.result;
									_.forEach(tickers,function(ticker){
										temp_array.push({product:_.toLower(_.replace(ticker.MarketName,'-','_')),record:{buy:ticker.Bid,sell:ticker.Ask,volume:ticker.Volume,ask:ticker.Ask,bid:ticker.Bid,last:ticker.Last,exchange:exchange.name,date_created:date_created}});
									});
									return resolve(temp_array);
								break;
								case 'bitfinex':
									var temp_array=[];
									_.forEach(tickers,function(ticker){
										var product=_.toLower(ticker.product_id);
										var base_currency=_.toLower(product.substr(0,3));
										var quote_currency=_.replace(product,base_currency,'');
										temp_array.push({product:base_currency+'_'+quote_currency,record:{buy:ticker.bid,sell:ticker.ask,volume:ticker.volume,ask:ticker.ask,bid:ticker.bid,last:ticker.last_price,exchange:exchange.name,date_created:date_created}});
									});
									return resolve(temp_array);
								break;
								case 'hitbtc':
									var temp_array=[];
									_.forEach(tickers,function(ticker){
										var product=_.toLower(ticker.symbol);
										var base_currency=_.toLower(ticker.baseCurrency);
										var quote_currency=_.toLower(ticker.quoteCurrency);	
										temp_array.push({product:base_currency+'_'+quote_currency,record:{buy:ticker.bid,sell:ticker.ask,volume:ticker.volume,ask:ticker.ask,bid:ticker.bid,last:ticker.last,exchange:exchange.name,date_created:date_created}});
									});
									return resolve(temp_array);
								break;
								case 'gate':
									var temp_array=[];
									_.forEach(tickers,function(ticker){
										temp_array.push({product:_.toLower(ticker.product),record:{buy:ticker.highestBid,sell:ticker.lowestAsk,volume:ticker.baseVolume,ask:ticker.lowestAsk,bid:ticker.highestBid,last:ticker.last,exchange:exchange.name,date_created:date_created}});
									});
									return resolve(temp_array);
								break;
								case 'kuna':
									var temp_array=[];
									_.forEach(tickers,function(ticker){
										if(ticker.product && (ticker.product.length==6)){
											var product=_.toLower(ticker.product);
											var base_currency=_.toLower(product.substr(0,3));
											var quote_currency=_.replace(product,base_currency,'');
											temp_array.push({product:base_currency+'_'+quote_currency,record:{buy:ticker.buy,sell:ticker.sell,volume:ticker.vol,ask:ticker.sell,bid:ticker.buy,last:ticker.last,exchange:exchange.name,date_created:date_created}});
										}
									});
									return resolve(temp_array);
								break;
								case 'okex':
									var temp_array=[];
									_.forEach(tickers,function(ticker){
										temp_array.push({product:_.toLower(ticker.product),record:{buy:ticker.ticker.buy,sell:ticker.ticker.sell,volume:ticker.ticker.vol,ask:ticker.ticker.sell,bid:ticker.ticker.buy,last:ticker.ticker.last,exchange:exchange.name,date_created:date_created}});
									});
									return resolve(temp_array);
								break;
								case 'binance':
									var temp_array=[];
									_.forEach(tickers,function(ticker){
										var base_currency=_.toLower(ticker.baseAsset);
										var quote_currency=_.toLower(ticker.quoteAsset);	
										temp_array.push({product:base_currency+'_'+quote_currency,record:{buy:ticker.bidPrice,sell:ticker.askPrice,volume:ticker.volume,ask:ticker.askPrice,bid:ticker.bidPrice,last:ticker.lastPrice,exchange:exchange.name,date_created:date_created}});
									});
									return resolve(temp_array);
								break;
								case 'huobi':
									var temp_array=[];
									_.forEach(tickers,function(ticker){
										var base_currency=_.toLower(ticker.base_currency);
										var quote_currency=_.toLower(ticker.quote_currency);
										temp_array.push({product:base_currency+'_'+quote_currency,record:{buy:ticker.tick.bid[0],sell:ticker.tick.ask[0],volume:ticker.tick.vol,ask:ticker.tick.ask[0],bid:ticker.tick.bid[0],last:ticker.tick.bid[0],exchange:exchange.name,date_created:date_created}});
									});
									return resolve(temp_array);
								break;
								case 'gemini':
									var temp_array=[];
									_.forEach(tickers,function(ticker){
										var product=_.toLower(ticker.product);
										var base_currency=_.toLower(ticker.currency);
										var quote_currency=_.toLower(_.replace(product,base_currency,''	));	
										temp_array.push({product:base_currency+'_'+quote_currency,record:{buy:ticker.bid,sell:ticker.ask,volume:ticker.vol,ask:ticker.ask,bid:ticker.bid,last:ticker.last,exchange:exchange.name,date_created:date_created}});
									});
									return resolve(temp_array);
								break;
								case 'kraken':
									var temp_array=[];
									_.forEach(tickers,function(ticker){
										var base_currency=_.toLower(ticker.base_currency);
										var quote_currency=_.toLower(ticker.quote_currency);	
										temp_array.push({product:base_currency+'_'+quote_currency,record:{buy:ticker.bid,sell:ticker.ask,volume:ticker.volume,ask:ticker.ask,bid:ticker.bid,last:ticker.last,exchange:exchange.name,date_created:date_created}});
									});
									return resolve(temp_array);
								break;
								case 'bitflyer':
									var temp_array=[];
									_.forEach(tickers,function(ticker){
										temp_array.push({product:_.toLower(ticker.product),record:{buy:ticker.best_bid,sell:ticker.best_ask,volume:ticker.volume,ask:ticker.best_ask,bid:ticker.best_bid,last:ticker.best_bid,exchange:exchange.name,date_created:date_created}});
									});
									return resolve(temp_array);
								break;
								case 'bithumb':
									var temp_array=[];
									_.forEach(tickers,function(ticker){
										var base_currency=_.toLower(ticker.base_currency);
										var quote_currency=_.toLower(ticker.quote_currency);	
										temp_array.push({product:base_currency+'_'+quote_currency,record:{buy:ticker.buy_price,sell:ticker.sell_price,volume:ticker.volume_1day,ask:ticker.sell_price,bid:ticker.buy_price,last:ticker.buy_price,exchange:exchange.name,date_created:date_created}});
									});
									return resolve(temp_array);
								break;	
								case 'bitstamp':
									var temp_array=[];
									_.forEach(tickers,function(ticker){
										var base_currency=_.toLower(ticker.base_currency);
										var quote_currency=_.toLower(ticker.quote_currency);
										temp_array.push({product:base_currency+'_'+quote_currency,record:{buy:ticker.bid,sell:ticker.ask,volume:ticker.volume,ask:ticker.ask,bid:ticker.bid,last:ticker.last,exchange:exchange.name,date_created:date_created}});
									});
									return resolve(temp_array);
								break;
								case 'bitz':
									var temp_array=[];
									_.forEach(tickers,function(ticker){
										temp_array.push({product:_.toLower(ticker.product),record:{buy:ticker.buy,sell:ticker.sell,volume:ticker.vol,ask:ticker.sell,bid:ticker.buy,last:ticker.last,exchange:exchange.name,date_created:date_created}});
									});
									return resolve(temp_array);
								break;
								case 'lbank':
									var temp_array=[];
									//AS THERE IS NO ASK/BID OR BUY/SELL DATA HERE
									/*_.forEach(tickers,function(ticker){
										temp_array.push({product:_.toLower(ticker.symbol),record:{buy:ticker.ticker.low,sell:ticker.ticker.latest,volume:ticker.ticker.vol,last:ticker.ticker.latest,exchange:exchange.name,date_created:date_created}});
									});
									*/
									return resolve(temp_array);
									
								break;
								case 'coinone':
									var temp_array=[];
									//AS THERE IS NO ASK/BID OR BUY/SELL DATA HERE
									/*_.forEach(tickers,function(ticker){
										var base_currency=_.toLower(ticker.base_currency);
										var quote_currency=_.toLower(ticker.quote_currency);
										temp_array.push({product:base_currency+'_'+quote_currency,record:{buy:ticker.low,sell:ticker.last,volume:ticker.volume,last:ticker.last,exchange:exchange.name,date_created:date_created}});
									});
									*/
									return resolve(temp_array);
								break;
								case 'wex':
									var temp_array=[];
									//AS IT IS A CRAP EXCHANGE
									/*_.forEach(tickers,function(ticker){
										temp_array.push({product:_.toLower(ticker.product),record:{buy:ticker.buy,sell:ticker.sell,volume:ticker.vol,ask:ticker.sell,bid:ticker.buy,last:ticker.last,exchange:exchange.name,date_created:date_created}});
									});
									_.forEach(currencies,function(currency){
									*/
									return resolve(temp_array);					
								break;
								case 'exmo':
									var temp_array=[];
									_.forEach(tickers,function(ticker){
										temp_array.push({product:_.toLower(ticker.product),record:{buy:ticker.buy_price,sell:ticker.sell_price,volume:ticker.vol,ask:ticker.sell_price,bid:ticker.buy_price,last:ticker.last_trade,exchange:exchange.name,date_created:date_created}});
									});
									return resolve(temp_array);
								break;
								case 'liqui':
									var temp_array=[];
									_.forEach(tickers,function(ticker){
										temp_array.push({product:_.toLower(ticker.product),record:{buy:ticker.buy,sell:ticker.sell,volume:ticker.vol,ask:ticker.sell,bid:ticker.buy,last:ticker.last,exchange:exchange.name,date_created:date_created}});
									});
									return resolve(temp_array);
								break;
								case 'korbit':
									var temp_array=[];
									_.forEach(tickers,function(ticker){
										temp_array.push({product:_.toLower(ticker.product),record:{buy:ticker.bid,sell:ticker.ask,volume:ticker.volume,ask:ticker.ask,bid:ticker.bid,last:ticker.last,exchange:exchange.name,date_created:date_created}});
									});
									return resolve(temp_array);
								break;
								case 'bitmex':
									var temp_array=[];
									_.forEach(tickers,function(ticker){
										temp_array.push({product:_.toLower(ticker.symbol),record:{buy:ticker.bidPrice,sell:ticker.askPrice,volume:ticker.totalVolume,ask:ticker.askPrice,bid:ticker.bidPrice,last:ticker.lastPrice,exchange:exchange.name,date_created:date_created}});
									});
									return resolve(temp_array);
								break;
								case 'livecoin':
									var temp_array=[];
									_.forEach(tickers,function(ticker){
										var base_currency=_.toLower(ticker.base_currency);
										var quote_currency=_.toLower(ticker.quote_currency);
										temp_array.push({product:base_currency+'_'+quote_currency,record:{buy:ticker.best_bid,sell:ticker.best_ask,volume:ticker.volume,ask:ticker.best_ask,bid:ticker.best_bid,last:ticker.last,exchange:exchange.name,date_created:date_created}});
									});
									return resolve(temp_array);
								break;
								case 'cex':
									var temp_array=[];
									_.forEach(tickers,function(ticker){
										var base_currency=_.toLower(ticker.base_currency);
										var quote_currency=_.toLower(ticker.quote_currency);
										temp_array.push({product:base_currency+'_'+quote_currency,record:{buy:ticker.bid,sell:ticker.ask,volume:ticker.volume,ask:ticker.ask,bid:ticker.bid,last:ticker.last,exchange:exchange.name,date_created:date_created}});
									});
									return resolve(temp_array);
								break;
								default:
									return resolve([]);
								break;
							}
						}
						else{
							return resolve([]);
						}
					}).catch(err => { return resolve([]);});
				});	
			})).
			then(response => {
				var temp_data_array=[];
				var return_array=[];
				_.forEach(response,function(exchange_data){
					_.forEach(exchange_data,function(data){
						if(_.isEmpty(_.filter(temp_data_array,{product:data.product}))){
							temp_data_array.push({product:data.product,records:[data.record]});
						}
						else{
							_.forEach(temp_data_array,function(return_data){
								if(return_data.product==data.product){
									return_data.records.push(data.record);
								}
							});
						}
					});
				});
				
				ExchangeDataService.fxPairList().then(response=>{ 
					_.forEach(temp_data_array,function(data){
						if(data.records.length>1){
							data.records.sort(function(a,b){ if(parseFloat(a.buy)>parseFloat(b.buy)){return 1;}else {return -1;}});
							var buy_from=data.records[0];
							data.records.sort(function(a,b){ if(parseFloat(a.sell)>parseFloat(b.sell)){return -1;}else {return 1;}});
							var sell_at=data.records[0];
							if(buy_from.exchange!=sell_at.exchange && buy_from.buy>0 && sell_at.sell>0 && (buy_from.exchange==exchange_updated || sell_at.exchange==exchange_updated)){
								if(_.indexOf(response.data,data.product)==-1){
									return_array.push({product:data.product,buy_from:buy_from,sell_at:sell_at});
								}
							}
						}
					});
					
					if(!_.isEmpty(return_array)){
						PredatorUserTokens.find().exec(function(err,tokens){
							if(_.isEmpty(err)){
								_.forEach(tokens,function(token){
									var filter_array=[];
									if(!_.isEmpty(token.currencies)){
										_.forEach(token.currencies,function(currency){
											_.forEach(return_array,function(data){
												if((_.isEmpty(token.volume) || parseInt(token.volume)==0) || (data.buy_from.volume>=token.volume && data.sell_at.volume>=token.volume)){
													if(data.product.indexOf(_.toLower(currency+'_'))>=0 || data.product.indexOf(_.toLower('_'+currency))>=0){
														filter_array.push(data);
													}
												}
											});
										});
									}
									if(!_.isEmpty(filter_array)){
										filter_array=_.uniqBy(filter_array,'product');
										
										//CALL JOOMLA API
										var postData = {data: filter_array,users:[token.user_id]};
										var url = 'https://portal.totalcryptos.com/predatord/predator.php';
										var options = {method: 'post',body: postData,json: true,url: url};
										request(options, function (err, res, body) {
										  if (err) {//console.log('error posting json: '+ err);
										  }
										  //var headers = res.headers;
										  //var statusCode = res.statusCode;
										  //console.log('headers: '+ headers);
										  //console.log('statusCode: '+ statusCode);
										  //console.log('body: '+ body);
										});
										
										PredatorTradeService.socketBroadCast(token.token,token.date_updated, 'predator_alert',{data:filter_array,exchange_list:exchange_list},{data:[],exchange_list:[]});
									}
								});
							}
						});
						//sails.sockets.blast('predator_alert', {data:return_array,exchange_list:exchange_list});
					}
				}).catch( err => {});
				
			}).
			catch(err => {});
		});			
	},
	
	socketBroadCast:function(token,date_time,event_name,object_data,empty_object_data){
		var moment=require('moment');
		var _=require('lodash');
		var now=moment();
		var end=moment(date_time);
		var duration = moment.duration(now.diff(end));
		if((parseInt(duration.asHours())<1) && ((parseInt(duration.asMinutes())%60)<=5)){
			object_data.is_expired=false;
			sails.sockets.broadcast(token,event_name,object_data);
		}
		else{
			empty_object_data.is_expired=true;
			sails.sockets.broadcast(token,event_name,empty_object_data);
		}
	},
	
	createdayTradingAlerts:function(){
		console.log('crone job for day trading alert working');
		var _=require('lodash');
		TotalCryptoPrices.find().limit(1).sort({id:-1}).exec(function(err,totalcryptosData){
			if(!_.isEmpty(totalcryptosData)){
				var return_array={gainers_1h:[],losers_1h:[],gainers_24h:[],losers_24h:[]};
				totalcryptosData=_.head(totalcryptosData);
				var temp=totalcryptosData.prices;
				temp=_.reject(temp,{change_perc_1h:null});
				temp.sort(function(a,b){if(a.change_perc_1h>b.change_perc_1h){return -1;}else{return 1;}});
				return_array.gainers_1h=_.slice(temp,0,15);
				return_array.losers_1h=_.slice(temp.reverse(),0,15);
				temp=totalcryptosData.prices;
				temp=_.reject(temp,{change_perc_24h:null});
				temp.sort(function(a,b){if(a.change_perc_24h>b.change_perc_24h){return -1;}else{return 1;}});
				return_array.gainers_24h=_.slice(temp,0,15);
				return_array.losers_24h=_.slice(temp.reverse(),0,15);
				PredatorUserTokens.find().exec(function(err,tokens){
					_.forEach(tokens,function(token){
						PredatorTradeService.socketBroadCast(token.token,token.date_updated, 'day_trading_alert', {data:return_array},{data:{gainers_1h:[],losers_1h:[],gainers_24h:[],losers_24h:[]}});
					});
				});
			}
		});
	}
};
