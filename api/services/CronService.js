module.exports = {
	createExchangeTickersAlerts:function(){
		console.log('crone job for create predator alert working');
		var moment = require('moment');
		var _ = require('lodash');
		var math = require('mathjs');
		var curDateTime=moment().format('YYYY-MM-DD HH:mm:ss');
		
		var rand=Math.floor(Math.random() * 30) + 1;
		var rand_match_ratio=5;
		
		if(rand<=rand_match_ratio){
			var exchanges=['gdax','bittrex','bitfinex','hitbtc','gate'];
			return Promise.all(exchanges.map(exchange => {
				ExchangeList.findOne({name:exchange},function(err,data){
					if(err){ 
						ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
					}
					if(!_.isEmpty(data)){
						var exchange_id=data.id;
						switch(exchange){
							case 'gdax':
								var products=data.products;
								return Promise.all(products.map((product) => {
										return ApiService.gdaxMarketTicker(product.id).
										then(ticker => {
											ticker=JSON.parse(ticker);
											ticker.product_id=product.id;
											return ticker;
										}).
										catch(err => { 
											ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
											return '';
										});
									})).
								then(tickers => {
									var tickers_data=[];	
									_.forEach(tickers,function(ticker){
										if(!_.isEmpty(ticker) && _.isEmpty(ticker.message)){
											tickers_data.push(ticker);
										}
									});
									if(!_.isEmpty(tickers_data)){
										
										//PROCESS TO MATCH WITH LAST PRICE
										var last_tickers=ExchangeTickersAlerts.findOne();
										last_tickers.where({exchange_id:exchange_id});
										last_tickers.sort('id DESC');
										last_tickers.exec(function(err,last_tickers){
											if(err){ 
												ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
											}
											
											if(!_.isEmpty(last_tickers)){
												last_tickers=last_tickers.tickers;
												_.forEach(last_tickers,function(ticker){
													var filter=_.filter(tickers_data,{product_id:ticker.product_id});
													if(!_.isEmpty(filter)){
														filter=_.head(filter);
														if(filter.price==ticker.price){
															tickers_data=_.reject(tickers_data,{product_id:ticker.product_id});
														}
													}
												});
											}
											
											ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers_data,date_created:curDateTime},function(err,data){
												if(err){ 
													ApiService.exchangeErrors(exchange,'query_insert',err,'alert_insert',curDateTime);
												}
												return exchange;
											});
											
										});
									}
									else{
										return 'failed';
									}
								}).
								catch(err=> { 
									ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
									return 'failed';
								});
							break;
							case 'bittrex':
								var products=data.products.result; 
								ApiService.bittrexMarketSummaries().then(tickers=>{
									if(_.isEmpty(JSON.parse(tickers).message)){
										 tickers=JSON.parse(tickers);
										 var temp=[];
										 _.forEach(tickers.result,function(ticker){
											 var product=_.filter(products,{MarketName:ticker.MarketName});
											 if(!_.isEmpty(product)){
												product=_.head(product);
												ticker.BaseCurrency=product.BaseCurrency;
												ticker.MarketCurrency=product.MarketCurrency;
												//PROCESS TO FORMAT VALUE IF THERE IS ANY EXPONENTIAL VALUE
												ticker.High=math.format(ticker.High,{lowerExp: -100, upperExp: 100});
												ticker.Low=math.format(ticker.Low,{lowerExp: -100, upperExp: 100});
												ticker.Last=math.format(ticker.Last,{lowerExp: -100, upperExp: 100});
												ticker.Bid=math.format(ticker.Bid,{lowerExp: -100, upperExp: 100});
												ticker.Ask=math.format(ticker.Ask,{lowerExp: -100, upperExp: 100});
												ticker.PrevDay=math.format(ticker.PrevDay,{lowerExp: -100, upperExp: 100});
												temp.push(ticker);
											 }
										 });
										tickers.result=temp;
										//PROCESS TO MATCH WITH LAST PRICE
										var last_tickers=ExchangeTickersAlerts.findOne();
										last_tickers.where({exchange_id:exchange_id});
										last_tickers.sort('id DESC');
										last_tickers.exec(function(err,last_tickers){
											if(err){ 
												ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
											}
											
											if(!_.isEmpty(last_tickers)){
												last_tickers=last_tickers.tickers.result;
												_.forEach(last_tickers,function(ticker){
													if(!_.isEmpty(ticker.BaseCurrency)){
														var filter=_.filter(tickers.result,{MarketName:ticker.MarketName});
														if(!_.isEmpty(filter)){
															filter=_.head(filter);
															if(filter.Last==ticker.Last){
																tickers.result=_.reject(tickers.result,{MarketName:ticker.MarketName});
															}
														}
													}
												});
											}
											
											ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers,date_created:curDateTime},function(err,data){
												if(err){ 
													ApiService.exchangeErrors(exchange,'query_insert',err,'alert_insert',curDateTime);
												}
												return exchange;
											});
										});
									}
									else{
										return 'failed';
									}
								}).
								catch(err=> { 
									ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
									return 'failed';
								});
							break;
							case 'bitfinex':
								products=data.products;
								return Promise.all(products.map((product)=>{
									return ApiService.bitFinexMarketTicker(product).then((ticker)=>{
										ticker=JSON.parse(ticker);
										ticker.product_id=product;
										return ticker;
									}).
									catch(err=> { 
										ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
										return '';
									});
								})).
								then(tickers => {
									var tickers_data=[];
									_.forEach(tickers,function(ticker){
										if(!_.isEmpty(ticker) && _.isEmpty(ticker.error)){
											tickers_data.push(ticker);
										}
									});
									if(!_.isEmpty(tickers_data)){
										//PROCESS TO MATCH WITH LAST PRICE
										var last_tickers=ExchangeTickersAlerts.findOne();
										last_tickers.where({exchange_id:exchange_id});
										last_tickers.sort('id DESC');
										last_tickers.exec(function(err,last_tickers){
											if(err){ 
												ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
											}
											
											if(!_.isEmpty(last_tickers)){
												last_tickers=last_tickers.tickers;
												_.forEach(last_tickers,function(ticker){
													var filter=_.filter(tickers,{product_id:ticker.product_id});
													if(!_.isEmpty(filter)){
														filter=_.head(filter);
														if(filter.last_price==ticker.last_price){
															tickers=_.reject(tickers,{product_id:ticker.product_id});
														}
													}
												});
											}
											
											ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers_data,date_created:curDateTime},function(err,data){
												if(err){ 
													ApiService.exchangeErrors(exchange,'query_insert',err,'alert_insert',curDateTime);
												}
												return exchange;
											});
										});
									}
									else{
										return 'failed';
									}
								}).
								catch(err => { 
									ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
									return 'failed';
								});	
							break;
							case 'hitbtc':
								var products=data.products;
								var temp=[];
								ApiService.hitbtcMarketTicker().then(tickers=>{
									try{ 
										tickers=JSON.parse(tickers);
										
										_.forEach(tickers,function(ticker){
											var product=_.filter(products,{id:ticker.symbol});
											if(!_.isEmpty(product)){
												product=_.head(product);
												ticker.baseCurrency=product.baseCurrency;
												ticker.quoteCurrency=product.quoteCurrency;
												temp.push(ticker);
											}
										});
										tickers=temp;
										//PROCESS TO MATCH WITH LAST PRICE
										var last_tickers=ExchangeTickersAlerts.findOne();
										last_tickers.where({exchange_id:exchange_id});
										last_tickers.sort('id DESC');
										last_tickers.exec(function(err,last_tickers){
											if(err){ 
												ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
											}
											
											if(!_.isEmpty(last_tickers)){
												last_tickers=last_tickers.tickers;
												_.forEach(last_tickers,function(ticker){
													if(!_.isEmpty(ticker.baseCurrency)){
														var filter=_.filter(tickers,{symbol:ticker.symbol});
														if(!_.isEmpty(filter)){
															filter=_.head(filter);
															if(filter.last==ticker.last){
																tickers=_.reject(tickers,{symbol:ticker.symbol});
															}
														}
													}
												});
											}
											
											tickers=_.reject(tickers,{bid:null});
											ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers,date_created:curDateTime},function(err,data){
												if(err){ 
													ApiService.exchangeErrors(exchange,'query_insert',err,'alert_insert',curDateTime);
												}
												return exchange;
											});
										});
									}
									catch(e){ 
										ApiService.exchangeErrors(exchange,'api',e,'alert_api_select',curDateTime);
										return 'failed';
									}
								}).
								catch(err=>{ 
									ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
									return 'failed';
								});
							break;
							case 'gate':
								var products=data.products;
								ApiService.gateMarketTicker().then(tickers=>{
									try{
										var temp=[];
										tickers=JSON.parse(tickers);
										
										_.forEach(products,function(product){
											if(!_.isEmpty(tickers[_.toLower(product)])){
												product=_.toLower(product);
												var ticker=tickers[product];
												ticker.product=product;
												temp.push(ticker);
											}
										});
										
										tickers=temp;
										//PROCESS TO MATCH WITH LAST PRICE
										var last_tickers=ExchangeTickersAlerts.findOne();
										last_tickers.where({exchange_id:exchange_id});
										last_tickers.sort('id DESC');
										last_tickers.exec(function(err,last_tickers){
											if(err){ 
												ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
											}
											
											if(!_.isEmpty(last_tickers)){
												last_tickers=last_tickers.tickers;
												_.forEach(last_tickers,function(ticker){
													var filter=_.filter(tickers,{product:ticker.product});
													if(!_.isEmpty(filter)){
														filter=_.head(filter);
														if(filter.last==ticker.last){
															tickers=_.reject(tickers,{product:ticker.product});
														}
													}
												});
											}
											
											ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers,date_created:curDateTime},function(err,data){
												if(err){ 
													ApiService.exchangeErrors(exchange,'query_insert',err,'alert_insert',curDateTime);
												}
												return exchange;
											});
										});
									}
									catch(e){
										ApiService.exchangeErrors(exchange,'api',e,'alert_api_select',curDateTime);
										return 'failed';
									}
								}).
								catch(err=> { 
									ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
									return 'failed';
								});
							break;
						}
					}
				});
			})).
			then(response => {
				var temp=[];
				_.forEach(exchanges,function(exchange){
					if(exchange!='failed'){
						temp.push(exchange);
					}
				});
				if(!_.isEmpty(temp)){
					PredatorTradeService.predators_data_alerts(temp);
				}
			}).
			catch(err => {
				ApiService.exchangeErrors(_.join(exchanges,'-'),'api',err,'alert_api_select',curDateTime);
			});
			
			//PROCESS TO INSERT GDAX PRODUCTS TICKERS
			/*ExchangeList.findOne({name:'gdax'},function(err,data){
				if(err){ 
					ApiService.exchangeErrors('gdax','query_select',err,'alert_select',curDateTime);
				}
				if(!_.isEmpty(data)){
					var exchange_id=data.id;
					var products=data.products;
					return Promise.all(products.map((product) => {
							return ApiService.gdaxMarketTicker(product.id).
							then(ticker => {
								ticker=JSON.parse(ticker);
								ticker.product_id=product.id;
								return ticker;
							}).
							catch(err => { 
								ApiService.exchangeErrors('gdax','api',err,'alert_api_select',curDateTime);
							});
						})).
					then(tickers => {
						var tickers_data=[];	
						_.forEach(tickers,function(ticker){
							if(!_.isEmpty(ticker) && _.isEmpty(ticker.message)){
								tickers_data.push(ticker);
							}
						});
						if(!_.isEmpty(tickers_data)){
							
							//PROCESS TO MATCH WITH LAST PRICE
							var last_tickers=ExchangeTickersAlerts.findOne();
							last_tickers.where({exchange_id:exchange_id});
							last_tickers.sort('id DESC');
							last_tickers.exec(function(err,last_tickers){
								if(err){ 
									ApiService.exchangeErrors('gdax','query_select',err,'alert_select',curDateTime);
								}
								
								if(!_.isEmpty(last_tickers)){
									last_tickers=last_tickers.tickers;
									_.forEach(last_tickers,function(ticker){
										var filter=_.filter(tickers_data,{product_id:ticker.product_id});
										if(!_.isEmpty(filter)){
											filter=_.head(filter);
											if(filter.price==ticker.price){
												tickers_data=_.reject(tickers_data,{product_id:ticker.product_id});
											}
										}
									});
								}
								
								ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers_data,date_created:curDateTime},function(err,data){
									if(err){ 
										ApiService.exchangeErrors('gdax','query_insert',err,'alert_insert',curDateTime);
									}
									else{
										PredatorTradeService.predators_data_alerts('gdax');
									}
								});
								
							});
						}
					}).
					catch(err=> { 
						ApiService.exchangeErrors('gdax','api',err,'alert_api_select',curDateTime);
					});
				}	
			});*/
		
			//PROCESS TO INSERT BITTEX PRODUCTS/MARKETS TICKERS
			/*ExchangeList.findOne({name:'bittrex'},function(err,data){
				if(err){ 
					ApiService.exchangeErrors('bittrex','query_select',err,'alert_select',curDateTime);
				}
				if(!_.isEmpty(data)){
					var exchange_id=data.id;
					var products=data.products.result; 
					ApiService.bittrexMarketSummaries().then(tickers=>{
						if(_.isEmpty(JSON.parse(tickers).message)){
							 tickers=JSON.parse(tickers);
							 var temp=[];
							 _.forEach(tickers.result,function(ticker){
								 var product=_.filter(products,{MarketName:ticker.MarketName});
								 if(!_.isEmpty(product)){
									product=_.head(product);
									ticker.BaseCurrency=product.BaseCurrency;
									ticker.MarketCurrency=product.MarketCurrency;
									//PROCESS TO FORMAT VALUE IF THERE IS ANY EXPONENTIAL VALUE
									ticker.High=math.format(ticker.High,{lowerExp: -100, upperExp: 100});
									ticker.Low=math.format(ticker.Low,{lowerExp: -100, upperExp: 100});
									ticker.Last=math.format(ticker.Last,{lowerExp: -100, upperExp: 100});
									ticker.Bid=math.format(ticker.Bid,{lowerExp: -100, upperExp: 100});
									ticker.Ask=math.format(ticker.Ask,{lowerExp: -100, upperExp: 100});
									ticker.PrevDay=math.format(ticker.PrevDay,{lowerExp: -100, upperExp: 100});
									temp.push(ticker);
								 }
							 });
							tickers.result=temp;
							//PROCESS TO MATCH WITH LAST PRICE
							var last_tickers=ExchangeTickersAlerts.findOne();
							last_tickers.where({exchange_id:exchange_id});
							last_tickers.sort('id DESC');
							last_tickers.exec(function(err,last_tickers){
								if(err){ 
									ApiService.exchangeErrors('bittrex','query_select',err,'alert_select',curDateTime);
								}
								
								if(!_.isEmpty(last_tickers)){
									last_tickers=last_tickers.tickers.result;
									_.forEach(last_tickers,function(ticker){
										if(!_.isEmpty(ticker.BaseCurrency)){
											var filter=_.filter(tickers.result,{MarketName:ticker.MarketName});
											if(!_.isEmpty(filter)){
												filter=_.head(filter);
												if(filter.Last==ticker.Last){
													tickers.result=_.reject(tickers.result,{MarketName:ticker.MarketName});
												}
											}
										}
									});
								}
								
								ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers,date_created:curDateTime},function(err,data){
									if(err){ 
										ApiService.exchangeErrors('bittrex','query_insert',err,'alert_insert',curDateTime);
									}
									else{
										PredatorTradeService.predators_data_alerts('bittrex');
									}
								});
							});
						}
					}).
					catch(err=> { 
						ApiService.exchangeErrors('bittrex','api',err,'alert_api_select',curDateTime);
					});
				}	
			});*/
		
			//PROCESS TO INSERT BITFINEX PRODUCTS/MARKETS TICKERS
			/*ExchangeList.findOne({name:'bitfinex'},function(err,data){
				if(err){ 
					ApiService.exchangeErrors('bitfinex','query_select',err,'alert_select',curDateTime);
				}
				if(!_.isEmpty(data)){
					var exchange_id=data.id;
					products=data.products;
					return Promise.all(products.map((product)=>{
						return ApiService.bitFinexMarketTicker(product).then((ticker)=>{
							ticker=JSON.parse(ticker);
							ticker.product_id=product;
							return ticker;
						}).
						catch(err=> { 
							ApiService.exchangeErrors('bitfinex','api',err,'alert_api_select',curDateTime);
						});
					})).
					then(tickers => {
						var tickers_data=[];
						_.forEach(tickers,function(ticker){
							if(!_.isEmpty(ticker) && _.isEmpty(ticker.error)){
								tickers_data.push(ticker);
							}
						});
						if(!_.isEmpty(tickers_data)){
							//PROCESS TO MATCH WITH LAST PRICE
							var last_tickers=ExchangeTickersAlerts.findOne();
							last_tickers.where({exchange_id:exchange_id});
							last_tickers.sort('id DESC');
							last_tickers.exec(function(err,last_tickers){
								if(err){ 
									ApiService.exchangeErrors('bitfinex','query_select',err,'alert_select',curDateTime);
								}
								
								if(!_.isEmpty(last_tickers)){
									last_tickers=last_tickers.tickers;
									_.forEach(last_tickers,function(ticker){
										var filter=_.filter(tickers,{product_id:ticker.product_id});
										if(!_.isEmpty(filter)){
											filter=_.head(filter);
											if(filter.last_price==ticker.last_price){
												tickers=_.reject(tickers,{product_id:ticker.product_id});
											}
										}
									});
								}
								
								ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers_data,date_created:curDateTime},function(err,data){
									if(err){ 
										ApiService.exchangeErrors('bitfinex','query_insert',err,'alert_insert',curDateTime);
									}
									else{
										PredatorTradeService.predators_data_alerts('bitfinex');
									}
								});
							});
						}
					}).
					catch(err => { 
						ApiService.exchangeErrors('bitfinex','api',err,'alert_api_select',curDateTime);
					});	
				}
			});*/
		
			//PROCESS TO INSERT HITBTC PRODUCTS/MARKETS TICKERS
			/*ExchangeList.findOne({name:'hitbtc'},function(err,data){
				if(err){ 
					ApiService.exchangeErrors('hitbtc','query_select',err,'alert_select',curDateTime);
				}
				if(!_.isEmpty(data)){
					var exchange_id=data.id;
					var products=data.products;
					var temp=[];
					ApiService.hitbtcMarketTicker().then(tickers=>{
						try{ 
							tickers=JSON.parse(tickers);
							
							_.forEach(tickers,function(ticker){
								var product=_.filter(products,{id:ticker.symbol});
								if(!_.isEmpty(product)){
									product=_.head(product);
									ticker.baseCurrency=product.baseCurrency;
									ticker.quoteCurrency=product.quoteCurrency;
									temp.push(ticker);
								}
							});
							tickers=temp;
							//PROCESS TO MATCH WITH LAST PRICE
							var last_tickers=ExchangeTickersAlerts.findOne();
							last_tickers.where({exchange_id:exchange_id});
							last_tickers.sort('id DESC');
							last_tickers.exec(function(err,last_tickers){
								if(err){ 
									ApiService.exchangeErrors('hitbtc','query_select',err,'alert_select',curDateTime);
								}
								
								if(!_.isEmpty(last_tickers)){
									last_tickers=last_tickers.tickers;
									_.forEach(last_tickers,function(ticker){
										if(!_.isEmpty(ticker.baseCurrency)){
											var filter=_.filter(tickers,{symbol:ticker.symbol});
											if(!_.isEmpty(filter)){
												filter=_.head(filter);
												if(filter.last==ticker.last){
													tickers=_.reject(tickers,{symbol:ticker.symbol});
												}
											}
										}
									});
								}
								
								tickers=_.reject(tickers,{bid:null});
								ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers,date_created:curDateTime},function(err,data){
									if(err){ 
										ApiService.exchangeErrors('hitbtc','query_insert',err,'alert_insert',curDateTime);
									}
									else{
										PredatorTradeService.predators_data_alerts('hitbtc');
									}
								});
							});
						}
						catch(e){ 
							ApiService.exchangeErrors('hitbtc','api',e,'alert_api_select',curDateTime);
						}
					}).
					catch(err=>{ 
						ApiService.exchangeErrors('hitbtc','api',err,'alert_api_select',curDateTime);
					});
				}	
			});*/	
		
			//PROCESS TO INSERT GATE TICKERS
			/*ExchangeList.findOne({name:'gate'},function(err,data){
				if(err){ 
					ApiService.exchangeErrors('gate','query_select',err,'alert_select',curDateTime);
				}
				if(!_.isEmpty(data)){
					var exchange_id=data.id;
					var products=data.products;
					ApiService.gateMarketTicker().then(tickers=>{
						try{
							var temp=[];
							tickers=JSON.parse(tickers);
							
							_.forEach(products,function(product){
								if(!_.isEmpty(tickers[_.toLower(product)])){
									product=_.toLower(product);
									var ticker=tickers[product];
									ticker.product=product;
									temp.push(ticker);
								}
							});
							
							tickers=temp;
							//PROCESS TO MATCH WITH LAST PRICE
							var last_tickers=ExchangeTickersAlerts.findOne();
							last_tickers.where({exchange_id:exchange_id});
							last_tickers.sort('id DESC');
							last_tickers.exec(function(err,last_tickers){
								if(err){ 
									ApiService.exchangeErrors('gate','query_select',err,'alert_select',curDateTime);
								}
								
								if(!_.isEmpty(last_tickers)){
									last_tickers=last_tickers.tickers;
									_.forEach(last_tickers,function(ticker){
										var filter=_.filter(tickers,{product:ticker.product});
										if(!_.isEmpty(filter)){
											filter=_.head(filter);
											if(filter.last==ticker.last){
												tickers=_.reject(tickers,{product:ticker.product});
											}
										}
									});
								}
								
								ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers,date_created:curDateTime},function(err,data){
									if(err){ 
										ApiService.exchangeErrors('gate','query_insert',err,'alert_insert',curDateTime);
									}
									else{
										PredatorTradeService.predators_data_alerts('gate');
									}
								});
							});
						}
						catch(e){
							ApiService.exchangeErrors('gate','api',e,'alert_api_select',curDateTime);
						}
					}).
					catch(err=> { 
						ApiService.exchangeErrors('gate','api',err,'alert_api_select',curDateTime);
					});
				}	
			});*/
		}
		else if(rand<=(rand_match_ratio*2)){
			var exchanges=['kuna','okex','binance','huobi','gemini'];
			return Promise.all(exchanges.map(exchange => {
				ExchangeList.findOne({name:exchange},function(err,data){
					if(err){ 
						ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
					}
					if(!_.isEmpty(data)){
						var exchange_id=data.id;
						switch(exchange){
							case 'kuna':
								ApiService.kunaMarketTicker().then(tickers=>{
									try{
										var temp=[];
										tickers=JSON.parse(tickers);
										var products=Object.keys(tickers);
										
										_.forEach(products,function(product){
											if(!_.isEmpty(tickers[product])){
												var ticker=tickers[product];
												ticker=ticker.ticker;
												ticker.product=product;
												temp.push(ticker);
											}
										});	
										
										tickers=temp;
										//PROCESS TO MATCH WITH LAST PRICE
										var last_tickers=ExchangeTickersAlerts.findOne();
										last_tickers.where({exchange_id:exchange_id});
										last_tickers.sort('id DESC');
										last_tickers.exec(function(err,last_tickers){
											if(err){ 
												ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
											}
											
											if(!_.isEmpty(last_tickers)){
												last_tickers=last_tickers.tickers;
												_.forEach(last_tickers,function(ticker){
													var filter=_.filter(tickers,{product:ticker.product});
													if(!_.isEmpty(filter)){
														filter=_.head(filter);
														if(filter.last==ticker.last){
															tickers=_.reject(tickers,{product:ticker.product});
														}
													}
												});
											}
											
											ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers,date_created:curDateTime},function(err,data){
												if(err){ 
													ApiService.exchangeErrors(exchange,'query_insert',err,'alert_insert',curDateTime);
												}
												return exchange;
											});
										});
									}
									catch (e){
										ApiService.exchangeErrors(exchange,'api',e,'alert_api_select',curDateTime);
										return 'failed';
									}
								}).
								catch(err=> { 
									ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
									return 'failed';
								});	
							break;
							case 'okex':
								var products=data.products;
								return Promise.all(products.map((product) => {
										return ApiService.okexMarketTicker(product).
										then(ticker => {
											ticker=JSON.parse(ticker);
											ticker.product=product;
											return ticker;
										}).
										catch(err => { 
											ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
											return '';
										});
									})).
								then(tickers => {
									var tickers_data=[];	
									_.forEach(tickers,function(ticker){
										if(!_.isEmpty(ticker) && _.isEmpty(ticker.error_code)){
											tickers_data.push(ticker);
										}
									});
									if(!_.isEmpty(tickers_data)){
										//PROCESS TO MATCH WITH LAST PRICE
										var last_tickers=ExchangeTickersAlerts.findOne();
										last_tickers.where({exchange_id:exchange_id});
										last_tickers.sort('id DESC');
										last_tickers.exec(function(err,last_tickers){
											if(err){ 
												ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
											}
											
											if(!_.isEmpty(last_tickers)){
												last_tickers=last_tickers.tickers;
												_.forEach(last_tickers,function(ticker){
													var filter=_.filter(tickers_data,{product:ticker.product});
													if(!_.isEmpty(filter)){
														filter=_.head(filter);
														if(filter.last==ticker.last){
															tickers_data=_.reject(tickers_data,{product:ticker.product});
														}
													}
												});
											}
											
											ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers_data,date_created:curDateTime},function(err,data){
												if(err){ 
													ApiService.exchangeErrors(exchange,'query_insert',err,'alert_insert',curDateTime);
												}
												return exchange;
											});
											
										});
									}
									else{
										return 'failed';
									}
								}).
								catch(err=> { 
									ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
									return 'failed';
								});
							break;
							case 'binance':
								var products=data.products.symbols;
								ApiService.binanceMarketTicker().
								then(tickers => {
									try{
										tickers=JSON.parse(tickers);
										var temp=[];
										_.forEach(tickers,function(ticker){
											var product=_.filter(products,{symbol:ticker.symbol});
											if(!_.isEmpty(product)){
												product=_.head(product);
												ticker.baseAsset=product.baseAsset;
												ticker.quoteAsset=product.quoteAsset;
												temp.push(ticker);
											}
										});
										tickers=temp;
										//PROCESS TO MATCH WITH LAST PRICE
										var last_tickers=ExchangeTickersAlerts.findOne();
										last_tickers.where({exchange_id:exchange_id});
										last_tickers.sort('id DESC');
										last_tickers.exec(function(err,last_tickers){
											if(err){ 
												ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
											}
											
											if(!_.isEmpty(last_tickers)){
												last_tickers=last_tickers.tickers;
												_.forEach(last_tickers,function(ticker){
													if(!_.isEmpty(ticker.baseAsset)){
														var filter=_.filter(tickers,{symbol:ticker.symbol});
														if(!_.isEmpty(filter)){
															filter=_.head(filter);
															if(filter.lastPrice==ticker.lastPrice){
																tickers=_.reject(tickers,{symbol:ticker.symbol});
															}
														}
													}	
												});
											}
											
											ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers,date_created:curDateTime},function(err, data){
												if(err){ 
													ApiService.exchangeErrors(exchange,'query_insert',err,'alert_insert',curDateTime);
												}
												return exchange;
											});
										});
									}
									catch(e){
										ApiService.exchangeErrors(exchange,'api',e,'alert_api_select',curDateTime);
										return 'failed';
									}
								}).
								catch(err => { 
									ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
									return 'failed';
								});
							break;
							case 'huobi':
								var products=data.products.data;
								return Promise.all(products.map((product) => {
										return ApiService.huobiMarketTicker(product['base-currency']+product['quote-currency']).
										then(ticker => {
											ticker=JSON.parse(ticker);
											ticker.product=product['base-currency']+product['quote-currency'];
											ticker.base_currency=product['base-currency'];
											ticker.quote_currency=product['quote-currency'];
											//PROCESS TO FORMAT VALUE IF THERE IS ANY EXPONENTIAL VALUE
											ticker.tick.open=math.format(ticker.tick.open,{lowerExp: -100, upperExp: 100});
											ticker.tick.close=math.format(ticker.tick.close,{lowerExp: -100, upperExp: 100});
											ticker.tick.high=math.format(ticker.tick.high,{lowerExp: -100, upperExp: 100});
											ticker.tick.low=math.format(ticker.tick.low,{lowerExp: -100, upperExp: 100});
											ticker.tick.ask[0]=math.format(ticker.tick.ask[0],{lowerExp: -100, upperExp: 100});
											ticker.tick.ask[1]=math.format(ticker.tick.ask[1],{lowerExp: -100, upperExp: 100});
											ticker.tick.bid[0]=math.format(ticker.tick.bid[0],{lowerExp: -100, upperExp: 100});
											ticker.tick.bid[1]=math.format(ticker.tick.bid[1],{lowerExp: -100, upperExp: 100});
											
											return ticker;
										}).
										catch(err => { 
											ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
											return '';
										});
									})).
								then(tickers => {
									var tickers_data=[];	
									_.forEach(tickers,function(ticker){
										if(!_.isEmpty(ticker) && !_.isEmpty(ticker.tick) && _.isEmpty(ticker.error_code)){
											tickers_data.push(ticker);
										}
									});
									if(!_.isEmpty(tickers_data)){
										//PROCESS TO MATCH WITH LAST PRICE
										var last_tickers=ExchangeTickersAlerts.findOne();
										last_tickers.where({exchange_id:exchange_id});
										last_tickers.sort('id DESC');
										last_tickers.exec(function(err,last_tickers){
											if(err){ 
												ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
											}
											
											if(!_.isEmpty(last_tickers)){
												last_tickers=last_tickers.tickers;
												_.forEach(last_tickers,function(ticker){
													var filter=_.filter(tickers,{product:ticker.product});
													if(!_.isEmpty(filter)){
														filter=_.head(filter);
														if(filter.tick.bid[0]==ticker.tick.bid[0]){
															tickers=_.reject(tickers,{product:ticker.product});
														}
													}
												});
											}
											
											ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers_data,date_created:curDateTime},function(err,data){
												if(err){ 
													ApiService.exchangeErrors(exchange,'query_insert',err,'alert_insert',curDateTime);
												}
												return exchange;
											});
										});
									}
									else{
										return 'failed';
									}
								}).
								catch(err => { 
									ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
									return 'failed';
								});
							break;
							case 'gemini':
								var products=data.products;
								return Promise.all(products.map((product) => {
										return ApiService.geminiMarketTicker(product).
										then(ticker => {
											ticker=JSON.parse(ticker);
											var keys=Object.keys(ticker.volume);
											keys=_.remove(keys, function(key){return key!='timestamp';});
											if(_.toLower(keys[0]+keys[1])==_.toLower(product)){
												ticker.vol=ticker.volume[keys[1]];
												ticker.currency=keys[0];
											}
											else{
												ticker.vol=ticker.volume[keys[0]];
												ticker.currency=keys[1];
											}
											ticker.product=product;
											return ticker;
										}).
										catch(err => { 
											ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
											return '';
										});
									})).
								then(tickers => {
									var tickers_data=[];	
									_.forEach(tickers,function(ticker){
										if(!_.isEmpty(ticker)){
											tickers_data.push(ticker);
										}
									});
									if(!_.isEmpty(tickers_data)){
										//PROCESS TO MATCH WITH LAST PRICE
										var last_tickers=ExchangeTickersAlerts.findOne();
										last_tickers.where({exchange_id:exchange_id});
										last_tickers.sort('id DESC');
										last_tickers.exec(function(err,last_tickers){
											if(err){ 
												ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
											}
											
											if(!_.isEmpty(last_tickers)){
												last_tickers=last_tickers.tickers;
												_.forEach(last_tickers,function(ticker){
													var filter=_.filter(tickers_data,{product:ticker.product});
													if(!_.isEmpty(filter)){
														filter=_.head(filter);
														if(filter.last==ticker.last){
															tickers_data=_.reject(tickers_data,{product:ticker.product});
														}
													}
												});
											}
											
											ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers_data,date_created:curDateTime},function(err,data){
												if(err){ 
													ApiService.exchangeErrors(exchange,'query_insert',err,'alert_insert',curDateTime);
												}
												return exchange;
											});
											
										});
									}
									else{
										return 'failed';
									}
								}).
								catch(err => { 
									ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
									return 'failed';
								});
							break;
						}
					}
				});
			})).
			then(response => {
				var temp=[];
				_.forEach(exchanges,function(exchange){
					if(exchange!='failed'){
						temp.push(exchange);
					}
				});
				if(!_.isEmpty(temp)){
					PredatorTradeService.predators_data_alerts(temp);
				}
			}).
			catch(err => {
				ApiService.exchangeErrors(_.join(exchanges,'-'),'api',err,'alert_api_select',curDateTime);
			});
			
			
			//PROCESS TO INSERT KUNA TICKERS
			/*ExchangeList.findOne({name:'kuna'},function(err,data){
				if(err){ 
					ApiService.exchangeErrors('kuna','query_select',err,'alert_select',curDateTime);
				}
				if(!_.isEmpty(data)){
					var exchange_id=data.id;
					ApiService.kunaMarketTicker().then(tickers=>{
						try{
							var temp=[];
							tickers=JSON.parse(tickers);
							var products=Object.keys(tickers);
							
							_.forEach(products,function(product){
								if(!_.isEmpty(tickers[product])){
									var ticker=tickers[product];
									ticker=ticker.ticker;
									ticker.product=product;
									temp.push(ticker);
								}
							});	
							
							tickers=temp;
							//PROCESS TO MATCH WITH LAST PRICE
							var last_tickers=ExchangeTickersAlerts.findOne();
							last_tickers.where({exchange_id:exchange_id});
							last_tickers.sort('id DESC');
							last_tickers.exec(function(err,last_tickers){
								if(err){ 
									ApiService.exchangeErrors('kuna','query_select',err,'alert_select',curDateTime);
								}
								
								if(!_.isEmpty(last_tickers)){
									last_tickers=last_tickers.tickers;
									_.forEach(last_tickers,function(ticker){
										var filter=_.filter(tickers,{product:ticker.product});
										if(!_.isEmpty(filter)){
											filter=_.head(filter);
											if(filter.last==ticker.last){
												tickers=_.reject(tickers,{product:ticker.product});
											}
										}
									});
								}
								
								ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers,date_created:curDateTime},function(err,data){
									if(err){ 
										ApiService.exchangeErrors('kuna','query_insert',err,'alert_insert',curDateTime);
									}
									else{
										PredatorTradeService.predators_data_alerts('kuna');
									}
								});
							});
						}
						catch (e){
							ApiService.exchangeErrors('kuna','api',e,'alert_api_select',curDateTime);
						}
					}).
					catch(err=> { 
						ApiService.exchangeErrors('kuna','api',err,'alert_api_select',curDateTime);
					});	
				}	
			});	*/
		
			//PROCESS TO INSERT OKEX PRODUCTS TICKERS
			/*ExchangeList.findOne({name:'okex'},function(err,data){
				if(err){ 
					ApiService.exchangeErrors('okex','query_select',err,'alert_select',curDateTime);
				}
				if(!_.isEmpty(data)){
					var exchange_id=data.id;
					var products=data.products;
					return Promise.all(products.map((product) => {
							return ApiService.okexMarketTicker(product).
							then(ticker => {
								ticker=JSON.parse(ticker);
								ticker.product=product;
								return ticker;
							}).
							catch(err => { 
								ApiService.exchangeErrors('okex','api',err,'alert_api_select',curDateTime);
							});
						})).
					then(tickers => {
						var tickers_data=[];	
						_.forEach(tickers,function(ticker){
							if(!_.isEmpty(ticker) && _.isEmpty(ticker.error_code)){
								tickers_data.push(ticker);
							}
						});
						if(!_.isEmpty(tickers_data)){
							//PROCESS TO MATCH WITH LAST PRICE
							var last_tickers=ExchangeTickersAlerts.findOne();
							last_tickers.where({exchange_id:exchange_id});
							last_tickers.sort('id DESC');
							last_tickers.exec(function(err,last_tickers){
								if(err){ 
									ApiService.exchangeErrors('okex','query_select',err,'alert_select',curDateTime);
								}
								
								if(!_.isEmpty(last_tickers)){
									last_tickers=last_tickers.tickers;
									_.forEach(last_tickers,function(ticker){
										var filter=_.filter(tickers_data,{product:ticker.product});
										if(!_.isEmpty(filter)){
											filter=_.head(filter);
											if(filter.last==ticker.last){
												tickers_data=_.reject(tickers_data,{product:ticker.product});
											}
										}
									});
								}
								
								ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers_data,date_created:curDateTime},function(err,data){
									if(err){ 
										ApiService.exchangeErrors('okex','query_insert',err,'alert_insert',curDateTime);
									}
									else{
										PredatorTradeService.predators_data_alerts('okex');
									}
								});
								
							});
						}
					}).
					catch(err=> { 
						ApiService.exchangeErrors('okex','api',err,'alert_api_select',curDateTime);
					});
				}	
			});*/
		
			//PROCESS TO INSERT BINANCE TICKERS
			/*ExchangeList.findOne({name:'binance'},function(err, data){
				if(err){ 
					ApiService.exchangeErrors('binance','query_select',err,'alert_select',curDateTime);
				}
				if(!_.isEmpty(data)){
					var exchange_id=data.id;
					var products=data.products.symbols;
					ApiService.binanceMarketTicker().
					then(tickers => {
						try{
							tickers=JSON.parse(tickers);
							var temp=[];
							_.forEach(tickers,function(ticker){
								var product=_.filter(products,{symbol:ticker.symbol});
								if(!_.isEmpty(product)){
									product=_.head(product);
									ticker.baseAsset=product.baseAsset;
									ticker.quoteAsset=product.quoteAsset;
									temp.push(ticker);
								}
							});
							tickers=temp;
							//PROCESS TO MATCH WITH LAST PRICE
							var last_tickers=ExchangeTickersAlerts.findOne();
							last_tickers.where({exchange_id:exchange_id});
							last_tickers.sort('id DESC');
							last_tickers.exec(function(err,last_tickers){
								if(err){ 
									ApiService.exchangeErrors('binance','query_select',err,'alert_select',curDateTime);
								}
								
								if(!_.isEmpty(last_tickers)){
									last_tickers=last_tickers.tickers;
									_.forEach(last_tickers,function(ticker){
										if(!_.isEmpty(ticker.baseAsset)){
											var filter=_.filter(tickers,{symbol:ticker.symbol});
											if(!_.isEmpty(filter)){
												filter=_.head(filter);
												if(filter.lastPrice==ticker.lastPrice){
													tickers=_.reject(tickers,{symbol:ticker.symbol});
												}
											}
										}	
									});
								}
								
								ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers,date_created:curDateTime},function(err, data){
									if(err){ 
										ApiService.exchangeErrors('binance','query_insert',err,'alert_insert',curDateTime);
									}
									else{
										PredatorTradeService.predators_data_alerts('binance');
									}
								});
							});
						}
						catch(e){
							ApiService.exchangeErrors('binance','api',e,'alert_api_select',curDateTime);
						}
					}).
					catch(err => { 
						ApiService.exchangeErrors('binance','api',err,'alert_api_select',curDateTime);
					});
				}
			});*/
		
			//PROCESS TO INSERT HUOBI MARKET TICKERS
			/*ExchangeList.findOne({name:'huobi'},function(err, data){
				if(err){ 
					ApiService.exchangeErrors('huobi','query_select',err,'alert_select',curDateTime);
				}
				if(!_.isEmpty(data)){
					var exchange_id=data.id;
					var products=data.products.data;
					return Promise.all(products.map((product) => {
							return ApiService.huobiMarketTicker(product['base-currency']+product['quote-currency']).
							then(ticker => {
								ticker=JSON.parse(ticker);
								ticker.product=product['base-currency']+product['quote-currency'];
								ticker.base_currency=product['base-currency'];
								ticker.quote_currency=product['quote-currency'];
								//PROCESS TO FORMAT VALUE IF THERE IS ANY EXPONENTIAL VALUE
								ticker.tick.open=math.format(ticker.tick.open,{lowerExp: -100, upperExp: 100});
								ticker.tick.close=math.format(ticker.tick.close,{lowerExp: -100, upperExp: 100});
								ticker.tick.high=math.format(ticker.tick.high,{lowerExp: -100, upperExp: 100});
								ticker.tick.low=math.format(ticker.tick.low,{lowerExp: -100, upperExp: 100});
								ticker.tick.ask[0]=math.format(ticker.tick.ask[0],{lowerExp: -100, upperExp: 100});
								ticker.tick.ask[1]=math.format(ticker.tick.ask[1],{lowerExp: -100, upperExp: 100});
								ticker.tick.bid[0]=math.format(ticker.tick.bid[0],{lowerExp: -100, upperExp: 100});
								ticker.tick.bid[1]=math.format(ticker.tick.bid[1],{lowerExp: -100, upperExp: 100});
								
								return ticker;
							}).
							catch(err => { 
								ApiService.exchangeErrors('huobi','api',err,'alert_api_select',curDateTime);
							});
						})).
					then(tickers => {
						var tickers_data=[];	
						_.forEach(tickers,function(ticker){
							if(!_.isEmpty(ticker) && !_.isEmpty(ticker.tick) && _.isEmpty(ticker.error_code)){
								tickers_data.push(ticker);
							}
						});
						if(!_.isEmpty(tickers_data)){
							//PROCESS TO MATCH WITH LAST PRICE
							var last_tickers=ExchangeTickersAlerts.findOne();
							last_tickers.where({exchange_id:exchange_id});
							last_tickers.sort('id DESC');
							last_tickers.exec(function(err,last_tickers){
								if(err){ 
									ApiService.exchangeErrors('huobi','query_select',err,'alert_select',curDateTime);
								}
								
								if(!_.isEmpty(last_tickers)){
									last_tickers=last_tickers.tickers;
									_.forEach(last_tickers,function(ticker){
										var filter=_.filter(tickers,{product:ticker.product});
										if(!_.isEmpty(filter)){
											filter=_.head(filter);
											if(filter.tick.bid[0]==ticker.tick.bid[0]){
												tickers=_.reject(tickers,{product:ticker.product});
											}
										}
									});
								}
								
								ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers_data,date_created:curDateTime},function(err,data){
									if(err){ 
										ApiService.exchangeErrors('huobi','query_insert',err,'alert_insert',curDateTime);
									}
									else{
										PredatorTradeService.predators_data_alerts('huobi');
									}
								});
							});
						}
					}).
					catch(err => { 
						ApiService.exchangeErrors('huobi','api',err,'alert_api_select',curDateTime);
					});
				}
			});*/

			//PROCESS TO INSERT GEMINI MARKET TICKERS
			/*ExchangeList.findOne({name:'gemini'},function(err, data){
				if(err){ 
					ApiService.exchangeErrors('gemini','query_select',err,'alert_select',curDateTime);
				}
				if(!_.isEmpty(data)){
					var exchange_id=data.id;
					var products=data.products;
					return Promise.all(products.map((product) => {
							return ApiService.geminiMarketTicker(product).
							then(ticker => {
								ticker=JSON.parse(ticker);
								var keys=Object.keys(ticker.volume);
								keys=_.remove(keys, function(key){return key!='timestamp';});
								if(_.toLower(keys[0]+keys[1])==_.toLower(product)){
									ticker.vol=ticker.volume[keys[1]];
									ticker.currency=keys[0];
								}
								else{
									ticker.vol=ticker.volume[keys[0]];
									ticker.currency=keys[1];
								}
								ticker.product=product;
								return ticker;
							}).
							catch(err => { 
								ApiService.exchangeErrors('gemini','api',err,'alert_api_select',curDateTime);
							});
						})).
					then(tickers => {
						var tickers_data=[];	
						_.forEach(tickers,function(ticker){
							if(!_.isEmpty(ticker)){
								tickers_data.push(ticker);
							}
						});
						if(!_.isEmpty(tickers_data)){
							//PROCESS TO MATCH WITH LAST PRICE
							var last_tickers=ExchangeTickersAlerts.findOne();
							last_tickers.where({exchange_id:exchange_id});
							last_tickers.sort('id DESC');
							last_tickers.exec(function(err,last_tickers){
								if(err){ 
									ApiService.exchangeErrors('gemini','query_select',err,'alert_select',curDateTime);
								}
								
								if(!_.isEmpty(last_tickers)){
									last_tickers=last_tickers.tickers;
									_.forEach(last_tickers,function(ticker){
										var filter=_.filter(tickers_data,{product:ticker.product});
										if(!_.isEmpty(filter)){
											filter=_.head(filter);
											if(filter.last==ticker.last){
												tickers_data=_.reject(tickers_data,{product:ticker.product});
											}
										}
									});
								}
								
								ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers_data,date_created:curDateTime},function(err,data){
									if(err){ 
										ApiService.exchangeErrors('gemini','query_insert',err,'alert_insert',curDateTime);
									}
									else{
										PredatorTradeService.predators_data_alerts('gemini');
									}
								});
								
							});
						}
					}).
					catch(err => { 
						ApiService.exchangeErrors('gemini','api',err,'alert_api_select',curDateTime);
					});
				}
			});*/
		}
		else if(rand<=(rand_match_ratio*3)){
			var exchanges=['kraken','bitflyer','bithumb','bitstamp','bitz'];
			return Promise.all(exchanges.map(exchange => {
				ExchangeList.findOne({name:exchange},function(err,data){
					if(err){ 
						ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
					}
					if(!_.isEmpty(data)){
						var exchange_id=data.id;
						switch(exchange){
							case 'kraken':
								var temp=[];
								var products=data.products.result;
					
								_.forEach(Object.keys(products),function(product_name){
									temp.push({name:product_name,base:products[product_name].base,quote:products[product_name].quote});
								});
								products=temp;
								return Promise.all(products.map((product) => {
									return ApiService.krakenMarketTicker(product.name).
									then(ticker => {
										ticker=JSON.parse(ticker);
										ticker.product=product.name;
										ticker.base_currency=product.base;
										ticker.quote_currency=product.quote;
										return ticker;
									}).
									catch(err => { 
										ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
										return '';
									});
								})).
								then(tickers => {
									
									var tickers_data=[];
									_.forEach(tickers,function(ticker){
										if(!_.isEmpty(ticker) &&_.isEmpty(ticker.error)){
											ticker.price=ticker.result[ticker.product].l[0];
											ticker.last=ticker.price;
											ticker.bid=ticker.result[ticker.product].b[0];
											ticker.ask=ticker.result[ticker.product].a[0];
											ticker.volume=ticker.result[ticker.product].v[1];
											ticker.low=ticker.result[ticker.product].l[1];
											ticker.high=ticker.result[ticker.product].h[1];
											tickers_data.push(ticker);
										}
									});
									
									if(!_.isEmpty(tickers_data)){
										//PROCESS TO MATCH WITH LAST PRICE
										var last_tickers=ExchangeTickersAlerts.findOne();
										last_tickers.where({exchange_id:exchange_id});
										last_tickers.sort('id DESC');
										last_tickers.exec(function(err,last_tickers){
											if(err){ 
												ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
											}
											
											if(!_.isEmpty(last_tickers)){
												last_tickers=last_tickers.tickers;
												_.forEach(last_tickers,function(ticker){
													var filter=_.filter(tickers_data,{product:ticker.product});
													if(!_.isEmpty(filter)){
														filter=_.head(filter);
														if(filter.last==ticker.last){
															tickers_data=_.reject(tickers_data,{product:ticker.product});
														}
													}
												});
											}
											
											ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers_data,date_created:curDateTime},function(err,data){
												if(err){ 
													ApiService.exchangeErrors(exchange,'query_insert',err,'alert_insert',curDateTime);
												}
												return exchange;
											});
										});
									}
									else{
										return 'failed';
									}
								}).
								catch(err => { 
									ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
									return 'failed';
								});
							break;
							case 'bitflyer':
								var products=data.products;
								var temp=[];
								_.forEach(products,function(product){
									if(_.isEmpty(product.alias) && 	(((product.product_code.match(/_/g) || []).length)==1)){
										temp.push(product);
									}
								});
								products=temp;
								return Promise.all(products.map((product) => {
									return ApiService.bitflyerMarketTicker(product.product_code).
									then(ticker => {
										ticker=JSON.parse(ticker);
										ticker.product=product.product_code;
										ticker.base_currency=_.join(_.split(product.product_code,'_',1));
										ticker.quote_currency=_.replace(product.product_code,ticker.base_currency+'_','');
										return ticker;
									}).
									catch(err => { 
										ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
										return '';
									});
								})).
								then(tickers => {
									var tickers_data=[];	
									_.forEach(tickers,function(ticker){
										if(!_.isEmpty(ticker)){
											tickers_data.push(ticker);
										}
									});
									if(!_.isEmpty(tickers_data)){
										//PROCESS TO MATCH WITH LAST PRICE
										var last_tickers=ExchangeTickersAlerts.findOne();
										last_tickers.where({exchange_id:exchange_id});
										last_tickers.sort('id DESC');
										last_tickers.exec(function(err,last_tickers){
											if(err){ 
												ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
											}
											
											if(!_.isEmpty(last_tickers)){
												last_tickers=last_tickers.tickers;
												_.forEach(last_tickers,function(ticker){
													var filter=_.filter(tickers_data,{product:ticker.product});
													if(!_.isEmpty(filter)){
														filter=_.head(filter);
														if(filter.best_bid==ticker.best_bid){
															tickers_data=_.reject(tickers_data,{product:ticker.product});
														}
													}
												});
											}
											
											ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers_data,date_created:curDateTime},function(err,data){
												if(err){ 
													ApiService.exchangeErrors(exchange,'query_insert',err,'alert_insert',curDateTime);
												}
												return exchange;
											});
										});
									}
									else{
										return 'failed';
									}
								}).
								catch(err => { 
									ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
									return 'failed';
								});
							break;
							case 'bithumb':
								ApiService.bithumbMarketTicker().
								then(tickers => {
									try{
										tickers=JSON.parse(tickers);
										if(parseInt(tickers.status)==0){
											var temp=[];
											_.forEach(Object.keys(tickers.data),function(currency){
												if(currency!='date'){
													var ticker=tickers.data[currency];
													ticker.base_currency=currency;
													ticker.quote_currency='KRW';
													ticker.product=currency+'KRW';
													temp.push(ticker);
												}
											});
											tickers=temp;
											//PROCESS TO MATCH WITH LAST PRICE
											var last_tickers=ExchangeTickersAlerts.findOne();
											last_tickers.where({exchange_id:exchange_id});
											last_tickers.sort('id DESC');
											last_tickers.exec(function(err,last_tickers){
												if(err){ 
													ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
												}
												
												if(!_.isEmpty(last_tickers)){
													last_tickers=last_tickers.tickers;
													_.forEach(last_tickers,function(ticker){
														if(!_.isEmpty(ticker.product)){
															var filter=_.filter(tickers,{product:ticker.product});
															if(!_.isEmpty(filter)){
																filter=_.head(filter);
																if(filter.buy_price==ticker.buy_price){
																	tickers=_.reject(tickers,{product:ticker.product});
																}
															}
														}
													});
												}
												
												ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers,date_created:curDateTime},function(err, data){
													if(err){ 
														ApiService.exchangeErrors(exchange,'query_insert',err,'alert_insert',curDateTime);
													}
													return exchange;
												});
											});
										}
									}
									catch(e){
										ApiService.exchangeErrors(exchange,'api',e,'alert_api_select',curDateTime);
										return 'failed';
									}
								}).
								catch(err => { 
									ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
									return 'failed';
								});
							break;
							case 'bitstamp':
								var products=data.products;
								return Promise.all(products.map((product) => {
									return ApiService.bitstampMarketTicker(product.url_symbol).
									then(ticker => {
										ticker=JSON.parse(ticker);
										ticker.product=product.url_symbol;
										ticker.base_currency=_.join(_.split(product.name,'/',1));
										ticker.quote_currency=_.replace(product.name,ticker.base_currency+'/','');
										return ticker;
									}).
									catch(err => { 
										ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
										return '';
									});
								})).
								then(tickers => {
									var tickers_data=[];	
									_.forEach(tickers,function(ticker){
										if(!_.isEmpty(ticker)){
											tickers_data.push(ticker);
										}
									});
									if(!_.isEmpty(tickers_data)){
										//PROCESS TO MATCH WITH LAST PRICE
										var last_tickers=ExchangeTickersAlerts.findOne();
										last_tickers.where({exchange_id:exchange_id});
										last_tickers.sort('id DESC');
										last_tickers.exec(function(err,last_tickers){
											if(err){ 
												ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
											}
											
											if(!_.isEmpty(last_tickers)){
												last_tickers=last_tickers.tickers;
												_.forEach(last_tickers,function(ticker){
													var filter=_.filter(tickers_data,{product:ticker.product});
													if(!_.isEmpty(filter)){
														filter=_.head(filter);
														if(filter.last==ticker.last){
															tickers_data=_.reject(tickers_data,{product:ticker.product});
														}
													}
												});
											}
											
											ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers_data,date_created:curDateTime},function(err,data){
												if(err){ 
													ApiService.exchangeErrors(exchange,'query_insert',err,'alert_insert',curDateTime);
												}
												return exchange;
											});
										});
									}
									else{
										return 'failed';
									}
								}).
								catch(err => { 
									ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
									return 'failed';
								});
							break;
							case 'bitz':
								ApiService.bitzMarketTicker().then(tickers=>{
									try{
										var temp=[];
										tickers=JSON.parse(tickers);
										if(parseInt(tickers.code)==0){
											var products=Object.keys(tickers.data);
											_.forEach(products,function(product){
												var ticker=tickers.data[product];
												ticker.product=product;
												ticker.base_currency=_.join(_.split(product,'_',1));
												ticker.quote_currency=_.replace(product,ticker.base_currency+'_','');
												temp.push(ticker);
											});
											tickers=temp;
											//PROCESS TO MATCH WITH LAST PRICE
											var last_tickers=ExchangeTickersAlerts.findOne();
											last_tickers.where({exchange_id:exchange_id});
											last_tickers.sort('id DESC');
											last_tickers.exec(function(err,last_tickers){
												if(err){ 
													ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
												}
												
												if(!_.isEmpty(last_tickers)){
													last_tickers=last_tickers.tickers;
													_.forEach(last_tickers,function(ticker){
														var filter=_.filter(tickers,{product:ticker.product});
														if(!_.isEmpty(filter)){
															filter=_.head(filter);
															if(filter.last==ticker.last){
																tickers=_.reject(tickers,{product:ticker.product});
															}
														}
													});
												}
												
												ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers,date_created:curDateTime},function(err,data){
													if(err){ 
														ApiService.exchangeErrors(exchange,'query_insert',err,'alert_insert',curDateTime);
													}
													return exchange;
												});
											});
										}
									}
									catch (e){
										ApiService.exchangeErrors(exchange,'api',e,'alert_api_select',curDateTime);
										return 'failed';
									}
								}).
								catch(err=> { 
									ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
									return 'failed';
								});
							break;
						}
					}
				});
			})).
			then(response => {
				var temp=[];
				_.forEach(exchanges,function(exchange){
					if(exchange!='failed'){
						temp.push(exchange);
					}
				});
				if(!_.isEmpty(temp)){
					PredatorTradeService.predators_data_alerts(temp);
				}
			}).
			catch(err => {
				ApiService.exchangeErrors(_.join(exchanges,'-'),'api',err,'alert_api_select',curDateTime);
			});		
										
			//PROCESS TO INSERT KRAKEN MARKET TICKERS
			/*ExchangeList.findOne({name:'kraken'},function(err,data){
				if(err){ 
					ApiService.exchangeErrors('kraken','query_select',err,'alert_select',curDateTime);
				}
				if(!_.isEmpty(data)){
					var exchange_id=data.id;
					var temp=[];
					var products=data.products.result;
		
					_.forEach(Object.keys(products),function(product_name){
						temp.push({name:product_name,base:products[product_name].base,quote:products[product_name].quote});
					});
					products=temp;
					return Promise.all(products.map((product) => {
						return ApiService.krakenMarketTicker(product.name).
						then(ticker => {
							ticker=JSON.parse(ticker);
							ticker.product=product.name;
							ticker.base_currency=product.base;
							ticker.quote_currency=product.quote;
							return ticker;
						}).
						catch(err => { 
							ApiService.exchangeErrors('kraken','api',err,'alert_api_select',curDateTime);
						});
					})).
					then(tickers => {
						
						var tickers_data=[];
						_.forEach(tickers,function(ticker){
							if(!_.isEmpty(ticker) &&_.isEmpty(ticker.error)){
								ticker.price=ticker.result[ticker.product].l[0];
								ticker.last=ticker.price;
								ticker.bid=ticker.result[ticker.product].b[0];
								ticker.ask=ticker.result[ticker.product].a[0];
								ticker.volume=ticker.result[ticker.product].v[1];
								ticker.low=ticker.result[ticker.product].l[1];
								ticker.high=ticker.result[ticker.product].h[1];
								tickers_data.push(ticker);
							}
						});
						
						if(!_.isEmpty(tickers_data)){
							//PROCESS TO MATCH WITH LAST PRICE
							var last_tickers=ExchangeTickersAlerts.findOne();
							last_tickers.where({exchange_id:exchange_id});
							last_tickers.sort('id DESC');
							last_tickers.exec(function(err,last_tickers){
								if(err){ 
									ApiService.exchangeErrors('kraken','query_select',err,'alert_select',curDateTime);
								}
								
								if(!_.isEmpty(last_tickers)){
									last_tickers=last_tickers.tickers;
									_.forEach(last_tickers,function(ticker){
										var filter=_.filter(tickers_data,{product:ticker.product});
										if(!_.isEmpty(filter)){
											filter=_.head(filter);
											if(filter.last==ticker.last){
												tickers_data=_.reject(tickers_data,{product:ticker.product});
											}
										}
									});
								}
								
								ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers_data,date_created:curDateTime},function(err,data){
									if(err){ 
										ApiService.exchangeErrors('kraken','query_insert',err,'alert_insert',curDateTime);
									}
									else{
										PredatorTradeService.predators_data_alerts('kraken');
									}
								});
								
							});
						}
					}).
					catch(err => { 
						ApiService.exchangeErrors('kraken','api',err,'alert_api_select',curDateTime);
					});
				}
			});*/
		
			//PROCESS TO INSERT BITFLYER MARKET TICKERS
			/*ExchangeList.findOne({name:'bitflyer'},function(err,data){
				if(err){ 
					ApiService.exchangeErrors('bitflyer','query_select',err,'alert_select',curDateTime);
				}
				if(!_.isEmpty(data)){
					var exchange_id=data.id;
					var products=data.products;
					var temp=[];
					_.forEach(products,function(product){
						if(_.isEmpty(product.alias) && 	(((product.product_code.match(/_/g) || []).length)==1)){
							temp.push(product);
						}
					});
					products=temp;
					return Promise.all(products.map((product) => {
						return ApiService.bitflyerMarketTicker(product.product_code).
						then(ticker => {
							ticker=JSON.parse(ticker);
							ticker.product=product.product_code;
							ticker.base_currency=_.join(_.split(product.product_code,'_',1));
							ticker.quote_currency=_.replace(product.product_code,ticker.base_currency+'_','');
							return ticker;
						}).
						catch(err => { 
							ApiService.exchangeErrors('bitflyer','api',err,'alert_api_select',curDateTime);
						});
					})).
					then(tickers => {
						var tickers_data=[];	
						_.forEach(tickers,function(ticker){
							if(!_.isEmpty(ticker)){
								tickers_data.push(ticker);
							}
						});
						if(!_.isEmpty(tickers_data)){
							//PROCESS TO MATCH WITH LAST PRICE
							var last_tickers=ExchangeTickersAlerts.findOne();
							last_tickers.where({exchange_id:exchange_id});
							last_tickers.sort('id DESC');
							last_tickers.exec(function(err,last_tickers){
								if(err){ 
									ApiService.exchangeErrors('bitflyer','query_select',err,'alert_select',curDateTime);
								}
								
								if(!_.isEmpty(last_tickers)){
									last_tickers=last_tickers.tickers;
									_.forEach(last_tickers,function(ticker){
										var filter=_.filter(tickers_data,{product:ticker.product});
										if(!_.isEmpty(filter)){
											filter=_.head(filter);
											if(filter.best_bid==ticker.best_bid){
												tickers_data=_.reject(tickers_data,{product:ticker.product});
											}
										}
									});
								}
								
								ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers_data,date_created:curDateTime},function(err,data){
									if(err){ 
										ApiService.exchangeErrors('bitflyer','query_insert',err,'alert_insert',curDateTime);
									}
									else{
										PredatorTradeService.predators_data_alerts('bitflyer');
									}
								});
								
							});
						}
					}).
					catch(err => { 
						ApiService.exchangeErrors('bitflyer','api',err,'alert_api_select',curDateTime);
					});
				}
			});*/
		
			//PROCESS TO INSERT BITHUMB MARKET TICKERS
			/*ExchangeList.findOne({name:'bithumb'},function(err, data){
				if(err){ 
					ApiService.exchangeErrors('bithumb','query_select',err,'alert_select',curDateTime);
				}
				if(!_.isEmpty(data)){
					var exchange_id=data.id;
					ApiService.bithumbMarketTicker().
					then(tickers => {
						try{
							tickers=JSON.parse(tickers);
							if(parseInt(tickers.status)==0){
								var temp=[];
								_.forEach(Object.keys(tickers.data),function(currency){
									if(currency!='date'){
										var ticker=tickers.data[currency];
										ticker.base_currency=currency;
										ticker.quote_currency='KRW';
										ticker.product=currency+'KRW';
										temp.push(ticker);
									}
								});
								tickers=temp;
								//PROCESS TO MATCH WITH LAST PRICE
								var last_tickers=ExchangeTickersAlerts.findOne();
								last_tickers.where({exchange_id:exchange_id});
								last_tickers.sort('id DESC');
								last_tickers.exec(function(err,last_tickers){
									if(err){ 
										ApiService.exchangeErrors('bithumb','query_select',err,'alert_select',curDateTime);
									}
									
									if(!_.isEmpty(last_tickers)){
										last_tickers=last_tickers.tickers;
										_.forEach(last_tickers,function(ticker){
											if(!_.isEmpty(ticker.product)){
												var filter=_.filter(tickers,{product:ticker.product});
												if(!_.isEmpty(filter)){
													filter=_.head(filter);
													if(filter.buy_price==ticker.buy_price){
														tickers=_.reject(tickers,{product:ticker.product});
													}
												}
											}
										});
									}
									
									ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers,date_created:curDateTime},function(err, data){
										if(err){ 
											ApiService.exchangeErrors('bithumb','query_insert',err,'alert_insert',curDateTime);
										}
										else{
											PredatorTradeService.predators_data_alerts('bithumb');
										}
									});
								});
							}
						}
						catch(e){
							ApiService.exchangeErrors('bithumb','api',e,'alert_api_select',curDateTime);
						}
					}).
					catch(err => { 
						ApiService.exchangeErrors('bithumb','api',err,'alert_api_select',curDateTime);
					});
				}
			});*/
		
			//PROCESS TO INSERT BITSTAMP MARKET TICKERS
			/*ExchangeList.findOne({name:'bitstamp'},function(err,data){
				if(err){ 
					ApiService.exchangeErrors('bitstamp','query_select',err,'alert_select',curDateTime);
				}
				if(!_.isEmpty(data)){
					var exchange_id=data.id;
					var products=data.products;
					return Promise.all(products.map((product) => {
						return ApiService.bitstampMarketTicker(product.url_symbol).
						then(ticker => {
							ticker=JSON.parse(ticker);
							ticker.product=product.url_symbol;
							ticker.base_currency=_.join(_.split(product.name,'/',1));
							ticker.quote_currency=_.replace(product.name,ticker.base_currency+'/','');
							return ticker;
						}).
						catch(err => { 
							ApiService.exchangeErrors('bitstamp','api',err,'alert_api_select',curDateTime);
						});
					})).
					then(tickers => {
						var tickers_data=[];	
						_.forEach(tickers,function(ticker){
							if(!_.isEmpty(ticker)){
								tickers_data.push(ticker);
							}
						});
						if(!_.isEmpty(tickers_data)){
							//PROCESS TO MATCH WITH LAST PRICE
							var last_tickers=ExchangeTickersAlerts.findOne();
							last_tickers.where({exchange_id:exchange_id});
							last_tickers.sort('id DESC');
							last_tickers.exec(function(err,last_tickers){
								if(err){ 
									ApiService.exchangeErrors('bitstamp','query_select',err,'alert_select',curDateTime);
								}
								
								if(!_.isEmpty(last_tickers)){
									last_tickers=last_tickers.tickers;
									_.forEach(last_tickers,function(ticker){
										var filter=_.filter(tickers_data,{product:ticker.product});
										if(!_.isEmpty(filter)){
											filter=_.head(filter);
											if(filter.last==ticker.last){
												tickers_data=_.reject(tickers_data,{product:ticker.product});
											}
										}
									});
								}
								
								ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers_data,date_created:curDateTime},function(err,data){
									if(err){ 
										ApiService.exchangeErrors('bitstamp','query_insert',err,'alert_insert',curDateTime);
									}
									else{
										PredatorTradeService.predators_data_alerts('bitstamp');
									}
								});
							});
						}
					}).
					catch(err => { 
						ApiService.exchangeErrors('bitstamp','api',err,'alert_api_select',curDateTime);
					});
				}
			});*/
		
			//PROCESS TO INSERT BIT-Z MARKET TICKERS
			/*ExchangeList.findOne({name:'bitz'},function(err,data){
				if(err){ 
					ApiService.exchangeErrors('bitz','query_select',err,'alert_select',curDateTime);
				}
				if(!_.isEmpty(data)){
					var exchange_id=data.id;
					ApiService.bitzMarketTicker().then(tickers=>{
						try{
							var temp=[];
							tickers=JSON.parse(tickers);
							if(parseInt(tickers.code)==0){
								var products=Object.keys(tickers.data);
								_.forEach(products,function(product){
									var ticker=tickers.data[product];
									ticker.product=product;
									ticker.base_currency=_.join(_.split(product,'_',1));
									ticker.quote_currency=_.replace(product,ticker.base_currency+'_','');
									temp.push(ticker);
								});
								tickers=temp;
								//PROCESS TO MATCH WITH LAST PRICE
								var last_tickers=ExchangeTickersAlerts.findOne();
								last_tickers.where({exchange_id:exchange_id});
								last_tickers.sort('id DESC');
								last_tickers.exec(function(err,last_tickers){
									if(err){ 
										ApiService.exchangeErrors('bitz','query_select',err,'alert_select',curDateTime);
									}
									
									if(!_.isEmpty(last_tickers)){
										last_tickers=last_tickers.tickers;
										_.forEach(last_tickers,function(ticker){
											var filter=_.filter(tickers,{product:ticker.product});
											if(!_.isEmpty(filter)){
												filter=_.head(filter);
												if(filter.last==ticker.last){
													tickers=_.reject(tickers,{product:ticker.product});
												}
											}
										});
									}
									
									ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers,date_created:curDateTime},function(err,data){
										if(err){ 
											ApiService.exchangeErrors('bitz','query_insert',err,'alert_insert',curDateTime);
										}
										else{
											PredatorTradeService.predators_data_alerts('bitz');
										}
									});
								});
							}
						}
						catch (e){
							ApiService.exchangeErrors('bitz','api',e,'alert_api_select',curDateTime);
						}
					}).
					catch(err=> { 
						ApiService.exchangeErrors('bitz','api',err,'alert_api_select',curDateTime);
					});
				}	
			});*/
		}
		else if(rand<=(rand_match_ratio*4)){
			var exchanges=['lbank','coinone','exmo','liqui','korbit'];
			return Promise.all(exchanges.map(exchange => {
				ExchangeList.findOne({name:exchange},function(err,data){
					if(err){ 
						ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
					}
					if(!_.isEmpty(data)){
						var exchange_id=data.id;
						switch(exchange){
							case 'lbank':
								ApiService.lbankMarketTicker().
								then(tickers => {
									try{ 
										tickers=JSON.parse(tickers);
										_.forEach(tickers,function(ticker){
											ticker.base_currency=_.join(_.split(ticker.symbol,'_',1));
											ticker.quote_currency=_.replace(ticker.symbol,ticker.base_currency+'_','');
										});
										
										//PROCESS TO MATCH WITH LAST PRICE
										var last_tickers=ExchangeTickersAlerts.findOne();
										last_tickers.where({exchange_id:exchange_id});
										last_tickers.sort('id DESC');
										last_tickers.exec(function(err,last_tickers){
											if(err){ 
												ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
											}
											
											if(!_.isEmpty(last_tickers)){
												last_tickers=last_tickers.tickers;
												_.forEach(last_tickers,function(ticker){
													var filter=_.filter(tickers,{symbol:ticker.symbol});
													if(!_.isEmpty(filter)){
														filter=_.head(filter);
														if(filter.ticker.latest==ticker.ticker.latest){
															tickers=_.reject(tickers,{symbol:ticker.symbol});
														}
													}
												});
											}
											
											ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers,date_created:curDateTime},function(err, data){
												if(err){ 
													ApiService.exchangeErrors(exchange,'query_insert',err,'alert_insert',curDateTime);
												}
												return exchange;
											});
										});
									}
									catch(e){
										ApiService.exchangeErrors(exchange,'api',e,'alert_api_select',curDateTime);
										return 'failed';
									}
								}).
								catch(err => { 
									ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
									return 'failed';
								});	
							break;
							case 'coinone':
								ApiService.coinoneMarketTicker().
								then(tickers => {
									try{ 
										var temp=[];
										tickers=JSON.parse(tickers);
										if(parseInt(tickers.errorCode)==0){
											_.forEach(Object.keys(tickers),function(currency){
												if(!_.includes(['errorCode','result','timestamp'],currency)){
													var ticker=tickers[currency];
													ticker.base_currency=currency;
													ticker.quote_currency='krw';
													ticker.product=currency+'krw';
													temp.push(ticker);
												}
											});
										}	
										tickers=temp;
										//PROCESS TO MATCH WITH LAST PRICE
										var last_tickers=ExchangeTickersAlerts.findOne();
										last_tickers.where({exchange_id:exchange_id});
										last_tickers.sort('id DESC');
										last_tickers.exec(function(err,last_tickers){
											if(err){ 
												ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
											}
											
											if(!_.isEmpty(last_tickers)){
												last_tickers=last_tickers.tickers;
												_.forEach(last_tickers,function(ticker){
													var filter=_.filter(tickers,{product:ticker.product});
													if(!_.isEmpty(filter)){
														filter=_.head(filter);
														if(filter.last==ticker.last){
															tickers=_.reject(tickers,{product:ticker.product});
														}
													}
												});
											}
											
											ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers,date_created:curDateTime},function(err, data){
												if(err){ 
													ApiService.exchangeErrors(exchange,'query_insert',err,'alert_insert',curDateTime);
												}
												return exchange;
											});
										});
									}
									catch(e){
										ApiService.exchangeErrors(exchange,'api',e,'alert_api_select',curDateTime);
										return 'failed';
									}
								}).
								catch(err => { 
									ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
									return 'failed';
								});
							break;
							case 'exmo':
								ApiService.exmoMarketTicker().
								then(tickers => {
									try{ 
										var temp=[];
										tickers=JSON.parse(tickers);
										_.forEach(Object.keys(tickers),function(product){
											var ticker=tickers[product];
											ticker.base_currency=_.join(_.split(product,'_',1));
											ticker.quote_currency=_.replace(product,ticker.base_currency+'_','');
											ticker.product=product;
											temp.push(ticker);
										});
							
										tickers=temp;
										//PROCESS TO MATCH WITH LAST PRICE
										var last_tickers=ExchangeTickersAlerts.findOne();
										last_tickers.where({exchange_id:exchange_id});
										last_tickers.sort('id DESC');
										last_tickers.exec(function(err,last_tickers){
											if(err){ 
												ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
											}
											
											if(!_.isEmpty(last_tickers)){
												last_tickers=last_tickers.tickers;
												_.forEach(last_tickers,function(ticker){
													var filter=_.filter(tickers,{product:ticker.product});
													if(!_.isEmpty(filter)){
														filter=_.head(filter);
														if(filter.last_trade==ticker.last_trade){
															tickers=_.reject(tickers,{product:ticker.product});
														}
													}
												});
											}
											
											ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers,date_created:curDateTime},function(err, data){
												if(err){ 
													ApiService.exchangeErrors(exchange,'query_insert',err,'alert_insert',curDateTime);
												}
												return exchange;
											});
										});
									}
									catch(e){
										ApiService.exchangeErrors(exchange,'api',e,'alert_api_select',curDateTime);
										return 'failed';
									}
								}).
								catch(err => { 
									ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
									return 'failed';
								});
							break;
							case 'liqui':
								var products=Object.keys(data.products.pairs);
								ApiService.liquiMarketTicker(_.join(products,'-')).
								then(tickers => {
									try{ 
										var temp=[];
										tickers=JSON.parse(tickers);
										
										_.forEach(Object.keys(tickers),function(product){
											var ticker=tickers[product];
											ticker.base_currency=_.join(_.split(product,'_',1));
											ticker.quote_currency=_.replace(product,ticker.base_currency+'_','');
											ticker.product=product;
											temp.push(ticker);
										});
							
										tickers=temp;
										//PROCESS TO MATCH WITH LAST PRICE
										var last_tickers=ExchangeTickersAlerts.findOne();
										last_tickers.where({exchange_id:exchange_id});
										last_tickers.sort('id DESC');
										last_tickers.exec(function(err,last_tickers){
											if(err){ 
												ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
											}
											
											if(!_.isEmpty(last_tickers)){
												last_tickers=last_tickers.tickers;
												_.forEach(last_tickers,function(ticker){
													var filter=_.filter(tickers,{product:ticker.product});
													if(!_.isEmpty(filter)){
														filter=_.head(filter);
														if(filter.last==ticker.last){
															tickers=_.reject(tickers,{product:ticker.product});
														}
													}
												});
											}
											
											ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers,date_created:curDateTime},function(err, data){
												if(err){ 
													ApiService.exchangeErrors(exchange,'query_insert',err,'alert_insert',curDateTime);
												}
												return exchange;
											});
										});
									}
									catch(e){ 
										ApiService.exchangeErrors(exchange,'api',e,'alert_api_select',curDateTime);
										return 'failed';
									}
								}).
								catch(err => { 
									ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
									return 'failed';
								});	
							break;
							case 'korbit':
								var products=data.products;
								return Promise.all(products.map((product) => {
									return ApiService.korbitMarketTicker(product).
									then(ticker => {
										ticker=JSON.parse(ticker);
										ticker.product=product;
										ticker.base_currency=_.join(_.split(product,'_',1));
										ticker.quote_currency=_.replace(product,ticker.base_currency+'_','');
										return ticker;
									}).
									catch(err => { 
										ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
										return '';
									});
								})).
								then(tickers => {
									var tickers_data=[];	
									_.forEach(tickers,function(ticker){
										if(!_.isEmpty(ticker)){
											tickers_data.push(ticker);
										}
									});
									if(!_.isEmpty(tickers_data)){
										//PROCESS TO MATCH WITH LAST PRICE
										var last_tickers=ExchangeTickersAlerts.findOne();
										last_tickers.where({exchange_id:exchange_id});
										last_tickers.sort('id DESC');
										last_tickers.exec(function(err,last_tickers){
											if(err){ 
												ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
											}
											
											if(!_.isEmpty(last_tickers)){
												last_tickers=last_tickers.tickers;
												_.forEach(last_tickers,function(ticker){
													var filter=_.filter(tickers_data,{product:ticker.product});
													if(!_.isEmpty(filter)){
														filter=_.head(filter);
														if(filter.last==ticker.last){
															tickers_data=_.reject(tickers_data,{product:ticker.product});
														}
													}
												});
											}
											
											ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers_data,date_created:curDateTime},function(err,data){
												if(err){ 
													ApiService.exchangeErrors(exchange,'query_insert',err,'alert_insert',curDateTime);
												}
												return exchange;
											});
										});
									}
									else{
										return 'failed';
									}
								}).
								catch(err => { 
									ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
									return 'failed';
								});
							break;
						}
					}
				});
			})).
			then(response => {
				var temp=[];
				_.forEach(exchanges,function(exchange){
					if(exchange!='failed'){
						temp.push(exchange);
					}
				});
				if(!_.isEmpty(temp)){
					PredatorTradeService.predators_data_alerts(temp);
				}
			}).
			catch(err => {
				ApiService.exchangeErrors(_.join(exchanges,'-'),'api',err,'alert_api_select',curDateTime);
			});		
			
			//PROCESS TO INSERT LBANK MARKET TICKERS
			/*ExchangeList.findOne({name:'lbank'},function(err, data){
				if(err){ 
					ApiService.exchangeErrors('lbank','query_select',err,'alert_select',curDateTime);
				}
				if(!_.isEmpty(data)){
					var exchange_id=data.id;
					ApiService.lbankMarketTicker().
					then(tickers => {
						try{ 
							tickers=JSON.parse(tickers);
							_.forEach(tickers,function(ticker){
								ticker.base_currency=_.join(_.split(ticker.symbol,'_',1));
								ticker.quote_currency=_.replace(ticker.symbol,ticker.base_currency+'_','');
							});
							
							//PROCESS TO MATCH WITH LAST PRICE
							var last_tickers=ExchangeTickersAlerts.findOne();
							last_tickers.where({exchange_id:exchange_id});
							last_tickers.sort('id DESC');
							last_tickers.exec(function(err,last_tickers){
								if(err){ 
									ApiService.exchangeErrors('lbank','query_select',err,'alert_select',curDateTime);
								}
								
								if(!_.isEmpty(last_tickers)){
									last_tickers=last_tickers.tickers;
									_.forEach(last_tickers,function(ticker){
										var filter=_.filter(tickers,{symbol:ticker.symbol});
										if(!_.isEmpty(filter)){
											filter=_.head(filter);
											if(filter.ticker.latest==ticker.ticker.latest){
												tickers=_.reject(tickers,{symbol:ticker.symbol});
											}
										}
									});
								}
								
								ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers,date_created:curDateTime},function(err, data){
									if(err){ 
										ApiService.exchangeErrors('lbank','query_insert',err,'alert_insert',curDateTime);
									}
									else{
										PredatorTradeService.predators_data_alerts('lbank');
									}
								});
							});
						}
						catch(e){
							ApiService.exchangeErrors('lbank','api',e,'alert_api_select',curDateTime);
						}
					}).
					catch(err => { 
						ApiService.exchangeErrors('lbank','api',err,'alert_api_select',curDateTime);
					});	
				}
			});*/
		
			//PROCESS TO INSERT COINONE MARKET TICKERS
			/*ExchangeList.findOne({name:'coinone'},function(err, data){
				if(err){ 
					ApiService.exchangeErrors('coinone','query_select',err,'alert_select',curDateTime);
				}
				if(!_.isEmpty(data)){
					var exchange_id=data.id;
					ApiService.coinoneMarketTicker().
					then(tickers => {
						try{ 
							var temp=[];
							tickers=JSON.parse(tickers);
							if(parseInt(tickers.errorCode)==0){
								_.forEach(Object.keys(tickers),function(currency){
									if(!_.includes(['errorCode','result','timestamp'],currency)){
										var ticker=tickers[currency];
										ticker.base_currency=currency;
										ticker.quote_currency='krw';
										ticker.product=currency+'krw';
										temp.push(ticker);
									}
								});
							}	
							tickers=temp;
							//PROCESS TO MATCH WITH LAST PRICE
							var last_tickers=ExchangeTickersAlerts.findOne();
							last_tickers.where({exchange_id:exchange_id});
							last_tickers.sort('id DESC');
							last_tickers.exec(function(err,last_tickers){
								if(err){ 
									ApiService.exchangeErrors('coinone','query_select',err,'alert_select',curDateTime);
								}
								
								if(!_.isEmpty(last_tickers)){
									last_tickers=last_tickers.tickers;
									_.forEach(last_tickers,function(ticker){
										var filter=_.filter(tickers,{product:ticker.product});
										if(!_.isEmpty(filter)){
											filter=_.head(filter);
											if(filter.last==ticker.last){
												tickers=_.reject(tickers,{product:ticker.product});
											}
										}
									});
								}
								
								ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers,date_created:curDateTime},function(err, data){
									if(err){ 
										ApiService.exchangeErrors('coinone','query_insert',err,'alert_insert',curDateTime);
									}
									else{
										PredatorTradeService.predators_data_alerts('coinone');
									}
								});
							});
						}
						catch(e){
							ApiService.exchangeErrors('coinone','api',e,'alert_api_select',curDateTime);
						}
					}).
					catch(err => { 
						ApiService.exchangeErrors('coinone','api',err,'alert_api_select',curDateTime);
					});
				}
			});*/
		
			//PROCESS TO INSERT EXMO MARKET TICKERS
			/*ExchangeList.findOne({name:'exmo'},function(err, data){
				if(err){ 
					ApiService.exchangeErrors('exmo','query_select',err,'alert_select',curDateTime);
				}
				if(!_.isEmpty(data)){
					var exchange_id=data.id;
					ApiService.exmoMarketTicker().
					then(tickers => {
						try{ 
							var temp=[];
							tickers=JSON.parse(tickers);
							_.forEach(Object.keys(tickers),function(product){
								var ticker=tickers[product];
								ticker.base_currency=_.join(_.split(product,'_',1));
								ticker.quote_currency=_.replace(product,ticker.base_currency+'_','');
								ticker.product=product;
								temp.push(ticker);
							});
				
							tickers=temp;
							//PROCESS TO MATCH WITH LAST PRICE
							var last_tickers=ExchangeTickersAlerts.findOne();
							last_tickers.where({exchange_id:exchange_id});
							last_tickers.sort('id DESC');
							last_tickers.exec(function(err,last_tickers){
								if(err){ 
									ApiService.exchangeErrors('exmo','query_select',err,'alert_select',curDateTime);
								}
								
								if(!_.isEmpty(last_tickers)){
									last_tickers=last_tickers.tickers;
									_.forEach(last_tickers,function(ticker){
										var filter=_.filter(tickers,{product:ticker.product});
										if(!_.isEmpty(filter)){
											filter=_.head(filter);
											if(filter.last_trade==ticker.last_trade){
												tickers=_.reject(tickers,{product:ticker.product});
											}
										}
									});
								}
								
								ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers,date_created:curDateTime},function(err, data){
									if(err){ 
										ApiService.exchangeErrors('exmo','query_insert',err,'alert_insert',curDateTime);
									}
									else{
										PredatorTradeService.predators_data_alerts('exmo');
									}
								});
							});
						}
						catch(e){
							ApiService.exchangeErrors('exmo','api',e,'alert_api_select',curDateTime);
						}
					}).
					catch(err => { 
						ApiService.exchangeErrors('exmo','api',err,'alert_api_select',curDateTime);
					});
				}
			});*/	
			
			//PROCESS TO INSERT LIQUI MARKET TICKERS
			/*ExchangeList.findOne({name:'liqui'},function(err, data){
				if(err){ 
					ApiService.exchangeErrors('liqui','query_select',err,'alert_select',curDateTime);
				}
				if(!_.isEmpty(data)){
					var exchange_id=data.id;
					var products=Object.keys(data.products.pairs);
					ApiService.liquiMarketTicker(_.join(products,'-')).
					then(tickers => {
						try{ 
							var temp=[];
							tickers=JSON.parse(tickers);
							
							_.forEach(Object.keys(tickers),function(product){
								var ticker=tickers[product];
								ticker.base_currency=_.join(_.split(product,'_',1));
								ticker.quote_currency=_.replace(product,ticker.base_currency+'_','');
								ticker.product=product;
								temp.push(ticker);
							});
				
							tickers=temp;
							//PROCESS TO MATCH WITH LAST PRICE
							var last_tickers=ExchangeTickersAlerts.findOne();
							last_tickers.where({exchange_id:exchange_id});
							last_tickers.sort('id DESC');
							last_tickers.exec(function(err,last_tickers){
								if(err){ 
									ApiService.exchangeErrors('liqui','query_select',err,'alert_select',curDateTime);
								}
								
								if(!_.isEmpty(last_tickers)){
									last_tickers=last_tickers.tickers;
									_.forEach(last_tickers,function(ticker){
										var filter=_.filter(tickers,{product:ticker.product});
										if(!_.isEmpty(filter)){
											filter=_.head(filter);
											if(filter.last==ticker.last){
												tickers=_.reject(tickers,{product:ticker.product});
											}
										}
									});
								}
								
								ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers,date_created:curDateTime},function(err, data){
									if(err){ 
										ApiService.exchangeErrors('liqui','query_insert',err,'alert_insert',curDateTime);
									}
									else{
										PredatorTradeService.predators_data_alerts('liqui');
									}
								});
							});
						}
						catch(e){ 
							ApiService.exchangeErrors('liqui','api',e,'alert_api_select',curDateTime);
						}
					}).
					catch(err => { 
						ApiService.exchangeErrors('liqui','api',err,'alert_api_select',curDateTime);
					});	
				}
			});*/
		
			//PROCESS TO INSERT KORBIT MARKET TICKERS
			/*ExchangeList.findOne({name:'korbit'},function(err,data){
				if(err){ 
					ApiService.exchangeErrors('korbit','query_select',err,'alert_select',curDateTime);
				}
				if(!_.isEmpty(data)){
					var exchange_id=data.id;
					var products=data.products;
					return Promise.all(products.map((product) => {
						return ApiService.korbitMarketTicker(product).
						then(ticker => {
							ticker=JSON.parse(ticker);
							ticker.product=product;
							ticker.base_currency=_.join(_.split(product,'_',1));
							ticker.quote_currency=_.replace(product,ticker.base_currency+'_','');
							return ticker;
						}).
						catch(err => { 
							ApiService.exchangeErrors('korbit','api',err,'alert_api_select',curDateTime);
						});
					})).
					then(tickers => {
						var tickers_data=[];	
						_.forEach(tickers,function(ticker){
							if(!_.isEmpty(ticker)){
								tickers_data.push(ticker);
							}
						});
						if(!_.isEmpty(tickers_data)){
							//PROCESS TO MATCH WITH LAST PRICE
							var last_tickers=ExchangeTickersAlerts.findOne();
							last_tickers.where({exchange_id:exchange_id});
							last_tickers.sort('id DESC');
							last_tickers.exec(function(err,last_tickers){
								if(err){ 
									ApiService.exchangeErrors('korbit','query_select',err,'alert_select',curDateTime);
								}
								
								if(!_.isEmpty(last_tickers)){
									last_tickers=last_tickers.tickers;
									_.forEach(last_tickers,function(ticker){
										var filter=_.filter(tickers_data,{product:ticker.product});
										if(!_.isEmpty(filter)){
											filter=_.head(filter);
											if(filter.last==ticker.last){
												tickers_data=_.reject(tickers_data,{product:ticker.product});
											}
										}
									});
								}
								
								ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers_data,date_created:curDateTime},function(err,data){
									if(err){ 
										ApiService.exchangeErrors('korbit','query_insert',err,'alert_insert',curDateTime);
									}
									else{
										PredatorTradeService.predators_data_alerts('korbit');
									}
								});
							});
						}
					}).
					catch(err => { 
						ApiService.exchangeErrors('korbit','api',err,'alert_api_select',curDateTime);
					});
				}
			});*/
		}
		else if(rand<=(rand_match_ratio*5)){
			var exchanges=['bitmex','livecoin','cex'];
			return Promise.all(exchanges.map(exchange => {
				ExchangeList.findOne({name:exchange},function(err,data){
					if(err){ 
						ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
					}
					if(!_.isEmpty(data)){
						var exchange_id=data.id;
						switch(exchange){
							case 'bitmex':
								ApiService.bitmexTicker().then(tickers=>{
									tickers=JSON.parse(tickers);
									if(_.isEmpty(tickers.error)){
										tickers=_.reject(tickers,{lastPrice:null});
										_.forEach(tickers,function(ticker){
											ticker.base_currency=ticker.rootSymbol;
											ticker.quote_currency=_.replace(ticker.symbol,ticker.rootSymbol,'');
										});
										//PROCESS TO MATCH WITH LAST PRICE
										var last_tickers=ExchangeTickersAlerts.findOne();
										last_tickers.where({exchange_id:exchange_id});
										last_tickers.sort('id DESC');
										last_tickers.exec(function(err,last_tickers){
											if(err){ 
												ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
											}
											
											if(!_.isEmpty(last_tickers)){
												last_tickers=last_tickers.tickers;
												_.forEach(last_tickers,function(ticker){
													var filter=_.filter(tickers,{symbol:ticker.symbol});
													if(!_.isEmpty(filter)){
														filter=_.head(filter);
														if(filter.lastPrice==ticker.lastPrice){
															tickers=_.reject(tickers,{symbol:ticker.symbol});
														}
													}
												});
											}
											
											ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers,date_created:curDateTime},function(err,data){
												if(err){ 
													ApiService.exchangeErrors(exchange,'query_insert',err,'alert_insert',curDateTime);
												}
												return exchange;
											});
										});
									}
									else{
										return 'failed';
									}
								}).
								catch(err=> { 
									ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
									return 'failed';
								});
							break;
							case 'livecoin':
								ApiService.livecoinTicker().then(tickers=>{
									tickers=JSON.parse(tickers);
									if(_.isEmpty(tickers.errorCode)){
									_.forEach(tickers,function(ticker){
											ticker.base_currency=ticker.cur;
											ticker.quote_currency=_.replace(ticker.symbol,ticker.cur+'/','');
											ticker.product=_.replace(ticker.symbol,'/','');
										});
										//PROCESS TO MATCH WITH LAST PRICE
										var last_tickers=ExchangeTickersAlerts.findOne();
										last_tickers.where({exchange_id:exchange_id});
										last_tickers.sort('id DESC');
										last_tickers.exec(function(err,last_tickers){
											if(err){ 
												ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
											}
											
											if(!_.isEmpty(last_tickers)){
												last_tickers=last_tickers.tickers;
												_.forEach(last_tickers,function(ticker){
													var filter=_.filter(tickers,{product:ticker.product});
													if(!_.isEmpty(filter)){
														filter=_.head(filter);
														if(filter.last==ticker.last){
															tickers=_.reject(tickers,{product:ticker.product});
														}
													}
												});
											}
											
											ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers,date_created:curDateTime},function(err,data){
												if(err){ 
													ApiService.exchangeErrors(exchange,'query_insert',err,'alert_insert',curDateTime);
												}
												return exchange;
											});
										});
									}
									else {
										return 'failed';
									}
								}).
								catch(err=> { 
									ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
									return 'failed';
								});
							break;
							case 'cex':
								var products=data.products.data.pairs;
								return Promise.all(products.map((product) => {
									return ApiService.cexMarketTicker(product.symbol1,product.symbol2).
									then(ticker => {
										ticker=JSON.parse(ticker);
										ticker.product=product.symbol1+product.symbol2;
										ticker.base_currency=product.symbol1;
										ticker.quote_currency=product.symbol2;
										return ticker;
									}).
									catch(err => { 
										ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
										return '';
									});
								})).
								then(tickers => {
									var tickers_data=[];	
									_.forEach(tickers,function(ticker){
										if(!_.isEmpty(ticker)){
											tickers_data.push(ticker);
										}
									});
									if(!_.isEmpty(tickers_data)){
										//PROCESS TO MATCH WITH LAST PRICE
										var last_tickers=ExchangeTickersAlerts.findOne();
										last_tickers.where({exchange_id:exchange_id});
										last_tickers.sort('id DESC');
										last_tickers.exec(function(err,last_tickers){
											if(err){ 
												ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
											}
											
											if(!_.isEmpty(last_tickers)){
												last_tickers=last_tickers.tickers;
												_.forEach(last_tickers,function(ticker){
													var filter=_.filter(tickers_data,{product:ticker.product});
													if(!_.isEmpty(filter)){
														filter=_.head(filter);
														if(filter.last==ticker.last){
															tickers_data=_.reject(tickers_data,{product:ticker.product});
														}
													}
												});
											}
											
											ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers_data,date_created:curDateTime},function(err,data){
												if(err){ 
													ApiService.exchangeErrors(exchange,'query_insert',err,'alert_insert',curDateTime);
												}
												return exchange;
											});
										});
									}
									else{
										return 'failed';
									}
								}).
								catch(err => { 
									ApiService.exchangeErrors(exchange,'api',err,'alert_api_select',curDateTime);
									return 'failed';
								});
							break;
						}
					}
				});
			})).
			then(response => {
				var temp=[];
				_.forEach(exchanges,function(exchange){
					if(exchange!='failed'){
						temp.push(exchange);
					}
				});
				if(!_.isEmpty(temp)){
					PredatorTradeService.predators_data_alerts(temp);
				}
			}).
			catch(err => {
				ApiService.exchangeErrors(_.join(exchanges,'-'),'api',err,'alert_api_select',curDateTime);
			});			
			//PROCESS TO INSERT BITMEX PRODUCT/MARKET TICKERS
			/*ExchangeList.findOne({name:'bitmex'},function(err,data){ 
				if(err){ 
					ApiService.exchangeErrors('bitmex','query_select',err,'alert_select',curDateTime);
				}
				if(!_.isEmpty(data)){
					var exchange_id=data.id;
					ApiService.bitmexTicker().then(tickers=>{
						tickers=JSON.parse(tickers);
						if(_.isEmpty(tickers.error)){
							tickers=_.reject(tickers,{lastPrice:null});
							_.forEach(tickers,function(ticker){
								ticker.base_currency=ticker.rootSymbol;
								ticker.quote_currency=_.replace(ticker.symbol,ticker.rootSymbol,'');
							});
							//PROCESS TO MATCH WITH LAST PRICE
							var last_tickers=ExchangeTickersAlerts.findOne();
							last_tickers.where({exchange_id:exchange_id});
							last_tickers.sort('id DESC');
							last_tickers.exec(function(err,last_tickers){
								if(err){ 
									ApiService.exchangeErrors('bitmex','query_select',err,'alert_select',curDateTime);
								}
								
								if(!_.isEmpty(last_tickers)){
									last_tickers=last_tickers.tickers;
									_.forEach(last_tickers,function(ticker){
										var filter=_.filter(tickers,{symbol:ticker.symbol});
										if(!_.isEmpty(filter)){
											filter=_.head(filter);
											if(filter.lastPrice==ticker.lastPrice){
												tickers=_.reject(tickers,{symbol:ticker.symbol});
											}
										}
									});
								}
								
								ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers,date_created:curDateTime},function(err,data){
									if(err){ 
										ApiService.exchangeErrors('bitmex','query_insert',err,'alert_insert',curDateTime);
									}
									else{
										PredatorTradeService.predators_data_alerts('bitmex');
									}
								});
							});
						}
					}).
					catch(err=> { 
						ApiService.exchangeErrors('bitmex','api',err,'alert_api_select',curDateTime);
					});
				}	
			});*/
		
			//PROCESS TO CREATE LIVECOIN MARKET TICKERS
			/*ExchangeList.findOne({name:'livecoin'},function(err,data){ 
				if(err){ 
					ApiService.exchangeErrors('livecoin','query_select',err,'alert_select',curDateTime);
				}
				if(!_.isEmpty(data)){
					var exchange_id=data.id;
					ApiService.livecoinTicker().then(tickers=>{
						tickers=JSON.parse(tickers);
						if(_.isEmpty(tickers.errorCode)){
						_.forEach(tickers,function(ticker){
								ticker.base_currency=ticker.cur;
								ticker.quote_currency=_.replace(ticker.symbol,ticker.cur+'/','');
								ticker.product=_.replace(ticker.symbol,'/','');
							});
							//PROCESS TO MATCH WITH LAST PRICE
							var last_tickers=ExchangeTickersAlerts.findOne();
							last_tickers.where({exchange_id:exchange_id});
							last_tickers.sort('id DESC');
							last_tickers.exec(function(err,last_tickers){
								if(err){ 
									ApiService.exchangeErrors('livecoin','query_select',err,'alert_select',curDateTime);
								}
								
								if(!_.isEmpty(last_tickers)){
									last_tickers=last_tickers.tickers;
									_.forEach(last_tickers,function(ticker){
										var filter=_.filter(tickers,{product:ticker.product});
										if(!_.isEmpty(filter)){
											filter=_.head(filter);
											if(filter.last==ticker.last){
												tickers=_.reject(tickers,{product:ticker.product});
											}
										}
									});
								}
								
								ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers,date_created:curDateTime},function(err,data){
									if(err){ 
										ApiService.exchangeErrors('livecoin','query_insert',err,'alert_insert',curDateTime);
									}
									else{
										PredatorTradeService.predators_data_alerts('livecoin');
									}
								});
							});
						}	
					}).
					catch(err=> { 
						ApiService.exchangeErrors('livecoin','api',err,'alert_api_select',curDateTime);
					});
				}	
			});*/
		
			//PROCESS TO INSERT CEX MARKET TICKERS
			/*ExchangeList.findOne({name:'cex'},function(err,data){
				if(err){ 
					ApiService.exchangeErrors('cex','query_select',err,'alert_select',curDateTime);
				}
				if(!_.isEmpty(data)){
					var exchange_id=data.id;
					var products=data.products.data.pairs;
					return Promise.all(products.map((product) => {
						return ApiService.cexMarketTicker(product.symbol1,product.symbol2).
						then(ticker => {
							ticker=JSON.parse(ticker);
							ticker.product=product.symbol1+product.symbol2;
							ticker.base_currency=product.symbol1;
							ticker.quote_currency=product.symbol2;
							return ticker;
						}).
						catch(err => { 
							ApiService.exchangeErrors('cex','api',err,'alert_api_select',curDateTime);
						});
					})).
					then(tickers => {
						var tickers_data=[];	
						_.forEach(tickers,function(ticker){
							if(!_.isEmpty(ticker)){
								tickers_data.push(ticker);
							}
						});
						if(!_.isEmpty(tickers_data)){
							//PROCESS TO MATCH WITH LAST PRICE
							var last_tickers=ExchangeTickersAlerts.findOne();
							last_tickers.where({exchange_id:exchange_id});
							last_tickers.sort('id DESC');
							last_tickers.exec(function(err,last_tickers){
								if(err){ 
									ApiService.exchangeErrors('cex','query_select',err,'alert_select',curDateTime);
								}
								
								if(!_.isEmpty(last_tickers)){
									last_tickers=last_tickers.tickers;
									_.forEach(last_tickers,function(ticker){
										var filter=_.filter(tickers_data,{product:ticker.product});
										if(!_.isEmpty(filter)){
											filter=_.head(filter);
											if(filter.last==ticker.last){
												tickers_data=_.reject(tickers_data,{product:ticker.product});
											}
										}
									});
								}
								
								ExchangeTickersAlerts.create({exchange_id:exchange_id,tickers:tickers_data,date_created:curDateTime},function(err,data){
									if(err){ 
										ApiService.exchangeErrors('cex','query_insert',err,'alert_insert',curDateTime);
									}
									else{
										PredatorTradeService.predators_data_alerts('cex');
									}
								});
							});
						}
					}).
					catch(err => { 
						ApiService.exchangeErrors('cex','api',err,'alert_api_select',curDateTime);
					});
				}
			});*/
		}
	}
};
