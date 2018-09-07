module.exports.cron = {
  alertsJob: {
	schedule: '00 */1 * * * *',
    onTick: function () {
      CronService.createExchangeTickersAlerts();
    }
  }
};