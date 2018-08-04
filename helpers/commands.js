module.exports = function (configs, botApi) {
    const common = require('./common')(configs);

    function generateUserInfo (user) {
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
    }

    function generateStatistics (interval, stats) {
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
    }

    function generateRandomAnswer (answers) {
        if (!answers || (Array.isArray(answers) && !answers.length)) {
            return '';
        }

        const random = Math.floor(Math.random() * answers.length);

        return answers[random];
    }

    function performSuggest (command, message, user) {
        if (message && message.chat && message.from && (message.chat.id !== message.from.id)) {
            return botApi.sendMessage(message.chat.id, 'Комменты недоступны в группах.');
        }
        if (command[1]) {
            if (command[1] === 'list') {
                const query = {
                    approved: false
                };

                if (!(user.editor || user.admin)) {
                    query.user = user.id;
                }

                return botApi.mongo.Suggest.find(query).then(function (suggests) {
                    return botApi.sendMessage(message.chat.id, 'Активные предложки на данный момент: ' + suggests.length).then(function () {
                        return botApi.forwardMessages(message.chat.id, suggests, {editor: user.editor || user.admin, suggest: true, native: (command[2] && command[2] === 'native')});
                    })
                })
            }
        } else if (user.suggest_mode) {
            return botApi.sendMessage(message.chat.id, 'Вы и так уже в режиме предложки.');
        } else {
            return botApi.mongo.Suggest.find({user: user.id, approved: false}).count().then(function (suggestsLength) {
                if (suggestsLength > 5) {
                    throw new Error('Слишком много предложений в ожидании.');
                }

                user.suggest_mode = true;

                return botApi.mongo.User.findOneAndUpdate({user_id: user.user_id}, user).then(function () {
                    return botApi.sendMessage(message.chat.id, 'Режим предложки включен. Вы можете писать сюда' +
                        ' любой текст (кроме команд) или присылать любой контент одним сообщением и он будет ' +
                        'добавлен в ваш список предложки анонимно.');
                });
            }).catch(function (error) {
                return botApi.sendMessage(user.user_id, 'Произошла ошибка: ' + error.message);
            });
        }
    }

    const commands = {
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
                    const spamList = aneks.map(function (anek) {
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
            const keyboardToggle = !user.keyboard;

            return botApi.mongo.User.findOneAndUpdate({user_id: message.chat.id}, {keyboard: keyboardToggle}).then(function () {
                const params = {};
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

            const userId = command.splice(0, 1);

            return botApi.bot.sendMessage(userId, command.join(' '));

        },
        '/get_me': function (command, message, user) {
            if (!user.admin) {
                throw new Error('Unauthorized access');
            }

            return botApi.bot.getMe()
                .then(function (info) {
                    botApi.bot.sendMessage(message.chat.id, JSON.stringify(info));
                });
        },
        '/set_webhook': function (command, message, user) {
            if (!user.admin) {
                throw new Error('Unauthorized access');
            }

            return botApi.bot.setWebhook()
                .then(function (info) {
                    botApi.bot.sendMessage(message.chat.id, JSON.stringify(info));
                });
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

            const privileges = {};

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
        '/birthday': function (command, message) {
            return botApi.bot.sendRequest('sendPhoto', {chat_id: message.chat.id, photo: 'AgADAgADMagxGy3cYUribqypKXY_gAXZDw4ABKi3xzmLAAHaqMQjAQABAg'});
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
        '/pin': function (command, message) {
            return botApi.bot.sendMessage(message.chat.id, 'я не ем усы');
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
                'Пропал унитэйз. Обращаться к параше.',
                'Я пришел сюда сосать, срать и бить ебальники.',
                'Нунис срет, пердает в дубз\nЧыли гняга хахатуз',
                'Бачевать вдоль тузина',
                'ГАВНА В СУКУ ДАТЬ!!!',
                'Няный блэмс',
                'залезть на башенный крян и делать оттуда понос на кирпичи',
                'Бжук',
                'Ты желаешь джюбджина?',
                'Пейте дети молоко, будете карёвы',
                'У меня встала жопа',
                'Натрахаться на КЛИТЫРЬ!!!!',
                'Баклажанить вдоль салата',
                'СИДИШЬ ЖОПИШЬ СРЭК, ПЕДЕРАСТИРУЯ ГУЗЛОКАЛ \n' +
                '#достаточно\n' +
                '@\n' +
                'ВДРУГ ВЫВАЛИВАЕТСЯ ДВУХМЕТРОВЫЙ СОСЯН\n' +
                '@\n' +
                'КАЗАЛОСЬ БЫ #антибугурт , НО\n' +
                '@\n' +
                'ВНЕЗАПНО НАЧИНАЕТ БЭНИТЬСЯ ДАВНО ЗАБЫТАЯ ДРИСТЁВАЯ БОБУЛЯ\n' +
                '@\n' +
                'УЛЕТАЕШЬ В КОПРОСТРАНСТВО ВСЛЕД ЗА КОРАБЛЕМ ХУЕЖЁПЕР-3',
                'Мы не хиппи, мы не готы, мы - большие бегемоты',
                'Унитазная вода - наша лучшая еда',
                'Должен трахать, но вынужден отсасывать',
                'Кузовок с грибаме'
            ]));
        },
        '/stat': function (command, message) {
            let startDate,
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

                const userId = command.splice(0, 1)[0];

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

                const userId = command.splice(0, 1)[0];

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

                const userId = command.splice(0, 1)[0];

                return botApi.mongo.User.findOneAndUpdate({user_id: userId}, {banned: true}).then(function () {
                    return botApi.bot.sendMessage(message.chat.id, 'Пользователь ' + userId + ' забанен.');
                });
            }
        },
        '/unban': function (command, message, user) {
            if (command[1] && user.admin) {
                command.splice(0, 1);

                const userId = command.splice(0, 1)[0];

                return botApi.mongo.User.findOneAndUpdate({user_id: userId}, {banned: false}).then(function () {
                    return botApi.bot.sendMessage(message.chat.id, 'Пользователь ' + userId + ' разбанен.');
                });
            }
        },
        '/find': function (command, message, user) {
            command.splice(0, 1);

            const searchPhrase = command.join(' ');

            if (!searchPhrase.length) {
                if (searchPhrase.length < 4 && searchPhrase.length > 0) {
                    return botApi.bot.sendMessage(message.chat.id, botApi.dict.translate(user.language, 'search_query_short'));
                }
                return botApi.bot.sendMessage(message.chat.id, botApi.dict.translate(user.language, 'search_query_empty'));
            }

            return common.performSearch(searchPhrase, 1, 0, botApi.mongo).then(function (aneks) {
                return botApi.bot.sendMessage(message.chat.id, aneks[0], {language: user.language});
            }).catch(function (error) {
                console.error(error);
                return botApi.bot.sendMessage(message.chat.id, botApi.dict.translate(user.language, 'search_query_not_found'));
            })
        },
        '/subscribe': function (command, message) {
            if (command[1] && command[1] === 'chat' && message.from.id !== message.chat.id) {
                return new Promise(function (resolve) {
                    return common.updateUser(message.chat, botApi.mongo, function (err, user) {
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
                    return common.updateUser(message.chat, botApi.mongo, function (err, user) {
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
            const count = Math.max(Math.min(parseInt(command[1]) || 1, 20), 1);

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
            const count =  Math.max(Math.min(parseInt(command[1]) || 3, 20), 1);

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
            const count =  Math.max(Math.min(parseInt(command[1]) || 5, 20), 1);

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
            const count =  Math.max(Math.min(parseInt(command[1]) || 10, 20), 1);

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
        },
        '/synchronize': function (command, message, user) {
            if (user.admin) {
                return new Promise(function (resolve, reject) {
                    const stream = botApi.mongo.Anek.synchronize();
                    let count = 0;

                    stream.on('data', function () {
                        count++;
                    });
                    stream.on('close', function () {
                        return resolve(count);
                    });
                    stream.on('error', function (err) {
                        return reject(err);
                    });
                }).then(function (count) {
                    return botApi.bot.sendMessage(message.chat.id, 'Successfully indexed ' + count + ' records');
                }).catch(function (error) {
                    return botApi.bot.sendMessage(message.chat.id, 'An error occured: ' + error.message);
                });
            }
        }
    }

    function performCommand (command, data, user) {
        return commands[command[0]].call(botApi.bot, command, data, user);
    }

    return {
        commands,
        performCommand
    };
}