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

var cp = require('child_process'),
    dbUpdater,
    childQueue = new Queue(1, Infinity),
    startDaemon = function () {
        dbUpdater = cp.fork(path.join(__dirname, 'daemons/dbUpdater.js'));

        dbUpdater.on('close', function (code, signal) {
            console.log('Aneks update process has been closed with code ' + code + ' and signal ' + signal);
            botApi.bot.sendMessageToAdmin('Aneks update process has been closed with code ' + code + ' and signal ' + signal);
        });

        dbUpdater.on('message', function (m) {
            if (m.type == 'message' && m.message) {
                childQueue.add(botApi.bot.sendMessage.bind(botApi.bot, m.userId, m.message, m.params));
            } else {
                console.log('PARENT got message:', m);
            }
        });
    },
    sendUpdaterMessage = function (res, message, responseText) {
        if (dbUpdater && dbUpdater.connected) {
            if (message && message.type && message.action) {
                dbUpdater.send(message);
                return res.send(responseText);
            }
            return res.send('Message is not defined properly');
        }
        return res.send('Updater is destroyed');
    };

startDaemon();

app.get('/startDaemon', function (req, res) {
    if (dbUpdater && dbUpdater.connected) {
        dbUpdater.kill();
    }
    startDaemon();
    return res.send('Updater has been started');
});

app.get('/stopDaemon', function (req, res) {
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
    return sendUpdaterMessage(res, {type: 'service', action: 'message', value: configs.bot.adminChat}, 'Message has been send');
});

app.get('/synchronizeDatabase', function (req, res) {
    return sendUpdaterMessage(res, {type: 'service', action: 'synchronize'}, 'Synchronize process has been started');
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
