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
            .then(results => res.json(results.map(({date, users}) => Object.assign({date}, users.toObject()))));
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
        return botApi.mongo.Statistic.find({date: {$gte: from, $lte: to}}).then(result => {
            return res.json(result.reduce((p, c) => {
            p.users.count = c.users.count;
            p.users.new += c.users.new;
            p.users.subscribed = c.users.subscribed;
            p.users.newly_subscribed += c.users.newly_subscribed;
            p.users.unsubscribed += c.users.unsubscribed;

            p.aneks.count = c.aneks.count;
            p.aneks.new += c.aneks.new;

            p.messages.received += c.messages.received;

            return p;
        }, {
                users: {
                    count: 0,
                    new: 0,
                    subscribed: 0,
                    newly_subscribed: 0,
                    unsubscribed: 0
                },
                aneks: {
                    count: 0,
                    new: 0
                },
                messages: {
                    received: 0
                }
            }))});
    });

    return {
        endPoint: '/statistics',
        router: router
    };
};