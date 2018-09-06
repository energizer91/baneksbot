/**
 * Created by Александр on 19.06.2017.
 */

const botApi = require('../botApi');

module.exports = function (express) {
  const router = express.Router();

  function reduceResults (results, reduceFn, step) {
    let resultArray = [];
    for (let i = 0; i < results.length; i++) {
      let previousStart = 0;
      if (!step) {
        step = 12;
      }
      if (((i + 1) % step === 0 && i) || i === results.length + 1) {
        if (i !== results.length + 1) {
          previousStart = (i + 1) - step;
        }
        resultArray.push(results.slice(previousStart, i).reduce(reduceFn));
      }
    }

    return resultArray;
  }

  router.get('/calculate', (req, res) => {
    return botApi.statistics.calculateStatistics(
      req.query.from ? new Date(parseInt(req.query.from)) : new Date(new Date().setHours(0, 0, 0, 0)),
      req.query.to ? new Date(parseInt(req.query.to)) : new Date()
    ).then(function (result) {
      return res.json(result);
    });
  });

  router.get('/users/calculate', (req, res) => {
    return botApi.statistics.calculateUserStatistics(
      req.query.from ? new Date(parseInt(req.query.from)) : new Date().setHours(0, 0, 0, 0),
      req.query.to ? new Date(parseInt(req.query.to)) : new Date().getTime()
    ).then(function (result) {
      return res.json(result);
    });
  });

  router.get('/users', (req, res) => {
    const from = req.query.from ? new Date(parseInt(req.query.from)) : new Date(new Date().setHours(0, 0, 0, 0));
    const to = req.query.to ? new Date(parseInt(req.query.to)) : new Date();

    return botApi.database.Statistic.find({date: {$gte: from, $lte: to}}, {users: 1, date: 1})
      .then(results => {
        const resultArray = reduceResults(results, (p, c) => {
          return {
            date: c.date,
            users: {
              count: c.users.count,
              subscribed: c.users.subscribed,
              newly_subscribed: p.users.newly_subscribed + c.users.newly_subscribed,
              unsubscribed: p.users.unsubscribed + c.users.unsubscribed,
              new: p.users.new + c.users.new
            }
          };
        }, 12);

        return res.json(resultArray.map(({date, users}) => Object.assign({date}, users)));
      });
  });

  router.get('/aneks', (req, res) => {
    const from = req.query.from ? new Date(parseInt(req.query.from)) : new Date(new Date().setHours(0, 0, 0, 0));
    const to = req.query.to ? new Date(parseInt(req.query.to)) : new Date();

    return botApi.database.Statistic.find({date: {$gte: from, $lte: to}}, {aneks: 1, date: 1})
      .then(results => res.json(results.map(({date, aneks}) => Object.assign({date}, aneks.toObject()))));
  });

  router.get('/messages', (req, res) => {
    const from = req.query.from ? new Date(parseInt(req.query.from)) : new Date(new Date().setHours(0, 0, 0, 0));
    const to = req.query.to ? new Date(parseInt(req.query.to)) : new Date();

    return botApi.database.Statistic.find({date: {$gte: from, $lte: to}}, {messages: 1, date: 1})
      .then(results => {
        const resultArray = reduceResults(results, (p, c) => {
          return {
            date: c.date,
            messages: {
              received: p.messages.received + c.messages.received
            }
          };
        }, 12);

        return res.json(resultArray.map(({date, messages}) => Object.assign({date}, messages)));
      });
  });

  router.get('/', (req, res) => {
    const from = req.query.from ? new Date(parseInt(req.query.from)) : new Date(new Date().setHours(0, 0, 0, 0));
    const to = req.query.to ? new Date(parseInt(req.query.to)) : new Date();

    return botApi.statistics.getOverallStatistics(from, to).then(result => res.json(result));
  });

  return {
    endPoint: '/statistics',
    router: router
  };
};
