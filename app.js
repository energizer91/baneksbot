const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const routes = require('./index')(express);
const botApi = require('./botApi');

const app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'bundle'))); // eslint-disable-line

botApi.connect(app);

require('./helpers/commands');

// botApi.updater.connect();

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
