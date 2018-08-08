const Telegram = require('./models/telegram');
const Bot = require('./models/bot');
const User = require('./models/user');
const Vk = require('./models/vk');
const database = require('./helpers/mongo');
const request = require('./helpers/request');
const statistics = require('./helpers/statistics');
const config = require('config');

const earlyResponse = (req, res, next) => {
  res.status(200);
  res.send('OK');

  return next();
};

// const logMiddleware = (req, res, next) => {
//
// };

const writeLog = (data, result, error) => {
  if (Array.isArray(result)) {
    return database.Log.insertMany(result.map(log => ({
      date: new Date(),
      request: data,
      response: log,
      error
    })))
  }

  const logRecord = new database.Log({
    date: new Date(),
    request: data,
    response: result,
    error
  });

  return logRecord.save();
};

const errorMiddleware = (err, req, res, next) => { // eslint-disable-line
  if (err) {
    return writeLog(req.update, req.results, err)
      .catch(next);
  }
};

const logMiddleware = (req, res, next) => {
  writeLog(req.update, req.results)
    .catch(next);
};

const telegram = new Telegram(request);
const vk = new Vk(request);
const bot = new Bot(telegram, vk);
const user = new User(database);

const connect = app => {
  const middlewares = [
    earlyResponse,
    telegram.middleware,
    user.middleware,
    bot.middleware,
    logMiddleware,
    errorMiddleware
  ];

  app.post(config.get('telegram.endpoint'), middlewares);
};

module.exports = {
  bot,
  connect,
  database,
  telegram,
  request,
  user,
  statistics,
  vk
};
