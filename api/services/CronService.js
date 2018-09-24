module.exports = {
	createExchangeTickersAlerts:function(){
		console.log('crone job for create predator alert working');
		var moment = require('moment');
		var _ = require('lodash');
		var math = require('mathjs');
		var curDateTime=moment().format('YYYY-MM-DD HH:mm:ss');
		
		var exchanges=['gdax','bittrex','bitfinex','hitbtc','gate','kuna','okex','binance','huobi','gemini','kraken','bitflyer','bithumb','bitstamp','bitz','lbank','coinone','exmo','liqui','korbit','bitmex','livecoin','cex','kucoin'];
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
													if(filter.ticker.last==ticker.ticker.last){
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
						case 'kucoin':
							ApiService.kucoinTicker().then(tickers=>{
								tickers=JSON.parse(tickers);
								if(tickers.success){
									//PROCESS TO MATCH WITH LAST PRICE
									var last_tickers=ExchangeTickersAlerts.findOne();
									last_tickers.where({exchange_id:exchange_id});
									last_tickers.sort('id DESC');
									last_tickers.exec(function(err,last_tickers){
										if(err){ 
											ApiService.exchangeErrors(exchange,'query_select',err,'alert_select',curDateTime);
										}
										
										_.forEach(tickers.data,function(ticker){
											ticker.lastDealPrice=math.format(ticker.lastDealPrice,{lowerExp: -100, upperExp: 100});
											ticker.buy=math.format(ticker.buy,{lowerExp: -100, upperExp: 100});
											ticker.sell=math.format(ticker.sell,{lowerExp: -100, upperExp: 100});
											ticker.high=math.format(ticker.high,{lowerExp: -100, upperExp: 100});
											ticker.low=math.format(ticker.low,{lowerExp: -100, upperExp: 100});
										});
										
										if(!_.isEmpty(last_tickers)){
											last_tickers=last_tickers.tickers.data;
											_.forEach(last_tickers,function(ticker){
												var filter=_.filter(tickers.data,{symbol:ticker.symbol});
												if(!_.isEmpty(filter)){
													filter=_.head(filter);
													if(filter.lastDealPrice==ticker.lastDealPrice){
														tickers.data=_.reject(tickers.data,{symbol:ticker.symbol});
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
	}
};
