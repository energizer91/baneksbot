const Telegram = require('./models/telegram');
const Bot = require('./models/bot');
const User = require('./models/user');
const Vk = require('./models/vk');
const database = require('./helpers/mongo');
const request = require('./helpers/request');
const config = require('config');

const earlyResponse = (req, res, next) => {
  res.status(200);
  res.send('OK');

  return next();
};

// const logMiddleware = (req, res, next) => {
//
// };

const errorMiddleware = (err, req, res, next) => { // eslint-disable-line
  if (err) {
    console.log(err);
  }
};

const telegram = new Telegram(request);
const bot = new Bot(database, telegram);
const user = new User(database);
const vk = new Vk(request);

const connect = app => {
  const middlewares = [
    earlyResponse,
    telegram.webhookMiddleware,
    user.userMiddleware,
    bot.botMiddleware,
    errorMiddleware
  ];

  app.post(config.get('telegram.endpoint'), middlewares);

  return {
    bot,
    database,
    telegram,
    user,
    vk
  };
};

module.exports = {
  bot,
  connect,
  database,
  telegram,
  user,
  vk
};
