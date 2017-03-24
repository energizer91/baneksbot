/**
 * Created by Александр on 13.12.2015.
 */
module.exports = function (express, botApi) {
    var router = express.Router();

    router.get('/', function (req, res, next) {
        var params = {},
            limit = parseInt(req.query.limit) || 10,
            offset = parseInt(req.query.offset) || 0,
            total = 0;

        if (req.query.filter) {
            switch (req.query.filter) {
                case 'subscribed':
                    params.subscribed = true;
                    break;
                case 'banned':
                    params.banned = true;
                    break;
                case 'all':
                default:
                    break;
            }
        }

        return botApi.mongo.User.count(params).then(function (count) {
            total = count;

            return botApi.mongo.User.find(params).skip(offset).limit(limit).then(function (users) {
                return res.json({
                    offset: offset,
                    limit: limit,
                    total: total,
                    items: users
                });
            })
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