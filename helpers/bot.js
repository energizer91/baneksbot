/**
 * Created by Александр on 16.04.2016.
 */

module.exports = function (configs) {
    var botConfig = configs.bot,
        requestHelper = require('./request')(configs),
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


                if (attachment.audio) {
                    return this.sendChatAction(userId, 'upload_audio')
                        .then(function () {
                        var parameters = requestHelper.prepareConfig(attachment.audio, 'GET');

                        console.log('sending audio', attachment.audio);

                        return requestHelper.makeRequest(parameters, {}, true).then(function (stream) {
                            var botUrl = botConfig.url + botConfig.token + '/' + 'sendAudio',
                                parameters = requestHelper.prepareConfig(botUrl, 'POST');
                            return requestHelper.sendFile(parameters, {
                                chat_id: userId,
                                title: attachment.title
                            }, {
                                type: 'audio',
                                file: stream,
                                name: attachment.id + '.mp3'
                            });
                        });
                        })
                }
                attachment.chat_id = userId;
                return this.sendChatAction(userId, attachment.sendAction)
                    .then(this.sendRequest.bind(this, sendCommand, attachment));
            },
            sendMessage: function (userId, message) {
                if (!message) {
                    return;
                }

                if (message._doc && message._doc.copy_history && message._doc.copy_history.length) {
                    return this.sendMessage(userId, message._doc.copy_history[0]);
                }
                var sendMessage;
                if (typeof message == 'string') {
                    sendMessage = {
                        chat_id: userId,
                        text: message
                    };
                } else {
                    var buttons = [],
                        buttonsWrapper;

                    if (!message.disableButtons) {
                        buttons.push({
                                text: 'К анеку',
                                url: 'https://vk.com/wall' + message.from_id + '_' + message.post_id
                            },
                            {
                                text: 'Переделки',
                                callback_data: 'comment ' + message.post_id
                            });
                    }

                    if (message.attachments && message.attachments.length > 0) {
                        buttons.push({
                            text: 'Вложения',
                            callback_data: 'attach ' + message.post_id
                        })
                    }

                    if (buttons.length > 0) {
                        buttonsWrapper = JSON.stringify({
                            inline_keyboard: [
                                buttons
                            ]
                        });
                    }

                    sendMessage = {
                        chat_id: userId,
                        text: message.text + ((message.attachments && message.attachments.length > 0) ? '\n(Вложений: ' + message.attachments.length + ')' : ''),
                        reply_markup: buttonsWrapper
                    };

                    //attachments = (message.attachments || []).map(this.performAttachment.bind(this, message.post_id));
                }

                return this.sendRequest('sendMessage', sendMessage)/*.then(function (response) {
                    return this.sendAttachments(userId, attachments).then(function () {
                        return response;
                    })
                }.bind(this))*/;
            },
            sendMessages: function (userId, messages) {
                var messageQueue = new Queue(1, Infinity);
                return (messages || []).reduce(function (p, message) {
                    return p.then(messageQueue.add.bind(messageQueue, this.sendMessage.bind(this, userId, message)));
                }.bind(this), q.when());
            },
            sendMessageToAdmin: function (text) {
                return this.sendMessage(botConfig.adminChat, text);
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
                            text: (attachment.title || '') + '\nhttps://vk.com/video' + attachment.video.owner_id + '_' + attachment.video.id
                        };
                        break;
                    case 'doc':
                        return {
                            command: 'sendDocument',
                            sendAction: 'upload_document',
                            document: attachment.doc.url,
                            caption: attachment.doc.title
                        };
                        break;
                    case 'audio':
                        return {
                            command: 'sendAudio',
                            audio: attachment.audio.url,
                            title: attachment.audio.artist + ' - ' + attachment.audio.title
                        };
                        break;
                    case 'poll':
                        return {
                            command: 'sendMessage',
                            sendAction: 'typing',
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