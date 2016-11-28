/**
 * Created by Александр on 16.04.2016.
 */

var botConfig = require('../config/telegram.json'),
    requestHelper = require('./request'),
    q = require('q'),
    br2nl = function (text) {
        return (text || '').replace(/<br>/g, '\n');
    },
    botMethods = {
        sendRequest: function (request, params, method) {
            var botUrl = botConfig.url + botConfig.token + '/' + request,
                parameters = requestHelper.prepareConfig(botUrl, method);

            return requestHelper.makeRequest(parameters, params);
        },
        sendInline: function (inlineId, results) {
            return this.sendRequest('answerInlineQuery', {
                inline_query_id: inlineId,
                results: results.map(function (result) {
                    result.text = br2nl(result.text);
                    return result;
                }),
                cache_time: 0
            })
        },
        sendMessage: function (userId, message) {
            if (!message) {
                return;
            }
            if (typeof message == 'string') {
                return this.sendRequest('sendMessage', {
                    chat_id: userId,
                    text: br2nl(message)
                });
            } else {
                var messages = [
                    this.sendRequest('sendMessage', {
                        chat_id: userId,
                        text: br2nl(message.text)
                    })
                ].concat((message.attachments || []).map(function (attachment) {
                    return this.sendRequest('sendMessage', {
                        chat_id: userId,
                        text: this.performAttachment(attachment)
                    });
                }, this));
                return q.all(messages);
            }
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
                    return attachment.photo.photo_2560 || attachment.photo.photo_1280;
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

module.exports = botMethods;