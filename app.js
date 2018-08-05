const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const routes = require('./index')(express);
const config = require('config');
const bot = require('./bot');

const app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'bundle'))); // eslint-disable-line

const botApi = bot.connect(app);

require('./helpers/commands')(botApi);

const Queue = require('promise-queue');

const cp = require('child_process');
let dbUpdater;
const childQueue = new Queue(1, Infinity);
let forceStopDaemon = false;

function startDaemon() {
  const debug = typeof v8debug === 'object'; // eslint-disable-line

  if (debug) {
    process.execArgv.push('--debug=' + (40894)); // eslint-disable-line
  }

  dbUpdater = cp.fork(path.join(__dirname, 'daemons/dbUpdater.js')); // eslint-disable-line

  const text = 'Aneks update process has been started at ' + new Date().toISOString();

  console.log(text);
  botApi.telegram.sendMessageToAdmin(text);

  dbUpdater.on('close', function (code, signal) {
    console.log('Aneks update process has been closed with code ' + code + ' and signal ' + signal);
    botApi.telegram.sendMessageToAdmin('Aneks update process has been closed with code ' + code + ' and signal ' + signal);

    if (!forceStopDaemon) {
      startDaemon();
    }

  });

  dbUpdater.on('message', function (m) {
    if (m.type === 'message' && m.message) {
      return childQueue.add(botApi.telegram.sendMessage.bind(botApi.telegram, m.userId, m.message, m.params));
    } else if (m.type === 'broadcast' && m.users) {
      const errorMessages = [];

      return botApi.request.fulfillAll(m.users.map(function (user) {
        return botApi.telegram.sendMessage(user, m.message, m.params).catch(function (error) {
          if (!error.ok && (error.error_code === 403) || (
            error.description === 'Bad Request: chat not found' ||
            error.description === 'Bad Request: group chat was migrated to a supergroup chat' ||
            error.description === 'Bad Request: chat_id is empty')) {
            errorMessages.push(user);
            return {};
          } else {
            return botApi.telegram.sendMessageToAdmin('Sending message error: ' + JSON.stringify(error) + JSON.stringify(m));
          }
        });
      })).then(function () {
        if (errorMessages.length) {
          const text = errorMessages.length + ' messages has been sent with errors due to access errors. Unsubscribing them: \n' + errorMessages.join(', ');
          const bulk = botApi.mongo.User.collection.initializeOrderedBulkOp();

          console.log(text);

          bulk.find({user_id: {$in: errorMessages}}).update({$set: {subscribed: false, deleted_subscribe: true}});
          botApi.telegram.sendMessageToAdmin(text);
          return bulk.execute();
        }
      });
    }

    console.log('PARENT got message:', m);
  });
}

function sendUpdaterMessage(res, message, responseText) {
  if (dbUpdater && dbUpdater.connected) {
    if (message && message.type && message.action) {
      dbUpdater.send(message);
      return res.send(responseText);
    }
    return res.send('Message is not defined properly');
  }
  return res.send('Updater is destroyed');
}

// startDaemon();

app.get('/startDaemon', function (req, res) {
  if (dbUpdater && dbUpdater.connected) {
    dbUpdater.kill();
  }
  forceStopDaemon = false;
  startDaemon();
  return res.send('Updater has been started');
});

app.get('/stopDaemon', function (req, res) {
  forceStopDaemon = true;
  if (dbUpdater && dbUpdater.connected) {
    dbUpdater.kill();
  }
  return res.send('Updater has been stopped');
});

app.get('/disableUpdate', function (req, res) {
  return sendUpdaterMessage(res, {type: 'service', action: 'update', value: false}, 'Update has been disabled');
});

app.get('/enableUpdate', function (req, res) {
  return sendUpdaterMessage(res, {type: 'service', action: 'update', value: true}, 'Update has been enabled');
});

app.get('/testMessage', function (req, res) {
  return sendUpdaterMessage(res, {
    type: 'service',
    action: 'message',
    value: config.get('telegram.adminChat')
  }, 'Message has been send');
});

app.get('/sendMessage', function (req, res) {
  return sendUpdaterMessage(res, {
    type: 'service',
    action: 'message',
    value: req.query.to || config.get('telegram.adminChat'),
    text: req.query.text
  }, 'Message has been send');
});

app.get('/synchronizeDatabase', function (req, res) {
  return sendUpdaterMessage(res, {type: 'service', action: 'synchronize'}, 'Synchronize process has been started');
});

app.get('/getLastAneks', function (req, res) {
  return sendUpdaterMessage(res, {type: 'service', action: 'last'}, 'GetLastAneks process has been started');
});

app.use('/', routes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  const err = new Error('Not Found');

  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    console.error(err, err.stack);
    res.status(err.status || 500);
    res.json(err);
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  console.error(err, err.stack);
  res.status(err.status || 500);
  res.json(err);
});


module.exports = app;
