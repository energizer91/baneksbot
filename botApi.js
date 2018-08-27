const Bot = require('./models/bot');
const User = require('./models/user');
const Vk = require('./models/vk');
const Statistics = require('./models/statistics');
const path = require('path');
const cp = require('child_process');

const database = require('./helpers/mongo');
const config = require('config');
const debug = require('debug')('baneks-node:api');

const earlyResponse = (req, res, next) => {
  res.status(200);
  res.send('OK');

  return next();
};

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

const vk = new Vk();
const bot = new Bot();
const user = new User(database);
const statistics = new Statistics(database);

const connect = app => {
  const middlewares = [
    earlyResponse,
    user.middleware,
    bot.middleware,
    logMiddleware,
    errorMiddleware
  ];

  app.post(config.get('telegram.endpoint'), middlewares);
};

let dbUpdater;

function startDaemon () {
  if (process.env.NODE_ENV !== 'production') {
    process.execArgv.push('--inspect=' + (40894));
  }

  dbUpdater = cp.fork(path.join(__dirname, 'daemons/dbUpdater.js'));

  const text = 'Aneks update process has been started at ' + new Date().toISOString();

  debug(text);
  bot.sendMessageToAdmin(text);

  dbUpdater.on('close', function (code, signal) {
    debug('Aneks update process has been closed with code ' + code + ' and signal ' + signal);
    bot.sendMessageToAdmin('Aneks update process has been closed with code ' + code + ' and signal ' + signal);

    startDaemon();
  });

  dbUpdater.on('message', m => {
    switch (m.type) {
      case 'message':
        if (!m.message) {
          return;
        }

        return bot.sendMessage(m.userId, m.message, m.params);
    }

    debug('PARENT got message:', m);
  });
}

function sendUpdaterMessage (message) {
  if (!dbUpdater || !dbUpdater.connected) {
    throw new Error('Updater is not connected');
  }

  if (!message || !message.type || !message.action) {
    throw new Error('Message is not defined properly');
  }

  dbUpdater.send(message);
}

module.exports = {
  bot,
  connect,
  database,
  user,
  statistics,
  vk,
  updater: {
    ...dbUpdater,
    connect: startDaemon,
    sendMessage: sendUpdaterMessage
  }
};
