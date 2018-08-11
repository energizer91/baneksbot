/**
 * Created by Александр on 13.12.2015.
 */

const common = require('../helpers/common');
const botApi = require('../botApi');
const config = require('config');

module.exports = function (express) {
  const router = express.Router();

  function clearDatabases () {
    return botApi.bot.fulfillAll([
      botApi.database.Anek.remove({})
    ]);
  }

  router.get('/', function (req, res) {
    return res.send('hello fot Telegram bot api');
  });

  router.get('/redefine', async function (req, res, next) {
    if (!req.query.secret || (req.query.secret !== config.get('telegram.secret'))) {
      return res.send('Unauthorized');
    }

    await clearDatabases();

    return common.redefineDatabase(0).then(response => {
      return res.json('success ' + response.insertedCount);
    }).catch(error => {
      console.log(error);
      return next(error);
    });
  });

  return {
    endPoint: '/bot',
    router: router
  };
};
