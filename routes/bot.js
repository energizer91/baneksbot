/**
 * Created by Александр on 13.12.2015.
 */
module.exports = function (express, mongo) {
    var router = express.Router(),
        vkApi = require('../helpers/vk'),
        q = require('q'),
        botApi = require('../helpers/bot'),
        updateInProcess = false,
        updateTimer,
        refreshTimer;

    var commands = {
            '/anek': function (command, data) {
                var userId = data.message.chat.id;
                if (command[1] == 'count') {
                    return mongo.Anek.count().then(function (count) {
                        return botApi.sendMessage(userId, 'Всего анеков на данный момент: ' + count);
                    })
                } else if (command[1] && (!isNaN(parseInt(command[1])))) {
                    return mongo.Anek.findOne().skip(parseInt(command[1]) - 1).exec().then(function (anek) {
                        return botApi.sendMessage(userId, anek);
                    }).catch(console.error);
                }
                return mongo.Anek.random().then(function (anek) {
                    return botApi.sendMessage(userId, anek);
                })
            },
            '/subscribe': function (command, data) {
                return botApi.sendMessageToAdmin('subscribe ' + JSON.stringify(data));
            },
            '/unsubscribe': function (command, data) {
                return botApi.sendMessageToAdmin('unsubscribe ' + JSON.stringify(data));
            },
            '/top_day': function (command, data) {
                var userId = data.message.chat.id;
                return mongo.Anek.find({}).where({date: {$gte: Math.floor(new Date().getTime() / 1000) - 24 * 60 * 60 }}).sort({likes: -1}).limit(1).exec().then(function (aneks) {
                    return q.all(aneks.concat(botApi.sendMessage(userId, 'Топ 1 анеков за сутки:')).map(function (anek) {
                        return botApi.sendMessage(userId, anek);
                    }));
                });
                //return botApi.sendMessageToAdmin('top day ' + JSON.stringify(data));
            },
            '/top_week': function (command, data) {
                var userId = data.message.chat.id;
                return mongo.Anek.find({}).where({date: {$gte: Math.floor(new Date().getTime() / 1000) - 24 * 60 * 60 * 7 }}).sort({likes: -1}).limit(3).exec().then(function (aneks) {
                    return q.all(aneks.concat(botApi.sendMessage(userId, 'Топ 3 анеков за неделю:')).map(function (anek) {
                        return botApi.sendMessage(userId, anek);
                    }));
                });
                //return botApi.sendMessageToAdmin('top week ' + JSON.stringify(data));
            },
            '/top_month': function (command, data) {
                var userId = data.message.chat.id;
                return mongo.Anek.find({}).where({date: {$gte: Math.floor(new Date().getTime() / 1000) - 24 * 60 * 60 * 30 }}).sort({likes: -1}).limit(5).exec().then(function (aneks) {
                    return q.all(aneks.concat(botApi.sendMessage(userId, 'Топ 5 анеков за месяц:')).map(function (anek) {
                        return botApi.sendMessage(userId, anek);
                    }));
                });
                //return botApi.sendMessageToAdmin('top month ' + JSON.stringify(data));
            },
            '/top_ever': function (command, data) {
                var userId = data.message.chat.id;
                return mongo.Anek.find({}).sort({likes: -1}).limit(10).exec().then(function (aneks) {
                    return q.all(aneks.concat(botApi.sendMessage(userId, 'Топ 10 анеков за все время:')).map(function (anek) {
                        return botApi.sendMessage(userId, anek);
                    }));
                });
                //return botApi.sendMessageToAdmin('top ever ' + JSON.stringify(data));
            }
        },
        performCommand = function (command, data) {
            return commands[command[0]].call(botApi, command, data);
        },
        performWebHook = function (data) {
            var result;
            if (data.inline_query) {
                console.log('Execute inline query');
            } else if (data.message) {
                var message = data.message,
                    command = (message.text || '').split(' ');

                if (message.new_chat_member) {
                    result = botApi.sendMessage(message.chat.id, 'Эгегей, ёбанный в рот!');
                } else if (message.new_chat_member) {
                    result = botApi.sendMessage(message.chat.id, 'Мы не будем сильно скучать.');
                } else {
                    if (command[0].indexOf('@') >= 0) {
                        command[0] = command[0].split('@')[0];
                    }

                    if (commands[command[0]]) {
                        result = performCommand(command, data);
                    } else {
                        throw new Error('Command not found');
                    }
                }
            } else {
                throw new Error('No messge specified');
            }
            return result;
        },
        clearDatabases = function () {
            return q.all([
                mongo.Anek.remove({}),
                mongo.Comment.remove({})
            ]);
        },
        getAllAneks = function (start) {
            return vkApi.getPostsCount().then(function (counter) {
                var requests = [],
                    current = counter - (start || 0),
                    goal = 0,
                    maxStep = 100,
                    step = maxStep;

                while (current > goal) {
                    if (current - step < goal) {
                        step = current - goal;
                    }

                    current -= step;

                    requests.push(vkApi.getPosts({offset: current, count: step}));
                }

                return q.all(requests);
            })
        },
        zipAneks = function (responses) {
            var result = [];
            for (var i = 0; i < responses.length; i++) {
                if (responses[i] && responses[i].ops) {
                    result = result.concat(responses[i].ops);
                }
            }
            return result;
        },
        redefineDatabase = function (count) {
            return getAllAneks(count).then(function (responses) {
                return q.all(responses.map(function (response) {
                    return mongo.Anek.collection.insertMany(response.response.items.reverse().map(function (anek) {
                        //anek.counter = ++counter;
                        anek.post_id = anek.id;
                        anek.likes = anek.likes.count;
                        anek.reposts = anek.reposts.count;
                        delete anek.id;
                        return anek;
                    })).catch(function (error) {
                        console.log(error);
                        return [];
                    });
                }));
            })
        },
        updateAneks = function () {
            return getAllAneks().then(function (responses) {
                var aneks = [];

                responses.forEach(function (response) {
                    aneks = aneks.concat(response.response.items.reverse().map(function (anek) {
                        return mongo.Anek.findOneAndUpdate({post_id: anek.post_id}, {
                            likes: anek.likes.count,
                            comments: anek.comments,
                            reposts: anek.reposts.count
                        });
                    }))
                });

                return q.all(aneks).catch(function (error) {
                    console.log(error);
                    return [];
                });
            })
        };

    router.get('/', function (req, res) {
        return res.send('hello fot Telegram bot api');
        //res.render('index', { title: 'Express' });
    });

    router.get('/getMe', function (req, res, next) {
        return botApi.getMe().then(function (response) {
            return res.send(JSON.stringify(response));
        }).catch(next);
        //res.render('index', { title: 'Express' });
    });

    router.get('/toAdmin', function (req, res, next) {
        return botApi.sendMessageToAdmin(req.query.text || '').then(function (response) {
            return res.send(JSON.stringify(response));
        }).catch(next);
        //res.render('index', { title: 'Express' });
    });

    router.route('/webhook')
        .post(function (req, res, next) {
            return performWebHook(req.body).then(function (response) {
                return res.json(response);
            }).catch(next);
        })
        .get(function (req, res, next) {
            res.send('just a simple hook for telegram bot');
        })
        .put(function (req, res, next) {
            res.send('just a simple PUT hook for telegram bot');
        });

    router.get('/bot', function (req, res, next) {
        return vkApi.getPosts(req.query).then(function (data) {
            return res.json(data);
        }).catch(next);
    });

    router.get('/redefine', function (req, res, next) {
        return clearDatabases().then(redefineDatabase.bind(this, 0)).then(function (response) {
            return res.json('success ' + response.length);
        }).catch(function (error) {
            console.log(error);
            return next(error);
        });
    });

    router.get('/command', function (req, res, next) {
        return performWebHook({message: {text: req.query.query}}).then(function (response) {
            return res.json(response);
        }).catch(next);
    });

    router.get('/comment', function (req, res, next) {
        return vkApi.getComments({post_id: req.query.post, need_likes: 1}).then(function (data) {
            return res.json('success');
        }).catch(next);
    });

    router.get('/users', function (req, res, next) {
        var users = require('../config/users_9_07.json');
        return mongo.User.insertMany(users).then(function (data) {
            return res.json(data);
        }).catch(next);
    });

    var checkUpdateProgress = function (operation) {
            return q.Promise(function (resolve, reject) {
                console.log(new Date(), operation);
                if (updateInProcess) {
                    return reject(new Error('Update is in progress'));
                }
                updateInProcess = true;
                return resolve(undefined);
            })
        },
        updateAneksTimer =function () {
            return checkUpdateProgress('Initializing aneks update').then(function () {
                return mongo.Anek.count();
            }).then(function (count) {
                return redefineDatabase(count).then(zipAneks);
            }).then(function (aneks){
                console.log(new Date(), aneks.length + ' aneks found. Start broadcasting');
                return mongo.User.find({subscribed: true/*user_id: {$in: [85231140, 5630968, 226612010]}*/}).then(function (users) {
                    return q.all(aneks.map(function (anek) {
                        return q.all(users.map(function (user) {
                            console.log(new Date(), 'sending anek ' + anek.post_id + ' to user ' + user.user_id + ' (' + (user.username || (user.first_name + ' ' + user.last_name)) + ')');
                            return botApi.sendMessage(user.user_id, anek);
                        }));
                    }))
                });
            }).finally(function () {
                console.log(new Date(), 'Updating finished');
                updateInProcess = false;
                setTimeout(updateAneksTimer, 30000);
            }).catch(function (error) {
                console.log(new Date(), 'An error occured');
                //throw error;
                console.error(error);
            }).done();
        },
        refreshAneksTimer = function () {
            return checkUpdateProgress('Initializing aneks refresh').then(updateAneks).finally(function () {
                console.log(new Date(), 'Refreshing finished');
                updateInProcess = false;
                setTimeout(refreshAneksTimer, 120000);
            }).catch(function (error) {
                console.log(new Date(), 'An error occured');
                //throw error;
                console.error(error);
            }).done();
        };

    /*user_id: {$in: [85231140, 5630968, 226612010]}, */

    setTimeout(updateAneksTimer, 30000);

    setTimeout(refreshAneksTimer, 130000);

    return {
        endPoint: '/bot',
        router: router
    };
};