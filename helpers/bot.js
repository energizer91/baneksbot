/**
 * Created by Александр on 16.04.2016.
 */

var botConfig = require('../config/telegram.json'),
    requestHelper = require('./request'),
    Queue = require('promise-queue'),
    q = require('q'),
    botMethods = {
        sendRequest: function (request, params, method) {
            var botUrl = botConfig.url + botConfig.token + '/' + request,
                parameters = requestHelper.prepareConfig(botUrl, method);

            return requestHelper.makeRequest(parameters, params);
        },
        sendInline: function (inlineId, results) {
            var br2nl = function (text) {
                    return (text || '').replace(/<br>/g, '\n');
                };
            return this.sendRequest('answerInlineQuery', {
                inline_query_id: inlineId,
                results: JSON.stringify(results.map(function (result) {
                    result.text = br2nl(result.text);
                    return result;
                })),
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
            });
        },
        sendMessage: function (userId, message) {
            if (!message) {
                return;
            }
            var sendMessage,
                attachments = [];
            if (typeof message == 'string') {
                sendMessage = {
                    chat_id: userId,
                    text: message,
                    parse_mode: 'HTML'
                };
            } else {
                sendMessage = {
                    chat_id: userId,
                    text: message.text,
                    parse_mode: 'HTML',
                    reply_markup: !message.disableButtons ? JSON.stringify({
                        inline_keyboard: [
                            [
                                {
                                    text: 'К анеку',
                                    url: 'https://vk.com/wall' + message.from_id + '_' + message.post_id
                                },
                                {
                                    text: 'Переделки',
                                    callback_data: 'comment ' + message.post_id
                                }
                            ]
                        ]
                    }) : undefined
                };

                attachments = (message.attachments || []).map(function (attachment) {
                    return {
                        chat_id: userId,
                        text: this.performAttachment(attachment)
                    }
                }, this);

                return this.sendRequest('sendMessage', sendMessage).then(this.sendMessages.bind(this, userId, attachments));
            }
        },
        sendMessages: function (userId, messages) {
            var messageQueue = new Queue(1, Infinity);
            return (messages || []).map(function (message) {
                return messageQueue.add(this.sendMessage.bind(this, userId, message));
            }, this);
        },
        sendMessageToAdmin: function (text) {
            return this.sendMessage(botConfig.adminChat, text);
        },
        getMe: function () {
            return this.sendRequest('getMe');
        },
        config: botConfig,
        performAttachment: function (attachment) {
            if (!attachment) {
                return undefined;
            }

            switch (attachment.type) {
                case 'photo':
                    return attachment.photo.photo_2560
                        || attachment.photo.photo_1280
                        || attachment.photo.photo_604
                        || attachment.photo.photo_130
                        || attachment.photo.photo_75;
                    break;
                case 'video':
                    return 'https://vk.com/video' + attachment.video.owner_id + '_' + attachment.video.id;
                    break;
                default:
                    return undefined;
                    break;
            }
        }
    };

Queue.configure(require('q').Promise);

module.exports = botMethods;