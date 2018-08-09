/**
 * Created by Александр on 13.12.2015.
 */

module.exports = function (express, botApi, configs) {
  const router = express.Router();
  const common = require('../helpers/common')(configs);

  function clearDatabases () {
    return botApi.fulfillAll([
      botApi.mongo.Anek.remove({})
    ]);
  }

  function redefineDatabase (count) {
    return common.getAllAneks(count).then(function (responses) {
      return botApi.fulfillAll(responses.map(function (response) {
        return botApi.mongo.Anek.collection.insertMany(response.response.items.reverse().map(function (anek) {
          anek.post_id = anek.id;
          anek.likes = anek.likes.count;
          anek.reposts = anek.reposts.count;
          delete anek.id;
          return anek;
        })).catch(function (error) {
          console.log(error);
          return [];
        });
      }));
    });
  }

  router.get('/', function (req, res) {
    return res.send('hello fot Telegram bot api');
  });

  router.get('/getMe', function (req, res, next) {
    return botApi.bot.getMe().then(function (response) {
      return res.send(JSON.stringify(response));
    }).catch(next);
  });

  router.get('/grant', function (req, res) {
    if (!req.query.secret || (req.query.secret !== configs.bot.secret)) {
      return res.send('Unauthorized');
    }

    return botApi.mongo.User.findOneAndUpdate({user_id: 5630968}, {admin: true}).then(function () {
      return res.send('ok');
    });
  });

  router.get('/set_webhook', function (req, res, next) {
    if (!req.query.secret || (req.query.secret !== configs.bot.secret)) {
      return res.send('Unauthorized');
    }

    return botApi.bot.setWebhook()
      .then(function (info) {
        return res.json(info);
      }).catch(function (error) {
        console.log(error);
        return next(error);
      });
  });

  router.get('/redefine', function (req, res, next) {
    if (!req.query.secret || (req.query.secret !== configs.bot.secret)) {
      return res.send('Unauthorized');
    }

    return clearDatabases().then(redefineDatabase.bind(this, 0)).then(function (response) {
      return res.json('success ' + response.length);
    }).catch(function (error) {
      console.log(error);
      return next(error);
    });
  });

  return {
    endPoint: '/bot',
    router: router
  };
};
