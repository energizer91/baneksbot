var express = require('express'),
    path = require('path'),
    favicon = require('serve-favicon'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    fs = require('fs'),
    routes = require('./index')(express),
    configs = require('./configs'),
    botApi = require('./botApi')(configs);

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

app.use('/', routes);

var files = fs.readdirSync(path.join(__dirname, 'routes'));

for (var file in files) {
    if (files.hasOwnProperty(file)) {
        var routerEndpoint = require(path.join(__dirname, 'routes') + '/' + files[file])(express, botApi, configs);
        app.use('/api' + routerEndpoint.endPoint, routerEndpoint.router);
    }
}

var cp = require('child_process');

var dbUpdater = cp.fork(path.join(__dirname, 'daemons/dbUpdater.js'));

dbUpdater.on('close', function (code) {
    console.log('Aneks update process has been closed with code ' + code);
});

var childQueue = new Queue(1, Infinity);

dbUpdater.on('message', function (m) {
    if (m.type == 'message' && m.message) {
        childQueue.add(botApi.bot.sendMessage(m.userId, m.message));
    } else {
        console.log('PARENT got message:', m);
    }
});

app.get('/disableUpdate', function (req, res) {
    dbUpdater.send({type: 'service', action: 'update', value: false});
    return res.send('Update has been disabled');
});

app.get('/enableUpdate', function (req, res) {
    dbUpdater.send({type: 'service', action: 'update', value: true});
    return res.send('Update has been enabled');
});

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


module.exports = app;
