/**
 * Created by Александр on 16.04.2016.
 */

module.exports = function (configs) {
    var botConfig = configs.bot,
        requestHelper = require('./request')(configs),
        dict = require('./dictionary'),
        Queue = require('promise-queue'),
        q = require('q'),
        botMethods = {
            sendRequest: function (request, params, method) {
                var botUrl = botConfig.url + botConfig.token + '/' + request,
                    parameters = requestHelper.prepareConfig(botUrl, method);

                return requestHelper.makeRequest(parameters, params);
            },
            sendInline: function (inlineId, results, next_offset) {
                return this.sendRequest('answerInlineQuery', {
                    inline_query_id: inlineId,
                    results: JSON.stringify(results),
                    next_offset: next_offset || 0,
                    cache_time: 0
                })
            },
            answerCallbackQuery: function (queryId, load) {
                if (!load) {
                    load = {};
                }
                return this.sendRequest('answerCallbackQuery', {
                    callback_query_id: queryId,
                    text: load.text,
                    show_alert: load.show_alert,
                    url: load.url
                }).catch(function (error) {
                    console.error(error);
                    return {};
                });
            },
            sendChatAction: function (userId, action) {
                return this.sendRequest('sendChatAction', {
                    chat_id: userId,
                    action: action
                });
            },
            sendAttachment: function (userId, attachment) {
                attachment = this.performAttachment(attachment);

                if (!attachment.command) {
                    throw new Error('Attachment type is undefined');
                }
                var sendCommand = attachment.command;
                delete attachment.command;

                attachment.chat_id = userId;
                return this.sendChatAction(userId, attachment.sendAction)
                    .then(function () {
                        if (attachment.useStream) {
                            var parameters = requestHelper.prepareConfig(attachment[attachment.type], 'GET');

                            console.log('sending stream', attachment[attachment.type]);

                            return requestHelper.makeRequest(parameters, {}, attachment.useStream).then(function (stream) {
                                var botUrl = botConfig.url + botConfig.token + '/' + sendCommand,
                                    parameters = requestHelper.prepareConfig(botUrl, 'POST');

                                attachment[attachment.type] = stream;
                                delete attachment.useStream;
                                return requestHelper.makeRequest(parameters, attachment);
                            });
                        }
                        return this.sendRequest(sendCommand, attachment);
                    }.bind(this));
            },
            prepareKeyboard: function () {
                return {
                    keyboard: [
                        [
                            {text: '/anek'}
                        ],
                        [
                            {text: '/top_day'},
                            {text: '/top_week'},
                            {text: '/top_month'},
                            {text: '/top_ever'}
                        ],
                        [
                            {text: '/keyboard'}
                        ]
                    ],
                    resize_keyboard: true
                }
            },
            prepareButtons: function (message, params) {
                var buttons = [];

                if (!params) {
                    params = {};
                }

                if (!params.disableButtons) {
                    if (message && message.from_id && message.post_id) {
                        buttons.push([]);
                        buttons[buttons.length - 1].push({
                            text: dict.translate(params.language, 'go_to_anek'),
                            url: 'https://vk.com/wall' + message.from_id + '_' + message.post_id
                        });

                        if (!params.disableComments) {
                            buttons[buttons.length - 1].push({
                                text: dict.translate(params.language, 'comments'),
                                callback_data: 'comment ' + message.post_id
                            });
                        }
                    }

                    if (message.attachments && message.attachments.length > 0 && !params.forceAttachments) {
                        buttons.push([]);
                        buttons[buttons.length - 1].push({
                            text: dict.translate(params.language, 'attachments'),
                            callback_data: 'attach ' + message.post_id
                        })
                    }

                    if (message.post_id) {
                        if (params.admin && message.spam) {
                            buttons.push([]);
                            buttons[buttons.length - 1].push({
                                text: 'Ne spam',
                                callback_data: 'unspam ' + message.post_id
                            })
                        } else if (params.admin && !message.spam) {
                            buttons.push([]);
                            buttons[buttons.length - 1].push({
                                text: 'Spam',
                                callback_data: 'spam ' + message.post_id
                            })
                        }
                    }

                    if (params.editor && params.suggest) {
                        buttons.push([]);
                        buttons[buttons.length - 1].push({
                            text: 'Принять',
                            callback_data: 's_a ' + message._id
                        });
                        buttons[buttons.length - 1].push({
                            text: 'Отклонить',
                            callback_data: 's_d ' + message._id
                        });
                    }
                }

                return buttons;
            },
            editMessageButtons: function (message, buttons) {
                if (!message) {
                    return;
                }

                if (buttons) {
                    message.reply_markup = JSON.stringify({inline_keyboard: buttons});
                } else {
                    var newButtons = this.prepareButtons(message);

                    message.reply_markup = JSON.stringify({inline_keyboard: newButtons});
                }

                if (message.chat && message.chat.id) {
                    message.chat_id = message.chat.id;
                }

                message.text = 'Решение принято';

                return this.sendRequest('editMessageReplyMarkup', message).then(function (response) {
                    return response;
                }).catch(function (error) {
                    console.error('Editing message error', error);
                    return {};
                });
            },
            editMessage: function (message) {
                if (!message) {
                    return;
                }

                message.reply_markup = this.prepareButtons(message);

                return this.sendRequest('editMessageText', message).then(function (response) {
                    //console.log(JSON.stringify(response));
                    return response;
                });
            },
            sendMessage: function (userId, message, params) {
                if (!message) {
                    return;
                }

                if (!params) {
                    params = {};
                }

                if (message && message.copy_history && message.copy_history.length && message.post_id) {
                    var insideMessage = message.copy_history[0];
                    insideMessage.post_id = message.post_id;
                    insideMessage.from_id = message.from_id;
                    insideMessage.text = message.text + (message.text.length ? '\n' : '') + insideMessage.text;
                    return this.sendMessage(userId, insideMessage, params);
                }
                var sendMessage,
                    attachments = [],
                    buttons = [];

                if (typeof message == 'string') {
                    sendMessage = {
                        chat_id: userId,
                        text: message
                    };
                } else {
                    buttons = this.prepareButtons(message, params);

                    sendMessage = {
                        chat_id: userId,
                        text: message.text + ((message.attachments && message.attachments.length > 0) ? '\n(Вложений: ' + message.attachments.length + ')' : '')
                    };

                    if (params.forceAttachments) {
                        attachments = (message.attachments || []);
                    }

                    if (params.parse_mode) {
                        sendMessage.parse_mode = params.parse_mode;
                    }
                }

                if (params.keyboard || params.remove_keyboard || buttons.length) {
                    sendMessage.reply_markup = {};
                }

                if (params.keyboard) {
                    sendMessage.reply_markup = this.prepareKeyboard();
                }

                if (params.remove_keyboard) {
                    sendMessage.reply_markup.remove_keyboard = true;
                }

                if (buttons.length > 0) {
                    sendMessage.reply_markup.inline_keyboard = buttons;
                }

                if (sendMessage.reply_markup) {
                    sendMessage.reply_markup = JSON.stringify(sendMessage.reply_markup);
                }

                if (message.reply_to_message_id) {
                    sendMessage.reply_to_message_id = message.reply_to_message_id;
                }

                return this.sendRequest('sendMessage', sendMessage).then(this.sendAttachments.bind(this, userId, attachments));
            },
            sendMessages: function (userId, messages, params) {
                var messageQueue = new Queue(1, Infinity);
                return (messages || []).reduce(function (p, message) {
                    return p.then(messageQueue.add.bind(messageQueue, this.sendMessage.bind(this, userId, message, params)));
                }.bind(this), q.when());
            },
            sendMessageToAdmin: function (text) {
                return this.sendMessage(botConfig.adminChat, text);
            },
            sendMessageToChannel: function (message) {
                return this.sendMessage(configs.bot.baneksChannel, message);
            },
            forwardMessageToChannel: function (message) {
                if (!configs.bot.baneksChannel) {
                    return;
                }
                return this.forwardMessage(configs.bot.baneksChannel, message);
            },
            forwardMessage: function (userId, message, params) {
                var buttons = this.prepareButtons(message, params),
                    sendMessage = {
                        chat_id: userId,
                        text: message.text,
                        caption: message.caption
                    },
                    commandType = '';

                if (buttons.length) {
                    sendMessage.reply_markup = {};
                    sendMessage.reply_markup.inline_keyboard = buttons;
                    sendMessage.reply_markup = JSON.stringify(sendMessage.reply_markup);
                }

                if (message.audio && message.audio.file_id) {
                    commandType = 'sendAudio';
                    sendMessage.audio = message.audio.file_id;
                } else if (message.voice && message.voice.file_id) {
                    commandType = 'sendVoice';
                    sendMessage.voice = message.voice.file_id;
                } else if (message.document && message.document.file_id) {
                    commandType = 'sendDocument';
                    sendMessage.document = message.document.file_id;
                } else if (message.photo && message.photo.length > 0) {
                    commandType = 'sendPhoto';
                    sendMessage.photo = message.photo[message.photo.length - 1].file_id;
                } else {
                    commandType = 'sendMessage';
                    sendMessage.text = sendMessage.text || 'Пустое сообщение';
                }

                return this.sendRequest(commandType, sendMessage);
            },
            forwardMessages: function (userId, messages, params) {
                var messageQueue = new Queue(1, Infinity);
                return (messages || []).reduce(function (p, message) {
                    return p.then(messageQueue.add.bind(messageQueue, this.forwardMessage.bind(this, userId, message, params)));
                }.bind(this), q.when());
            },
            getMe: function () {
                return this.sendRequest('getMe');
            },
            sendAttachments: function (userId, attachments) {
                var attachmentQueue = new Queue(1, Infinity);
                return (attachments || []).reduce(function (p, attachment) {
                    return p.then(attachmentQueue.add.bind(attachmentQueue, this.sendAttachment.bind(this, userId, attachment)));
                }.bind(this), q.when());
            },
            performAttachment: function (attachment) {
                if (!attachment) {
                    return undefined;
                }

                switch (attachment.type) {
                    case 'photo':
                        return {
                            command: 'sendPhoto',
                            sendAction: 'upload_photo',
                            reply_to_message_id: attachment.reply_to_message_id,
                            photo: attachment.photo.photo_2560
                            || attachment.photo.photo_1280
                            || attachment.photo.photo_604
                            || attachment.photo.photo_130
                            || attachment.photo.photo_75,
                            caption: attachment.text
                        };
                        break;
                    /*case 'video':
                     return {
                     command: 'sendVideo',
                     video: 'https://vk.com/video' + attachment.video.owner_id + '_' + attachment.video.id,
                     caption: attachment.video.title
                     };
                     break;*/
                    case 'video':
                        return {
                            command: 'sendMessage',
                            sendAction: 'upload_video',
                            reply_to_message_id: attachment.reply_to_message_id,
                            text: (attachment.title || '') + '\nhttps://vk.com/video' + attachment.video.owner_id + '_' + attachment.video.id
                        };
                        break;
                    case 'doc':
                        return {
                            command: 'sendDocument',
                            sendAction: 'upload_document',
                            reply_to_message_id: attachment.reply_to_message_id,
                            document: attachment.doc.url,
                            caption: attachment.doc.title
                        };
                        break;
                    case 'audio':
                        return {
                            command: 'sendAudio',
                            type: 'audio',
                            sendAction: 'upload_audio',
                            reply_to_message_id: attachment.reply_to_message_id,
                            useStream: true,
                            audio: attachment.audio.url,
                            title: attachment.audio.artist + ' - ' + attachment.audio.title
                        };
                        break;
                    case 'poll':
                        return {
                            command: 'sendMessage',
                            sendAction: 'typing',
                            reply_to_message_id: attachment.reply_to_message_id,
                            text: 'Опрос: *' + attachment.poll.question + '*\n' + (attachment.poll.answers || []).map(function (answer, index) {
                                return  (index + 1) + ') ' + answer.text + ': ' + answer.votes + ' голоса (' + answer.rate + '%)'
                            }).join('\n'),
                            parse_mode: 'markdown'
                        };
                        break;
                    case 'link':
                        return {
                            command: 'sendMessage',
                            sendAction: 'typing',
                            reply_to_message_id: attachment.reply_to_message_id,
                            text: attachment.link.title + '\n' + attachment.link.url
                        };
                        break;
                    default:
                        return undefined;
                        break;
                }
            }
        };

    Queue.configure(require('q').Promise);

    return botMethods;

};