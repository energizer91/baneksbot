/**
 * Created by Александр on 13.12.2015.
 */
module.exports = function (express, botApi) {
    var router = express.Router();

    router.get('/', function (req, res, next) {
        return botApi.mongo.Anek.find({}).skip(parseInt(req.query.offset || 0)).limit(parseInt(req.query.limit || 10)).then(function (aneks) {
            return res.json(aneks);
        }).catch(next);
    });

    router.get('/:anekId', function (req, res, next) {
        return botApi.mongo.Anek.findOne({_id: req.params.anekId}).then(function (anek) {
            return res.json(anek);
        }).catch(next);
    });

    return {
        endPoint: '/aneks',
        router: router
    };
};