/**
 * Created by Александр on 16.04.2016.
 */

var botConfig = require('../config/telegram.json'),
    requestHelper = require('./request'),
    botMethods = {
        sendRequest: function (request, params, method) {
            var botUrl = botConfig.url + botConfig.token + '/' + request,
                parameters = requestHelper.prepareConfig(botUrl, method);

            return requestHelper.makeRequest(parameters, params);
        },
        sendMessage: function (userId, message) {
            return this.sendRequest('sendMessage', {
                chat_id: userId,
                text: message
            });
        },
        sendMessageToAdmin: function (text) {
            return this.sendMessage(botConfig.adminChat, text);
        },
        getMe: function () {
            return this.sendRequest('getMe');
        },
        performCommand: function (command, data) {
            return commands[command[0]].call(this, command, data);
        },
        performWebHook: function (data) {
            var command = (data.message.text || '').split(' '),
                result;

            //console.log(data);

            if (command[0].indexOf('@') >= 0) {
                command[0] = command[0].split('@')[0];
            }

            if (commands[command[0]]) {
                result = this.performCommand(command, data);
            } else {
                throw new Error('Command not found');
            }

            return result;
        }
    },
    commands = {
        '/anek': function (command, data) {
            return botMethods.sendMessageToAdmin('super pizdatiy anek');
        },
        '/subscribe': function (command, data) {
            return botMethods.sendMessageToAdmin('subscribe ' + JSON.stringify(data));
        },
        '/unsubscribe': function (command, data) {
            return botMethods.sendMessageToAdmin('unsubscribe ' + JSON.stringify(data));
        },
        '/top_day': function (command, data) {
            return botMethods.sendMessageToAdmin('top day ' + JSON.stringify(data));
        },
        '/top_week': function (command, data) {
            return botMethods.sendMessageToAdmin('top week ' + JSON.stringify(data));
        },
        '/top_month': function (command, data) {
            return botMethods.sendMessageToAdmin('top month ' + JSON.stringify(data));
        },
        '/top_ever': function (command, data) {
            return botMethods.sendMessageToAdmin('top ever ' + JSON.stringify(data));
        }
    };

module.exports = botMethods;