/**
 * Created by Александр on 13.12.2015.
 */
module.exports = function (express, botApi) {
  const router = express.Router();

  router.get('/', function (req, res, next) {
    const params = {};
    let limit = parseInt(req.query.limit) || 10;
    let offset = parseInt(req.query.offset) || 0;
    let total = 0;

    return botApi.mongo.Anek.count(params).then(function (count) {
      total = count;

      return botApi.mongo.Anek.find(params).skip(offset).limit(limit).then(function (users) {
        return res.json({
          offset,
          limit,
          total,
          items: users
        });
      });
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
