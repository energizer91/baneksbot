/**
 * Created by Александр on 19.06.2017.
 */

module.exports = function (express, botApi) {
    var router = express.Router();

    router.get('/calculate', (req, res) => {
        return botApi.statistics.calculateStatistics(
            botApi.mongo,
            req.query.from ? new Date(parseInt(req.query.from)) : new Date(new Date().setHours(0, 0, 0, 0)),
            req.query.to ? new Date(parseInt(req.query.to)) : new Date()
        ).then(function (result) {
            return res.json(result);
        })
    });

    router.get('/users/calculate', (req, res) => {
        return botApi.statistics.calculateUserStatistics(
            botApi.mongo,
            req.query.from ? new Date(parseInt(req.query.from)) : new Date().setHours(0, 0, 0, 0),
            req.query.to ? new Date(parseInt(req.query.to)) : new Date().getTime()
        ).then(function (result) {
            return res.json(result);
        })
    });

    router.get('/users', (req, res) => {
        var from = req.query.from ? new Date(parseInt(req.query.from)) : new Date(new Date().setHours(0, 0, 0, 0)),
            to = req.query.to ? new Date(parseInt(req.query.to)) : new Date();
        return botApi.mongo.Statistic.find({date: {$gte: from, $lte: to}}, {users: 1, date: 1})
            .then(results => {
                let resultArray = [];
                for (let i = 0; i < results.length; i++) {
                    let previousStart = 0;
                    if ((i + 1) % 12 === 0 && i || i === results.length + 1) {
                        if (i !== results.length + 1) {
                            previousStart = (i + 1) - 12
                        }
                        resultArray.push(results.slice(previousStart, i).reduce((p, c) => {
                            return {
                                date: c.date,
                                users: {
                                    count: c.users.count,
                                    subscribed: c.users.subscribed,
                                    newly_subscribed: p.users.newly_subscribed + c.users.newly_subscribed,
                                    unsubscribed: p.users.unsubscribed + c.users.unsubscribed,
                                    new: p.users.new + c.users.new
                                }
                            }
                        }))
                    }
                }

                return res.json(resultArray.map(({date, users}) => Object.assign({date}, users)));
            });
    });

    router.get('/aneks', (req, res) => {
        var from = req.query.from ? new Date(parseInt(req.query.from)) : new Date(new Date().setHours(0, 0, 0, 0)),
            to = req.query.to ? new Date(parseInt(req.query.to)) : new Date();
        return botApi.mongo.Statistic.find({date: {$gte: from, $lte: to}}, {aneks: 1, date: 1})
            .then(results => res.json(results.map(({date, aneks}) => Object.assign({date}, aneks.toObject()))));
    });

    router.get('/messages', (req, res) => {
        var from = req.query.from ? new Date(parseInt(req.query.from)) : new Date(new Date().setHours(0, 0, 0, 0)),
            to = req.query.to ? new Date(parseInt(req.query.to)) : new Date();
        return botApi.mongo.Statistic.find({date: {$gte: from, $lte: to}}, {messages: 1, date: 1})
            .then(results => res.json(results.map(({date, messages}) => Object.assign({date}, messages.toObject()))));
    });

    router.get('/', (req, res) => {
        var from = req.query.from ? new Date(parseInt(req.query.from)) : new Date(new Date().setHours(0, 0, 0, 0)),
            to = req.query.to ? new Date(parseInt(req.query.to)) : new Date();
        return botApi.statistics.getOverallStatistics(botApi.mongo, from, to).then(result => res.json(result));
    });

    return {
        endPoint: '/statistics',
        router: router
    };
};