/**
 * Created by Александр on 27.12.2015.
 */

var config = require('./../config/vk.json'),
    requestHelper = require('./request');

module.exports = {
    executeCommand: function(command, params, method) {
        var vkUrl = config.url + command,
            parameters = requestHelper.prepareConfig(vkUrl, method);

        return requestHelper.makeRequest(parameters, params);
    },
    getPosts: function (params) {
        if (!params) {
            params = {};
        }

        params.owner_id = config.group_id;
        return this.executeCommand('wall.get', params, 'GET');
    },
    getComments: function (params) {
        if (!params) {
            params = {};
        }

        params.owner_id = config.group_id;
        if (!(params.hasOwnProperty('post_id') && params.post_id)) {
            throw new Error('Post ID is not defined');
        }
        return this.executeCommand('wall.getComments', params, 'GET');
    }
};