/**
 * Created by Александр on 19.06.2017.
 */

module.exports = function (express, botApi) {
    var router = express.Router();

    router.get('/users', (req, res, next) => {
        return botApi.statistics.calculateStatistics(botApi.mongo, req.query.from ? new Date(req.query.from) : new Date().setHours(0, 0, 0, 0)).then(function (result) {
            console.log(result);

            res.json(result);
        })
    });

    return {
        endPoint: '/statistics',
        router: router
    };
};