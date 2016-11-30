/**
 * Created by Александр on 16.04.2016.
 */

module.exports = function (configs) {
    var botConfig = configs.bot,
        requestHelper = require('./request')(configs),
        Queue = require('promise-queue'),
        vkApi = require('./vk')(configs),
        q = require('q'),
        botMethods = {
            sendRequest: function (request, params, method) {
                var botUrl = botConfig.url + botConfig.token + '/' + request,
                    parameters = requestHelper.prepareConfig(botUrl, method);

                return requestHelper.makeRequest(parameters, params);
            },
            sendInline: function (inlineId, results) {
                return this.sendRequest('answerInlineQuery', {
                    inline_query_id: inlineId,
                    results: JSON.stringify(results),
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
                if (!attachment.command) {
                    throw new Error('Attachment type is undefined');
                }
                var sendCommand = attachment.command;
                delete attachment.command;


                if (attachment.audio) {
                    return this.sendChatAction(userId, 'upload_audio')
                        .then(vkApi.getPostById.bind(vkApi, attachment.post_id))
                        .then(function (posts) {
                            var post = posts.response[0],
                                audio = post.attachments[0].audio,
                                parameters = requestHelper.prepareConfig(audio.url, 'GET');

                            console.log('sending audio', audio.url);

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
                return this.sendRequest(sendCommand, attachment);
            },
            sendMessage: function (userId, message) {
                if (!message) {
                    return;
                }

                if (message._doc && message._doc.copy_history && message._doc.copy_history.length) {
                    return this.sendMessage(userId, message._doc.copy_history[0]);
                }
                var sendMessage,
                    attachments = [];
                if (typeof message == 'string') {
                    sendMessage = {
                        chat_id: userId,
                        text: message
                    };
                } else {
                    sendMessage = {
                        chat_id: userId,
                        text: message.text + ((message.attachments && message.attachments.length > 0) ? '\n(Вложений: ' + message.attachments.length + ')' : ''),
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

                    attachments = (message.attachments || []).map(this.performAttachment.bind(this, message.post_id));
                }

                return this.sendRequest('sendMessage', sendMessage).then(this.sendAttachments.bind(this, userId, attachments));
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
            sendAttachments: function (userId, attachments) {
                var attachmentQueue = new Queue(1, Infinity);
                return (attachments || []).map(function (attachment) {
                    return attachmentQueue.add(this.sendAttachment.bind(this, userId, attachment));
                }, this);
            },
            performAttachment: function (postId, attachment) {
                if (!attachment) {
                    return undefined;
                }

                switch (attachment.type) {
                    case 'photo':
                        return {
                            command: 'sendPhoto',
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
                            text: (attachment.title || '') + '\nhttps://vk.com/video' + attachment.video.owner_id + '_' + attachment.video.id
                        };
                        break;
                    case 'doc':
                        return {
                            command: 'sendDocument',
                            document: attachment.doc.url,
                            caption: attachment.doc.title
                        };
                        break;
                    case 'audio':
                        return {
                            command: 'sendAudio',
                            audio: attachment.audio.url,
                            title: attachment.audio.artist + ' - ' + attachment.audio.title,
                            post_id: postId
                        };
                        break;
                    case 'poll':
                        return {
                            command: 'sendMessage',
                            text: 'Опрос: *' + attachment.poll.question + '*\n' + (attachment.poll.answers || []).map(function (answer, index) {
                                return  (index + 1) + ') ' + answer.text + ': ' + answer.votes + ' голоса (' + answer.rate + '%)'
                            }).join('\n'),
                            parse_mode: 'markdown'
                        };
                        break;
                    case 'link':
                        return {
                            command: 'sendMessage',
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