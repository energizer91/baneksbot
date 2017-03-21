/**
 * Created by Александр on 13.12.2015.
 */
module.exports = function (express, botApi) {
    var router = express.Router();

    router.get('/', function (req, res, next) {
        return botApi.mongo.User.find({}).skip(parseInt(req.query.offset || 0)).limit(parseInt(req.query.limit || 10)).then(function (users) {
            return res.json(users);
        }).catch(next);
    });

    router.get('/:userId', function (req, res, next) {
        return botApi.mongo.User.findOne({_id: req.params.userId}).then(function (user) {
            return res.json(user);
        }).catch(next);
    });

    return {
        endPoint: '/users',
        router: router
    };
};