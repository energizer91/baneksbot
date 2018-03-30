var express = require('express'),
    path = require('path'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    fs = require('fs'),
    routes = require('./index')(express),
    configs = require('./configs'),
    botApi = require('./botApi')(configs);

var app = express();

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'bundle')));
var Queue = require('promise-queue');


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
        var debug = typeof v8debug === 'object';
        if (debug) {
            process.execArgv.push('--debug=' + (40894));
        }
        dbUpdater = cp.fork(path.join(__dirname, 'daemons/dbUpdater.js'));
        console.log('Aneks update process has been started at', new Date());
        botApi.bot.sendMessageToAdmin('Aneks update process has been started at', new Date());

        dbUpdater.on('close', function (code, signal) {
            console.log('Aneks update process has been closed with code ' + code + ' and signal ' + signal);
            botApi.bot.sendMessageToAdmin('Aneks update process has been closed with code ' + code + ' and signal ' + signal);
            startDaemon();
        });

        dbUpdater.on('message', function (m) {
            if (m.type === 'message' && m.message) {
                return childQueue.add(botApi.bot.sendMessage.bind(botApi.bot, m.userId, m.message, m.params));
            } else if (m.type === 'broadcast' && m.users) {
                var errorMessages = [];
                //return botApi.bot.sendMessageToAdmin('Start broadcasting message ' + JSON.stringify(m.message)).then(function () {
                    return botApi.request.fulfillAll(m.users.map(function (user) {
                        return botApi.bot.sendMessage(user, m.message, m.params).catch(function (error) {
                            if (!error.ok && (error.error_code === 403) || (
                                error.description === 'Bad Request: chat not found' ||
                                error.description === 'Bad Request: group chat was migrated to a supergroup chat' ||
                                error.description === 'Bad Request: chat_id is empty')) {
                                errorMessages.push(user);
                                return {};
                            } else {
                                return botApi.bot.sendMessageToAdmin('Sending message error: ' + JSON.stringify(error) + JSON.stringify(m));
                            }
                        });
                    })).then(function () {
                        //return botApi.bot.sendMessageToAdmin('Broadcast finished').then(function () {
                            if (errorMessages.length) {
                                var text = errorMessages.length + ' messages has been sent with errors due to access errors. Unsubscribing them: \n' + errorMessages.join(', ');
                                console.log(text);
                                var bulk = botApi.mongo.User.collection.initializeOrderedBulkOp();
                                bulk.find({user_id: {$in: errorMessages}}).update({$set: {subscribed: false, deleted_subscribe: true}});
                                botApi.bot.sendMessageToAdmin(text);
                                return bulk.execute();
                            }
                        //})
                    })
                //})
            }

            console.log('PARENT got message:', m);
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

app.get('/sendMessage', function (req, res) {
    return sendUpdaterMessage(res, {type: 'service', action: 'message', value: req.query.to || configs.bot.adminChat, text: req.query.text}, 'Message has been send');
});

app.get('/synchronizeDatabase', function (req, res) {
    return sendUpdaterMessage(res, {type: 'service', action: 'synchronize'}, 'Synchronize process has been started');
});

app.use('/', routes);

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
