module.exports.cron = {
  alertsJob: {
	schedule: '00 */1 * * * *',
    onTick: function () {
      CronService.createExchangeTickersAlerts();
    }
  },
  dayTradingAlertsJob:{
	schedule: '00 */30 * * * *',
    onTick: function () {
      PredatorTradeService.createdayTradingAlerts();
    }
  }
};