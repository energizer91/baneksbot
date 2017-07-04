/**
 * Created by Александр on 13.12.2015.
 */
module.exports = function (express, botApi, configs) {
    var router = express.Router();

    var generateUserInfo = function (user) {
        return {
            text: '```\n' +
            'User ' + user.user_id + ':\n' +
            'Имя:        ' + (user.first_name    || 'Не указано') + '\n' +
            'Фамилия:    ' + (user.last_name     || 'Не указано') + '\n' +
            'Ник:        ' + (user.username      || 'Не указано') + '\n' +
            'Подписка:   ' + (user.subscribed     ? 'Подписан' : 'Не подписан') + '\n' +
            'Фидбэк:     ' + (user.feedback_mode  ? 'Включен'  : 'Выключен') + '\n' +
            'Админ:      ' + (user.admin          ? 'Присвоен' : 'Не присвоен') + '\n' +
            'Бан:        ' + (user.banned         ? 'Забанен'  : 'Не забанен') + '\n' +
            'Язык:       ' + (user.language      || 'Не выбран') + '\n' +
            'Клавиатура: ' + (user.keyboard       ? 'Включена' : 'Выключена') + '\n' +
            'Платформа:  ' + (user.client        || 'Не выбрана') + '```'
        };
    };

    var generateStatistics = function (interval, stats) {
        return {
            text: '```\n' +
            'Статистика за ' + interval + ':\n' +
            'Пользователи\n' +
            'Всего:                  ' + stats.users.count + '\n' +
            'Новых:                  ' + stats.users.new + '\n' +
            'Подписанных:            ' + stats.users.subscribed + '\n' +
            'Новых подп.:            ' + stats.users.newly_subscribed + '\n' +
            'Отписанных:             ' + stats.users.unsubscribed + '\n' +
            'Анеки\n' +
            'Всего:                  ' + stats.aneks.count + '\n' +
            'Новых:                  ' + stats.aneks.new + '\n' +
            'Сообщения\n' +
            'Всего:                  ' + stats.messages.received + '```'
        };
    };

    var generateRandomAnswer = function (answers) {
        if (!answers || (Array.isArray(answers) && !answers.length)) {
            return '';
        }

        var random = Math.floor(Math.random() * answers.length);

        return answers[random];
    };

    var performSuggest = function (command, message, user) {
            if (message && message.chat && message.from && (message.chat.id !== message.from.id)) {
                return botApi.bot.sendMessage(message.chat.id, 'Комменты недоступны в группах.');
            }
            if (command[1]) {
                if (command[1] === 'list') {
                    var query = {
                        approved: false
                    };

                    if (!(user.editor || user.admin)) {
                        query.user = user.id;
                    }

                    return botApi.mongo.Suggest.find(query).then(function (suggests) {
                        return botApi.bot.sendMessage(message.chat.id, 'Активные предложки на данный момент: ' + suggests.length).then(function () {
                            return botApi.bot.forwardMessages(message.chat.id, suggests, {editor: user.editor || user.admin, suggest: true, native: (command[2] && command[2] === 'native')});
                        })
                    })
                }
            } else if (user.suggest_mode) {
                return botApi.bot.sendMessage(message.chat.id, 'Вы и так уже в режиме предложки.');
            } else {
                return botApi.mongo.Suggest.find({user: user.id, approved: false}).count().then(function (suggestsLength) {
                    if (suggestsLength > 5) {
                        throw new Error('Слишком много предложений в ожидании.');
                    }

                    user.suggest_mode = true;
                    return botApi.mongo.User.findOneAndUpdate({user_id: user.user_id}, user).then(function () {
                        return botApi.bot.sendMessage(message.chat.id, 'Режим предложки включен. Вы можете писать сюда' +
                            ' любой текст (кроме команд) или присылать любой контент одним сообщением и он будет ' +
                            'добавлен в ваш список предложки анонимно.');
                    });
                }).catch(function (error) {
                    return botApi.bot.sendMessage(user.user_id, 'Произошла ошибка: ' + error.message);
                });
            }
        },
        commands = {
            '/anek': function (command, message, user) {
                if (command[1] === 'count') {
                    return botApi.mongo.Anek.count().then(function (count) {
                        return botApi.bot.sendMessage(message.chat.id, botApi.dict.translate(user.language, 'total_aneks_count', {aneks_count: count}), {language: user.language});
                    })
                } else if (command[1] === 'id') {
                    return botApi.bot.sendMessage(message.chat.id, botApi.dict.translate({language: user.language}, 'current_chat_id', {chat_id: message.chat.id}), {language: user.language});
                } else if (command[1] && (!isNaN(parseInt(command[1])))) {
                    return botApi.mongo.Anek.findOne().skip(parseInt(command[1]) - 1).exec().then(function (anek) {
                        return botApi.bot.sendMessage(message.chat.id, anek, {language: user.language});
                    }).catch(console.error);
                }
                return botApi.mongo.Anek.random().then(function (anek) {
                    return botApi.bot.sendMessage(message.chat.id, anek, {language: user.language, admin: user.admin && (message.chat.id === message.from.id)})
                })
            },
            '/spam': function (command, message, user) {
                if (!user.admin) {
                    throw new Error('Unauthorized access');
                }

                if (command.length <= 1) {
                    return botApi.mongo.Anek.find({spam: true}).then(function (aneks) {
                        var spamList = aneks.map(function (anek) {
                            return anek.post_id;
                        });

                        if (!spamList.length) {
                            return botApi.bot.sendMessage(message.chat.id, 'Спам лист пуст.');
                        }

                        return botApi.bot.sendMessage(message.chat.id, 'Анеки в спам листе:\n' + spamList.join('\n'));
                    });
                }

                return botApi.mongo.Anek.findOneAndUpdate({post_id: command[1]}, {spam: true}).then(function () {
                    return botApi.bot.sendMessage(message.chat.id, 'Анек занесен в спам лист.');
                })
            },
            '/unspam': function (command, message, user) {
                if (!user.admin) {
                    throw new Error('Unauthorized access');
                }

                if (command.length <= 1) {
                    return botApi.bot.sendMessage(message.chat.id, 'Укажите id анека из спам листа /spam');
                }

                return botApi.mongo.Anek.findOneAndUpdate({post_id: command[1]}, {spam: false}).then(function () {
                    return botApi.bot.sendMessage(message.chat.id, 'Анек изъят из спам листа.');
                })
            },
            '/keyboard': function (command, message, user) {
                if (message.chat.id !== message.from.id) {
                    return botApi.bot.sendMessage(message.chat.id, 'Запрещено использовать клавиатуры в группах.');
                }
                var keyboardToggle = !user.keyboard;
                return botApi.mongo.User.findOneAndUpdate({user_id: message.chat.id}, {keyboard: keyboardToggle}).then(function () {
                    var params = {};
                    if (keyboardToggle) {
                        params.keyboard = true;
                    } else {
                        params.remove_keyboard = true;
                    }
                    return botApi.bot.sendMessage(message.chat.id, 'Клавиатура ' + (keyboardToggle ? 'включена' : 'отключена' + '.'), params);
                });
            },
            '/english': function (command, message, user) {
                user.language = 'english';
                return botApi.mongo.User.findOneAndUpdate({user_id: user.user_id}, user).then(function () {
                    return botApi.bot.sendMessage(message.chat.id, botApi.dict.translate(user.language, 'language_change'));
                });
            },
            '/russian': function (command, message, user) {
                user.language = 'russian';
                return botApi.mongo.User.findOneAndUpdate({user_id: user.user_id}, user).then(function () {
                    return botApi.bot.sendMessage(message.chat.id, botApi.dict.translate(user.language, 'language_change'));
                });
            },
            '/message': function (command, message, user) {
                if (!user.admin) {
                    throw new Error('Unauthorized access');
                }

                if (command.length <= 1) {
                    return botApi.bot.sendMessage(message.chat.id, botApi.dict.translate(user.language, 'broadcast_text_missing'));
                }

                command.splice(0, 1);

                var userId = command.splice(0, 1);

                return botApi.bot.sendMessage(userId, command.join(' '));

            },
            '/broadcast': function (command, message, user) {
                if (!user.admin) {
                    throw new Error('Unauthorized access');
                }

                if (command.length <= 1) {
                    return botApi.bot.sendMessage(message.chat.id, botApi.dict.translate(user.language, 'broadcast_text_missing'));
                }

                command.splice(0, 1);

                return botApi.mongo.User.find({subscribed: true/*user_id: {$in: [85231140, 5630968, 226612010]}*/}).then(function (users) {
                    return botApi.request.fulfillAll(users.map(function (user) {
                        return this.sendMessage(user.user_id, command.join(' '));
                    }, botApi.bot));
                }).then(botApi.bot.sendMessage.bind(botApi.bot, message.chat.id, 'Рассылка окончена.'));

            },
            '/grant': function (command, message, user) {
                if (!user.admin) {
                    throw new Error('Unauthorized access');
                }

                if (command.length <= 1) {
                    return botApi.bot.sendMessage(message.chat.id, 'Введите id пользователя.');
                }

                var privileges = {};

                if (command[2]) {
                    if (command[2] === 'admin') {
                        privileges.admin = true;
                    } else if (command[2] === 'editor') {
                        privileges.editor = true;
                    }
                } else {
                    privileges.admin = false;
                    privileges.editor = false;
                }

                return botApi.mongo.User.findOneAndUpdate({user_id: parseInt(command[1])}, privileges).then(function () {
                    return botApi.bot.sendMessage(parseInt(command[1]), 'Вам были выданы привилегии администратора пользователем ' + user.first_name + '(' + user.username + ')');
                }).then(botApi.bot.sendMessage.bind(botApi.bot, message.chat.id, 'Привилегии присвоены.'));
            },
            '/user': function (command, message, user) {
                if (command[1] === 'count') {
                    return botApi.mongo.User.count().then(function (count) {
                        return botApi.bot.sendMessage(message.chat.id, botApi.dict.translate(user.language, 'current_user_count', {count: count}));
                    })
                } else if (command[1] === 'subscribed') {
                    return botApi.mongo.User.find({subscribed: true}).count().then(function (count) {
                        return botApi.bot.sendMessage(message.chat.id, botApi.dict.translate(user.language, 'current_subscribed_user_count', {count: count}));
                    })
                } else if (command[1] === 'id') {
                    if (command[2]) {
                        return botApi.mongo.User.findOne({user_id: command[2]}).then(function (user) {
                            return botApi.bot.sendMessage(message.chat.id, generateUserInfo(user), {disableButtons: true, parse_mode: 'Markdown'});
                        })
                    }
                    return botApi.bot.sendMessage(message.chat.id, botApi.dict.translate(user.language, 'current_user_id', {user_id: message.from.id}));
                }
                return botApi.bot.sendMessage(message.chat.id, generateUserInfo(user), {disableButtons: true, parse_mode: 'Markdown'});
            },
            '/anek_by_id': function (command, message, user) {
                return botApi.mongo.Anek.findOne({post_id: command[1]}).then(function (anek) {
                    return botApi.bot.sendMessage(message.chat.id, anek, {language: user.language});
                })
            },
            '/find_user': function (command, message) {
                return botApi.mongo.User.findOne({username: command[1]}).then(function (user) {
                    return botApi.bot.sendMessage(message.chat.id, generateUserInfo(user), {disableButtons: true, parse_mode: 'Markdown'});
                })
            },
            '/filin': function (command, message, user) {
                return botApi.bot.sendMessage(message.chat.id, botApi.dict.translate(user.language, 'filin'));
            },
            '/bret': function (command, message) {
                return botApi.bot.sendMessage(message.chat.id, 'Удолил');
            },
            '/madway': function (command, message) {
                return botApi.bot.sendMessage(message.chat.id, '@Lyasya кикай');
            },
            '/krevet': function (command, message, user) {
                return botApi.bot.sendMessage(message.chat.id, botApi.dict.translate(user.language, 'krevet'));
            },
            '/do_rock': function (command, message) {
                return botApi.bot.sendMessage(message.chat.id, 'денис');
            },
            '/detcom': function (command, message) {
                return botApi.bot.sendMessage(message.chat.id, 'ПОШЁЛ _НА ХУЙ_ *ХОХОЛ*', {disableButtons: true, parse_mode: 'Markdown'});
            },
            '/svetlana': function (command, message) {
                return botApi.bot.sendMessage(message.chat.id, 'цем в лобик');
            },
            '/bareyko': function (command, message) {
                return botApi.bot.sendSticker(message.chat.id, 'CAADAgADXAYAAq8ktwaLUk5_6-Z06gI');
            },
            '/start': function (command, message, user) {
                if (command[1] && botApi.dict.languageExists(command[1])) {
                    user.language = command[1];
                } else if (command[1] && command[1] === 'donate') {
                    return botApi.bot.sendInvoice(message.from.id, {
                        title: 'Донат на развитие бота',
                        description: 'А то совсем нечего кушать',
                        payload: command[1]
                    })
                }
                
                return botApi.mongo.User.findOneAndUpdate({user_id: user.user_id}, user).then(function () {
                    return botApi.bot.sendMessage(message.chat.id, botApi.dict.translate(user.language, 'start'));
                });
            },
            '/help': function (command, message, user) {
                return botApi.bot.sendMessage(message.chat.id, botApi.dict.translate(user.language, 'start'));
            },
            '/chat': function (command, message) {
                if (!configs.bot.baneksLink) {
                    return botApi.bot.sendMessage(message.chat.id, 'денис дурак');
                }
                return botApi.bot.sendMessage(message.chat.id, 'Здесь весело: ' + configs.bot.baneksLink);
            },
            '/petux': function (command, message) {
                return botApi.bot.sendMessage(message.chat.id, 'ti');
            },
            '/shlyapa': function (command, message) {
                return botApi.bot.sendMessage(message.chat.id, generateRandomAnswer([
                    'как раз',
                    'тут не гадюшник, вешать негде'
                ]));
            },
            '/gumino': function (command, message) {
                return botApi.bot.sendMessage(message.chat.id, generateRandomAnswer([
                    'Здесь гоняют бэн',
                    'Right in da tuz!',
                    'Я слоняю в бегемэ',
                    'У нас пропал гусейший сэн!',
                    'Мы не гуси, мы не куры, мы - фанаты чляйн культуры',
                    'ЖОПА ССЫТ',
                    'Гуня. Бэби. Бздёвый ссяк.',
                    'Я бурёна',
                    'И немножко гумина',
                    'Пропал унитэйз. Обращаться к параше.'
                ]));
            },
            '/stat': function (command, message) {
                var startDate,
                    startTitle = 'всё время',
                    now = new Date();
                if (command[1]) {
                    if (command[1] === 'day') {
                        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        startTitle = 'день';
                    } else if (command[1] === 'month') {
                        startDate = new Date(now.getFullYear(), now.getMonth());
                        startTitle = 'месяц';
                    } else if (command[1] === 'week') {
                        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getDay() || 7) + 1);
                        startTitle = 'неделю';
                    } else {
                        startDate = new Date(now.getFullYear());
                    }
                } else {
                    startDate = new Date(now.getFullYear());
                }

                return botApi.statistics.getOverallStatistics(
                    botApi.mongo,
                    startDate,
                    new Date()
                ).then(function (results) {
                    return botApi.bot.sendMessage(message.chat.id, generateStatistics(startTitle, results), {disableButtons: true, parse_mode: 'Markdown'});
                })
            },
            '/suggest': performSuggest,
            '/comment': performSuggest,
            '/comment_list': function (command, message, user) {
                return performSuggest(['/command', 'list'], message, user);
            },
            '/feedback': function (command, message, user) {
                if (command[1] && user.admin) {
                    command.splice(0, 1);

                    var userId = command.splice(0, 1)[0];

                    return botApi.bot.sendMessage(userId, 'Сообщение от службы поддержки: ' + command.join(' '));
                } else if (user.feedback_mode) {
                    return botApi.bot.sendMessage(message.chat.id, 'Вы и так уже в режиме обратной связи.');
                } else {
                    user.feedback_mode = true;
                    return botApi.mongo.User.findOneAndUpdate({user_id: user.user_id}, user).then(function () {
                        return botApi.bot.sendMessage(message.chat.id, 'Режим обратной связи включен. Вы можете писать сюда' +
                            ' любой текст (кроме команд) и он будет автоматически переведен в команду поддержки. Для остановки' +
                            ' режима поддержки отправьте /unfeedback');
                    });
                }
            },
            '/unfeedback': function (command, message, user) {
                if (command[1] && user.admin) {
                    command.splice(0, 1);

                    var userId = command.splice(0, 1)[0];

                    return botApi.mongo.User.findOneAndUpdate({user_id: userId}, {feedback_mode: false}).then(function () {
                        return botApi.bot.sendMessage(message.chat.id, 'Режим службы поддержки для пользователя ' + userId + ' отключен.');
                    });
                } else if (!user.feedback_mode) {
                    return botApi.bot.sendMessage(message.chat.id, 'Режим обратной связи и так отключен.');
                } else {
                    user.feedback_mode = false;
                    return botApi.mongo.User.findOneAndUpdate({user_id: user.user_id}, user).then(function () {
                        return botApi.bot.sendMessage(message.chat.id, 'Режим обратной связи отключен.');
                    });
                }
            },
            '/ban': function (command, message, user) {
                if (command[1] && user.admin) {
                    command.splice(0, 1);

                    var userId = command.splice(0, 1)[0];

                    return botApi.mongo.User.findOneAndUpdate({user_id: userId}, {banned: true}).then(function () {
                        return botApi.bot.sendMessage(message.chat.id, 'Пользователь ' + userId + ' забанен.');
                    });
                }
            },
            '/unban': function (command, message, user) {
                if (command[1] && user.admin) {
                    command.splice(0, 1);

                    var userId = command.splice(0, 1)[0];

                    return botApi.mongo.User.findOneAndUpdate({user_id: userId}, {banned: false}).then(function () {
                        return botApi.bot.sendMessage(message.chat.id, 'Пользователь ' + userId + ' разбанен.');
                    });
                }
            },
            '/find': function (command, message, user) {
                command.splice(0, 1);

                var searchPhrase = command.join(' ');
                if (!searchPhrase.length) {
                    if (searchPhrase.length < 4 && searchPhrase.length > 0) {
                        return botApi.bot.sendMessage(message.chat.id, botApi.dict.translate(user.language, 'search_query_short'));
                    }
                    return botApi.bot.sendMessage(message.chat.id, botApi.dict.translate(user.language, 'search_query_empty'));
                }

                return performSearch(searchPhrase, 1).then(function (aneks) {
                    return botApi.bot.sendMessage(message.chat.id, aneks[0], {language: user.language});
                }).catch(function (error) {
                    console.error(error);
                    return botApi.bot.sendMessage(message.chat.id, botApi.dict.translate(user.language, 'search_query_not_found'));
                })
            },
            '/subscribe': function (command, message) {
                if (command[1] && command[1] === 'chat' && message.from.id !== message.chat.id) {
                    return new Promise(function (resolve) {
                        return updateUser(message.chat, function (err, user) {
                            if (err) {
                                console.error(err);
                                return resolve({});
                            }
                            return resolve(user);
                        });
                    }).then(function (user) {
                        if (user) {
                            if (!user.subscribed) {
                                return botApi.mongo.User.update({_id: user.id}, {subscribed: true})
                                    .then(botApi.bot.sendMessage.bind(botApi.bot, user.user_id, botApi.dict.translate(user.language, 'subscribe_success', {first_name: user.first_name})))
                                    .then(botApi.bot.sendMessageToAdmin.bind(botApi.bot, 'Новый подписчик: ' + botApi.bot.getUserInfo(user)));
                            } else {
                                return botApi.bot.sendMessage(user.user_id, botApi.dict.translate(user.language, 'subscribe_fail'));
                            }
                        }
                    });
                }

                return botApi.mongo.User.findOne({user_id: message.from.id}).then(function (user) {
                    if (user) {
                        if (!user.subscribed) {
                            return botApi.mongo.User.update({_id: user.id}, {subscribed: true})
                                .then(botApi.bot.sendMessage.bind(botApi.bot, user.user_id, botApi.dict.translate(user.language, 'subscribe_success', {first_name: user.first_name})))
                                .then(botApi.bot.sendMessageToAdmin.bind(botApi.bot, 'Новый подписчик: ' + botApi.bot.getUserInfo(user)));
                        } else {
                            return botApi.bot.sendMessage(user.user_id, botApi.dict.translate(user.language, 'subscribe_fail'));
                        }
                    }
                }).catch(function (error) {
                    console.log(error);
                    return botApi.bot.sendMessageToAdmin('subscribe fail' + JSON.stringify(error));
                });
            },
            '/unsubscribe': function (command, message) {
                if (command[1] && command[1] === 'chat' && message.from.id !== message.chat.id) {
                    return new Promise(function (resolve) {
                        return updateUser(message.chat, function (err, user) {
                            if (err) {
                                console.error(err);
                                return resolve({});
                            }
                            return resolve(user);
                        });
                    }).then(function (user) {
                        if (user && user.subscribed) {
                            return botApi.mongo.User.update({_id: user.id}, {subscribed: false})
                                .then(botApi.bot.sendMessage.bind(botApi.bot, message.chat.id, botApi.dict.translate(user.language, 'unsubscribe_success')))
                                .then(botApi.bot.sendMessageToAdmin.bind(botApi.bot, 'Человек отписался: ' + botApi.bot.getUserInfo(user)));
                        }
                        return botApi.bot.sendMessage(message.chat.id, botApi.dict.translate(user.language, 'unsubscribe_fail'));
                    });
                }

                return botApi.mongo.User.findOne({user_id: message.from.id}).then(function (user) {
                    if (user && user.subscribed) {
                        return botApi.mongo.User.update({_id: user.id}, {subscribed: false})
                            .then(botApi.bot.sendMessage.bind(botApi.bot, message.from.id, botApi.dict.translate(user.language, 'unsubscribe_success')))
                            .then(botApi.bot.sendMessageToAdmin.bind(botApi.bot, 'Человек отписался: ' + botApi.bot.getUserInfo(user)));
                    }
                    return botApi.bot.sendMessage(message.from.id, botApi.dict.translate(user.language, 'unsubscribe_fail'));
                }).catch(function (error) {
                    console.log(error);
                    return botApi.bot.sendMessageToAdmin('unsubscribe fail' + JSON.stringify(error));
                });
            },
            '/top_day': function (command, message, user) {
                var count = Math.max(Math.min(parseInt(command[1]) || 1, 20), 1);
                return botApi.mongo.Anek
                    .find({})
                    .where({date: {$gte: Math.floor(new Date().getTime() / 1000) - 24 * 60 * 60 }})
                    .sort({likes: -1})
                    .limit(count)
                    .exec()
                    .then(function (aneks) {
                        return botApi.bot.sendMessages(message.chat.id, [botApi.dict.translate(user.language, 'top_daily', {count: count})].concat(aneks), {language: user.language});
                    });
            },
            '/top_week': function (command, message, user) {
                var count =  Math.max(Math.min(parseInt(command[1]) || 3, 20), 1);
                return botApi.mongo.Anek
                    .find({})
                    .where({date: {$gte: Math.floor(new Date().getTime() / 1000) - 24 * 60 * 60 * 7 }})
                    .sort({likes: -1})
                    .limit(count)
                    .exec()
                    .then(function (aneks) {
                        return botApi.bot.sendMessages(message.chat.id, [botApi.dict.translate(user.language, 'top_weekly', {count: count})].concat(aneks), {language: user.language});
                    });
            },
            '/top_month': function (command, message, user) {
                var count =  Math.max(Math.min(parseInt(command[1]) || 5, 20), 1);
                return botApi.mongo.Anek
                    .find({})
                    .where({date: {$gte: Math.floor(new Date().getTime() / 1000) - 24 * 60 * 60 * 30 }})
                    .sort({likes: -1})
                    .limit(count)
                    .exec()
                    .then(function (aneks) {
                        return botApi.bot.sendMessages(message.chat.id, [botApi.dict.translate(user.language, 'top_monthly', {count: count})].concat(aneks), {language: user.language});
                    });
            },
            '/top_ever': function (command, message, user) {
                var count =  Math.max(Math.min(parseInt(command[1]) || 10, 20), 1);
                return botApi.mongo.Anek
                    .find({})
                    .sort({likes: -1})
                    .limit(count)
                    .exec()
                    .then(function (aneks) {
                        return botApi.bot.sendMessages(message.chat.id, [botApi.dict.translate(user.language, 'top_ever', {count: count})].concat(aneks), {language: user.language});
                    });
            },
            
            '/donate': function (command, message) {
                return botApi.bot.sendInvoice(message.from.id, {
                    title: 'Донат на развитие бота',
                    description: 'А то совсем нечего кушать',
                    payload: 'lololo'
                })
            }
        },
        performCommand = function (command, data, user) {
            return commands[command[0]].call(botApi.bot, command, data, user);
        },
        writeLog = function (data, result, error) {
            var logRecord = new botApi.mongo.Log({
                date: new Date(),
                request: data,
                response: result,
                error: error
            });

            return logRecord.save()
        },
        updateUser = function (user, callback) {
            if (!user) {
                return {};
            }

            return botApi.mongo.User.findOneAndUpdate({user_id: user.id}, user, {new: true, upsert: true, setDefaultsOnInsert: true}, callback);
        },
        searchAneks = function (searchPhrase, limit, skip) {
            return botApi.mongo.Anek.find({$text: {$search: searchPhrase}}).limit(limit).skip(skip || 0).exec().then(function (results) {
                if (results.length) {
                    return results;
                }

                throw new Error('Nothing was found.');
            });
        },
        searchAneksElastic = function (searchPhrase, limit, skip) {
            return new Promise(function (resolve, reject) {
                return botApi.mongo.Anek.esSearch({
                    from: skip,
                    size: limit,
                    query: {
                        query_string: {
                            query: searchPhrase
                        }
                    }
                }, function (err, results) {
                    if (err) {
                        return reject(err);
                    }

                    if (results && results.hits && results.hits.hits) {
                        return botApi.mongo.Anek.find({_id: {$in: botApi.mongo.Anek.convertIds(results.hits.hits)}}, function (err, aneks) {
                            if (err) {
                                return reject(err);
                            }

                            return resolve(aneks);
                        });
                    }

                    return reject(new Error('Nothing was found.'));
                });
            });
        },
        performSearch = function (searchPhrase, limit, skip) {
            if (configs.mongo.searchEngine === 'elastic') {
                return searchAneksElastic(searchPhrase, limit, skip);
            }

            return searchAneks(searchPhrase, limit, skip);
        },
        performInline = function (query, params) {
            var results = [],
                aneks_count = 5,
                searchAction;
            if (!params) {
                params = {};
            }
            if (!query.query) {
                searchAction = botApi.mongo.Anek.find({text: {$ne: ''}})
                    .sort({date: -1})
                    .skip(query.offset || 0)
                    .limit(aneks_count)
                    .exec();
            } else {
                searchAction = performSearch(query.query, aneks_count, query.offset || 0);
            }
            return searchAction.then(function (aneks) {
                results = aneks.map(function (anek) {
                    return {
                        type: 'article',
                        id: anek.post_id.toString(),
                        title: botApi.dict.translate(params.language, 'anek_number', {number: anek.post_id || 0}),
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
        acceptSuggest = function (queryData, data, params, anonymous) {
            return botApi.mongo.Suggest.findOneAndUpdate({_id: botApi.mongo.Suggest.convertId(queryData[1])}, {approved: true}).then(function (suggest) {
                return botApi.bot.answerCallbackQuery(data.callback_query.id)
                    .then(botApi.bot.editMessageButtons.bind(botApi.bot, data.callback_query.message, []))
                    .then(botApi.bot.forwardMessageToChannel.bind(botApi.bot, suggest, {native: anonymous}))
                    .then(function (sendMessage) {
                        return botApi.bot.sendMessage(data.callback_query.message.chat.id, 'Предложение одобрено.').then(function () {
                            return botApi.mongo.User.findOne({_id: suggest.user}).then(function (foundUser) {
                                if (sendMessage.ok && sendMessage.result) {
                                    return botApi.bot.forwardMessage(foundUser.user_id, sendMessage.result, {native: true});
                                }
                            });
                        });
                    });
            });
        },
        performCallbackQuery = function (queryData, data, params) {
            if (!params) {
                params = {};
            }
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
                            comment.text = botApi.dict.translate(params.language, 'th_place', {nth: (index + 1)}) + comment.text;
                            if (data && data.callback_query && data.callback_query.message && data.callback_query.message.message_id) {
                                comment.reply_to_message_id = data.callback_query.message.message_id;
                            }
                            return comment;
                        });

                        params.disableButtons = true;
                        params.forceAttachments = true;

                        return botApi.bot.answerCallbackQuery(data.callback_query.id)
                            .then(function () {
                                return botApi.bot.sendMessages(data.callback_query.message.chat.id, aneks, params);
                            });
                    });
                    break;
                case 'attach':
                    return botApi.vk.getPostById(queryData[1]).then(function (posts) {
                        var post = posts.response[0];

                        if (!post) {
                            throw new Error('Post not found');
                        }

                        if (!post.attachments && !post.copy_history) {
                            throw new Error('Attachments not found');
                        }

                        while (!post.attachments && post.copy_history) {
                            post = post.copy_history[0];
                        }

                        return botApi.bot.answerCallbackQuery(data.callback_query.id)
                            .then(function () {
                                return botApi.bot.sendAttachments(data.callback_query.message.chat.id, post.attachments.map(function (attachment) {
                                    if (data && data.callback_query && data.callback_query.message && data.callback_query.message.message_id) {
                                        attachment.reply_to_message_id = data.callback_query.message.message_id;
                                    }
                                    return attachment;
                                }));
                            });
                    });
                case 'spam':
                    return botApi.mongo.Anek.findOneAndUpdate({post_id: queryData[1]}, {spam: true}).then(function () {
                        return botApi.bot.answerCallbackQuery(data.callback_query.id).then(function () {
                            return botApi.bot.sendMessage(data.callback_query.message.chat.id, 'Анек помечен как спам.');
                        });
                    });
                case 'unspam':
                    return botApi.mongo.Anek.findOneAndUpdate({post_id: queryData[1]}, {spam: false}).then(function () {
                        return botApi.bot.answerCallbackQuery(data.callback_query.id).then(function () {
                            return botApi.bot.sendMessage(data.callback_query.message.chat.id, 'Анек помечен как нормальный.');
                        });
                    });
                case 's_a':
                    return acceptSuggest(queryData, data, params, true);
                case 's_aa':
                    return acceptSuggest(queryData, data, params, false);
                case 's_d':
                    return botApi.mongo.Suggest.findOneAndRemove({_id: botApi.mongo.Suggest.convertId(queryData[1])})
                        .then(botApi.bot.answerCallbackQuery.bind(botApi.bot, data.callback_query.id))
                        .then(botApi.bot.editMessageButtons.bind(botApi.bot, data.callback_query.message, []));
                case 's_da':
                    return botApi.mongo.Suggest.findOneAndUpdate({_id: botApi.mongo.Suggest.convertId(queryData[1])}, {public: true}).then(function () {
                        return botApi.bot.answerCallbackQuery(data.callback_query.id)
                            .then(botApi.bot.editMessageButtons.bind(botApi.bot, data.callback_query.message, []))
                            .then(botApi.bot.sendMessage.bind(botApi.bot, data.callback_query.message.chat.id, 'Предложение будет опубликовано неанонимно.'));
                    });
                case 'a_a':
                    return botApi.mongo.Anek.findOneAndUpdate({_id: botApi.mongo.Anek.convertId(queryData[1])}, {})
            }

            throw new Error('Unknown callback query ' + queryData);
        },
        performWebHook = function (data, response) {
            return new Promise(function (resolve, reject) {

                response.status(200);
                response.json({status: 'OK'});

                if (!data) {
                    return reject(new Error('No webhook data specified'));
                }

                if (data.hasOwnProperty('pre_checkout_query')) {
                    return resolve({});
                }

                var userObject = data.message || data.inline_query || data.callback_query;

                updateUser((userObject || {}).from, function (err, user) {
                    if (err) {
                        console.error(err);
                        return resolve({});
                    }
                    return resolve(user);
                });
            }).then(function (user) {
                console.log('Performing message from ' + botApi.bot.getUserInfo(user));

                if (data.hasOwnProperty('pre_checkout_query')) {
                    return botApi.bot.answerPreCheckoutQuery(data.pre_checkout_query.id, true);
                } else if (data.hasOwnProperty('callback_query')) {
                    var queryData = data.callback_query.data.split(' ');
                    return performCallbackQuery(queryData, data, {language: user.language});
                } else if (data.hasOwnProperty('inline_query')) {
                    return performInline(data.inline_query, {language: user.language});
                } else if (data.message) {
                    var message = data.message;

                    if (message.successful_payment) {
                        return botApi.bot.sendMessageToAdmin('Вам задонатили ' + (message.successful_payment.total_amount / 100) + message.successful_payment.currency).then(function () {
                            return botApi.bot.sendMessage(message.from.id, 'Большое спасибо за донат!');
                        });
                    } else if (message.new_chat_member) {
                        return botApi.bot.sendMessage(message.chat.id, 'Эгегей, ёбанный в рот!');
                    } else if (message.new_chat_member) {
                        return botApi.bot.sendMessage(message.chat.id, 'Мы не будем сильно скучать.');
                    } else if (user.suggest_mode && !user.banned) {
                        var suggest = message;

                        suggest.user = user;

                        return new botApi.mongo.Suggest(suggest).save().then(function (newSuggest) {
                            user.suggest_mode = false;
                            return botApi.mongo.User.findOneAndUpdate({user_id: user.user_id}, user).then(function () {
                                return botApi.bot.sendMessage(user.user_id, {text: 'Предложка успешно добавлена.'}, {
                                    buttons: [
                                        [
                                            {
                                                text: 'Подписаться',
                                                callback_data: 's_da ' + newSuggest._id
                                            },
                                            {
                                                text: 'Удалить',
                                                callback_data: 's_d ' + newSuggest._id
                                            }
                                        ]
                                    ]
                                });
                            });
                        });
                    } else if (message.reply_to_message && message.reply_to_message.forward_from) {
                        return botApi.mongo.User.findOne({user_id: message.reply_to_message.forward_from.id}).then(function (feedbackUser) {
                            if (feedbackUser.feedback_mode) {
                                return performCommand(['/feedback', message.reply_to_message.forward_from.id, message.text], message, user);
                            }

                            throw new Error('Unknown reply action');
                        })
                    } else if (message.text) {
                        var command = (message.text || '').split(' ');
                        if (command[0].indexOf('@') >= 0) {
                            command[0] = command[0].split('@')[0];
                        }

                        if (commands[command[0]]) {
                            return performCommand(command, message, user);
                        } else {
                            if (user.feedback_mode && !user.banned) {
                                return botApi.bot.forwardMessage(configs.bot.adminChat, message, {native: true});
                            }
                            console.error('Unknown command', data);
                            throw new Error('Command not found: ' + command.join(' '));
                        }
                    }
                }
                console.error('unhandled message', data);
                throw new Error('No message specified');
            }).then(function (response) {
                return writeLog(data, response).then(function () {
                    return response;
                })
            }).catch(function (error) {
                console.error(error);
                return writeLog(data, {}, error).then(function () {
                    return error;
                })
            });
        },
        clearDatabases = function () {
            return botApi.request.fulfillAll([
                botApi.mongo.Anek.remove({})
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

                return botApi.request.fulfillAll(requests);
            });
        },
        getAllAneks = function (start) {
            return botApi.vk.getPostsCount().then(function (counter) {
                var requests = [],
                    current = counter.count - (start || 0),
                    goal = counter.hasPinned ? 1 : 0,
                    maxStep = 100,
                    step = maxStep;

                while (current > goal) {
                    if (current - step < goal) {
                        step = current - goal;
                    }

                    current -= step;

                    requests.push(botApi.vk.getPosts({offset: current, count: step}));
                }

                return botApi.request.fulfillAll(requests);
            })
        },
        redefineDatabase = function (count) {
            return getAllAneks(count).then(function (responses) {
                return botApi.request.fulfillAll(responses.map(function (response) {
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

    router.get('/grant', function (req, res) {
        if (!req.query.secret || (req.query.secret !== configs.bot.secret)) {
            return res.send('Unauthorized')
        }

        return botApi.mongo.User.findOneAndUpdate({user_id: 5630968}, {admin: true}).then(function () {
            return res.send('ok');
        });
    });

    router.route('/webhook')
        .post(function (req, res) {
            return performWebHook(req.body, res);
        });

    router.get('/redefine', function (req, res, next) {
        if (!req.query.secret || (req.query.secret !== configs.bot.secret)) {
            return res.send('Unauthorized')
        }

        return clearDatabases().then(redefineDatabase.bind(this, 0)).then(function (response) {
            return res.json('success ' + response.length);
        }).catch(function (error) {
            console.log(error);
            return next(error);
        });
    });

    /*router.get('/users', function (req, res, next) {
        if (!req.query.secret || (req.query.secret !== configs.bot.secret)) {
            return res.send('Unauthorized')
        }

        var users = require('../config/users.json');
        return botApi.mongo.User.insertMany(users).then(function (data) {
            return res.json(data);
        }).catch(next);
    });*/

    return {
        endPoint: '/bot',
        router: router
    };
};