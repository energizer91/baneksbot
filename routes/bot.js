/**
 * Created by Александр on 13.12.2015.
 */
module.exports = function (express, botApi, configs) {
    var router = express.Router(),
        q = require('q');

    var commands = {
            '/anek': function (command, message) {
                if (command[1] == 'count') {
                    return botApi.mongo.Anek.count().then(function (count) {
                        return botApi.bot.sendMessage(message.chat.id, 'Всего анеков на данный момент: ' + count);
                    })
                } else if (command[1] == 'id') {
                    return botApi.bot.sendMessage(message.chat.id, 'id текущего чата: ' + message.chat.id);
                } else if (command[1] && (!isNaN(parseInt(command[1])))) {
                    return botApi.mongo.Anek.findOne().skip(parseInt(command[1]) - 1).exec().then(function (anek) {
                        return botApi.bot.sendMessage(message.chat.id, anek);
                    }).catch(console.error);
                }
                return botApi.mongo.Anek.random().then(function (anek) {
                    return botApi.bot.sendMessage(message.chat.id, anek);
                })
            },
            '/anek_by_id': function (command, message) {
                return botApi.mongo.Anek.findOne({post_id: command[1]}).then(function (anek) {
                    return botApi.bot.sendMessage(message.chat.id, anek);
                })
            },
            '/find_user': function (command, message) {
                return botApi.mongo.User.findOne({username: command[1]}).then(function (user) {
                    return botApi.bot.sendMessage(message.chat.id, 'Информация о пользователе ' + user.first_name + ' ' + user.last_name + ': ' + JSON.stringify(user));
                })
            },
            '/filin': function (command, message) {
                return botApi.bot.sendMessage(message.chat.id, 'Подтверждаю.');
            },
            '/krevet': function (command, message) {
                return botApi.bot.sendMessage(message.chat.id, 'кревет-кревет, и в рот кревет жопу два кревета.');
            },
            '/do_rock': function (command, message) {
                return botApi.bot.sendMessage(message.chat.id, 'денис');
            },
            '/start': function (command, message) {
                return botApi.bot.sendMessage(message.chat.id, 'Просто отправь мне /anek и обещаю, мы подружимся.');
            },
            '/help': function (command, message) {
                return botApi.bot.sendMessage(message.chat.id, 'Просто отправь мне /anek и обещаю, мы подружимся.');
            },
            '/chat': function (command, message) {
                if (!configs.bot.baneksLink) {
                    return botApi.bot.sendMessage(message.chat.id, 'денис дурак');
                }
                return botApi.bot.sendMessage(message.chat.id, 'Здесь весело: ' + configs.bot.baneksLink);
            },
            '/find': function (command, message) {
                command.splice(0, 1);

                var searchPhrase = command.join(' ');
                if (!searchPhrase.length) {
                    if (searchPhrase.length < 4) {
                        return botApi.bot.sendMessage(message.chat.id, 'Слишком короткий запрос.');
                    }
                    return botApi.bot.sendMessage(message.chat.id, 'Отправь /find поисковый запрос для поиска анека.');
                }

                return searchAneks(searchPhrase, 1).then(function (aneks) {
                    return botApi.bot.sendMessage(message.chat.id, aneks[0]);
                }).catch(function (error) {
                    console.error(error);
                    return botApi.bot.sendMessage(message.chat.id, 'Сор, бро. Ничего не нашел');
                })
            },
            '/subscribe': function (command, message) {
                return botApi.mongo.User.findOne({user_id: message.from.id}).then(function (user) {
                    if (user) {
                        if (!user.subscribed) {
                            return botApi.mongo.User.update({_id: user.id}, {subscribed: true}).then(function () {
                                return botApi.bot.sendMessage(message.from.id, 'Окей, подпишем тебя снова.');
                            });
                        } else {
                            return botApi.bot.sendMessage(user.user_id, 'Чувак, тыж уже подписан?!');
                        }
                    }
                    var newUser = new botApi.mongo.User({
                        user_id: message.from.id,
                        first_name: message.from.first_name,
                        last_name: message.from.last_name,
                        username: message.from.username,
                        platform: 'web',
                        subscribed: true
                    });
                    return newUser.save().then(function (user) {
                        return botApi.bot.sendMessage(user.user_id, 'Окей, ' + user.first_name + '. Буду присылать тебе анеки по мере поступления.');
                    });
                }).catch(function (error) {
                    console.log(error);
                    return botApi.bot.sendMessageToAdmin('subscribe fail' + JSON.stringify(error));
                });
            },
            '/unsubscribe': function (command, message) {
                return botApi.mongo.User.findOne({user_id: message.from.id}).then(function (user) {
                    if (user && user.subscribed) {
                        return botApi.mongo.User.update({_id: user.id}, {subscribed: false}).then(function () {
                            return botApi.bot.sendMessage(message.from.id, 'Хорошо, больше не буду отправлять =(');
                        });
                    }
                    return botApi.bot.sendMessage(message.from.id, 'Чувак, ты и так не подписан.');
                }).catch(function (error) {
                    console.log(error);
                    return botApi.bot.sendMessageToAdmin('unsubscribe fail' + JSON.stringify(error));
                });
            },
            '/top_day': function (command, message) {
                var count =  Math.max(Math.min(parseInt(command[1]) || 1, 20), 1);
                return botApi.mongo.Anek
                    .find({})
                    .where({date: {$gte: Math.floor(new Date().getTime() / 1000) - 24 * 60 * 60 }})
                    .sort({likes: -1})
                    .limit(count)
                    .exec()
                    .then(function (aneks) {
                        return botApi.bot.sendMessages(message.chat.id, ['Топ ' + count + ' за сутки:'].concat(aneks));
                    });
            },
            '/top_week': function (command, message) {
                var count =  Math.max(Math.min(parseInt(command[1]) || 3, 20), 1);
                return botApi.mongo.Anek
                    .find({})
                    .where({date: {$gte: Math.floor(new Date().getTime() / 1000) - 24 * 60 * 60 * 7 }})
                    .sort({likes: -1})
                    .limit(count)
                    .exec()
                    .then(function (aneks) {
                        return botApi.bot.sendMessages(message.chat.id, ['Топ ' + count + ' за неделю:'].concat(aneks));
                });
            },
            '/top_month': function (command, message) {
                var count =  Math.max(Math.min(parseInt(command[1]) || 5, 20), 1);
                return botApi.mongo.Anek
                    .find({})
                    .where({date: {$gte: Math.floor(new Date().getTime() / 1000) - 24 * 60 * 60 * 30 }})
                    .sort({likes: -1})
                    .limit(count)
                    .exec()
                    .then(function (aneks) {
                        return botApi.bot.sendMessages(message.chat.id, ['Топ ' + count + ' за месяц:'].concat(aneks));
                });
            },
            '/top_ever': function (command, message) {
                var count =  Math.max(Math.min(parseInt(command[1]) || 10, 20), 1);
                return botApi.mongo.Anek
                    .find({})
                    .sort({likes: -1})
                    .limit(count)
                    .exec()
                    .then(function (aneks) {
                        return botApi.bot.sendMessages(message.chat.id, ['Топ ' + count + ' за все время:'].concat(aneks));
                });
            }
        },
        performCommand = function (command, data) {
            return commands[command[0]].call(botApi.bot, command, data);
        },
        searchAneks = function (searchPhrase, limit, skip) {
            return botApi.mongo.Anek.find({$text: {$search: searchPhrase}}).limit(limit).skip(skip || 0).exec().then(function (results) {
                if (results.length) {
                    return results;
                }

                throw new Error('Nothing was found.');
            });
        },
        performInline = function (query) {
            var results = [],
                aneks_count = 10,
                searchAction;
            if (!query.query) {
                searchAction = botApi.mongo.Anek.find({text: {$ne: ''}})
                    .sort({date: -1})
                    .skip(query.offset || 0)
                    .limit(aneks_count)
                    .exec();
            } else {
                searchAction = searchAneks(query.query, aneks_count, query.offset || 0);
            }
            return searchAction.then(function (aneks) {
                results = aneks.map(function (anek) {
                    return {
                        type: 'article',
                        id: anek.post_id.toString(),
                        title: 'Анекдот #' + anek.post_id,
                        input_message_content: {
                            message_text: anek.text,
                            parse_mode: 'HTML'
                        },
                        //message_text: anek.text,
                        description: anek.text.slice(0, 100)
                    };
                });

                return botApi.bot.sendInline(query.id, results, query.offset + aneks_count);
            }).catch(function () {
                return botApi.bot.sendInline(query.id, results, query.offset + aneks_count);
            });
        },
        performWebHook = function (data) {
            return q.Promise(function (resolve, reject) {
                if (!data) {
                    return reject(new Error('No webhook data specified'));
                }

                return resolve(data);
            }).then(function (data) {
                if (data.hasOwnProperty('callback_query')) {
                    var queryData = data.callback_query.data.split(' ');
                    switch (queryData[0]) {
                        case 'comment':
                            var aneks = [];
                            return getAllComments(queryData[1]).then(function (comments) {
                                comments.forEach(function (comment) {
                                    aneks = aneks.concat(comment.response.items);
                                });
                                aneks = aneks.sort(function (a, b) {
                                    return b.likes.count - a.likes.count;
                                }).slice(0, 3).map(function (comment, index) {
                                    comment.text = (index + 1) + ' место:\n' + comment.text;
                                    comment.reply_to_message_id = data.callback_query.message.message_id;
                                    comment.disableButtons = true;
                                    return comment;
                                });

                                return botApi.bot.answerCallbackQuery(data.callback_query.id)
                                    .finally(botApi.bot.sendMessages.bind(botApi.bot, data.callback_query.message.chat.id, aneks));
                            });
                    }
                } else if (data.hasOwnProperty('inline_query')) {
                    return performInline(data.inline_query);
                } else if (data.message) {
                    var message = data.message;

                    if (message.new_chat_member) {
                        return botApi.bot.sendMessage(message.chat.id, 'Эгегей, ёбанный в рот!');
                    } else if (message.new_chat_member) {
                        return botApi.bot.sendMessage(message.chat.id, 'Мы не будем сильно скучать.');
                    } else if (message.text) {
                        var command = (message.text || '').split(' ');
                        if (command[0].indexOf('@') >= 0) {
                            command[0] = command[0].split('@')[0];
                        }

                        if (commands[command[0]]) {
                            return performCommand(command, data.message);
                        } else {
                            console.error('Unknown command', data);
                            throw new Error('Command not found: ' + command.join(' '));
                        }
                    }
                }
                console.log(data);
                throw new Error('No message specified');
            });
        },
        clearDatabases = function () {
            return q.all([
                botApi.mongo.Anek.remove({}),
                botApi.mongo.Comment.remove({})
            ]);
        },
        getAllComments = function (postId) {
            return botApi.vk.getCommentsCount(postId).then(function (counter) {
                var requests = [],
                    current = counter,
                    goal = 0,
                    maxStep = 100,
                    step = maxStep;

                while (current > goal) {
                    if (current - step < goal) {
                        step = current - goal;
                    }

                    current -= step;

                    requests.push(botApi.vk.getComments({post_id: postId, offset: current, count: step}));
                }

                return q.all(requests);
            });
        },
        getAllAneks = function (start) {
            return botApi.vk.getPostsCount().then(function (counter) {
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

                    requests.push(botApi.vk.getPosts({offset: current, count: step}));
                }

                return q.all(requests);
            })
        },
        redefineDatabase = function (count) {
            return getAllAneks(count).then(function (responses) {
                return q.all(responses.map(function (response) {
                    return botApi.mongo.Anek.collection.insertMany(response.response.items.reverse().map(function (anek) {
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
        };

    router.get('/', function (req, res) {
        return res.send('hello fot Telegram bot api');
    });

    router.get('/getMe', function (req, res, next) {
        return botApi.bot.getMe().then(function (response) {
            return res.send(JSON.stringify(response));
        }).catch(next);
    });

    router.get('/toAdmin', function (req, res, next) {
        return botApi.bot.sendMessageToAdmin(req.query.text || '').then(function (response) {
            return res.send(JSON.stringify(response));
        }).catch(next);
    });

    router.route('/webhook')
        .post(function (req, res) {
            return performWebHook(req.body).then(function () {
                res.status(200);
                return res.send('OK');
            }).catch(function (error) {
                console.error(error, error.stack);
                res.status(200);
                return res.send('OK');
            });
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
        return performWebHook({
            message: {
                text: req.query.query,
                chat: {
                    id: configs.bot.adminChat
                },
                from: {
                    first_name: 'Alexander',
                    last_name: 'Bareyko',
                    username: 'energizer91',
                    id: configs.bot.adminChat
                }
            }
        }).then(function (response) {
            return res.json(response);
        }).catch(next);
    });

    return {
        endPoint: '/bot',
        router: router
    };
};