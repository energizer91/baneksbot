var express = require('express'),
    path = require('path'),
    favicon = require('serve-favicon'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    fs = require('fs'),
    routes = require('./index')(express),
    botApi = require('./helpers/bot'),
    botDB = require('./helpers/mongo');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
var Queue = require('promise-queue');

Queue.configure(require('q').Promise);

var messageQueue = new Queue();

app.use('/', routes);

var files = fs.readdirSync(path.join(__dirname, 'routes'));

for (var file in files) {
    if (files.hasOwnProperty(file)) {
        var routerEndpoint = require(path.join(__dirname, 'routes') + '/' + files[file])(express, botDB, messageQueue);
        app.use('/api' + routerEndpoint.endPoint, routerEndpoint.router);
    }
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
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
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    console.error(err, err.stack);
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

var cp = require('child_process');

var dbUpdater = cp.fork(path.join(__dirname, 'helpers/dbUpdater.js'));

dbUpdater.on('close', function (code) {
    console.log('Aneks update process has been closed with code ' + code);
});

dbUpdater.on('message', function (m) {
    if (m.type == 'message' && m.message) {
        messageQueue.add(botApi.sendMessage(m.userId, m.message));
    } else {
        console.log('PARENT got message:', m);
    }
});


module.exports = app;
