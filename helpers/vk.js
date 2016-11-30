/**
 * Created by Александр on 27.12.2015.
 */

module.exports = function (configs) {
    var config = configs.vk,
        requestHelper = require('./request')(configs);

    return {
        executeCommand: function(command, params, method) {
            var vkUrl = config.url + command,
                parameters = requestHelper.prepareConfig(vkUrl, method);

            if (config.api_version) {
                params.v = config.api_version;
            }

            return requestHelper.makeRequest(parameters, params);
        },
        getPostById: function (postId, params) {
            if (!params) {
                params = {};
            }

            params.posts = config.group_id + '_' + postId;
            console.log('Making VK request wall.getById', params);
            return this.executeCommand('wall.getById', params, 'GET');
        },
        getPosts: function (params) {
            if (!params) {
                params = {};
            }

            params.owner_id = config.group_id;
            console.log('Making VK request wall.get', params);
            return this.executeCommand('wall.get', params, 'GET');
        },
        getCommentsCount: function (postId) {
            return this.getComments({post_id: postId, offset: 0, count: 1}).then(function (count) {
                return (count.response || {}).count || 0;
            })
        },
        getPostsCount: function () {
            return this.getPosts({offset: 0, count: 1}).then(function (count) {
                return (count.response || {}).count || 0;
            })
        },
        getComments: function (params) {
            if (!params) {
                params = {};
            }

            params.owner_id = config.group_id;
            params.need_likes = 1;
            if (!(params.hasOwnProperty('post_id') && params.post_id)) {
                throw new Error('Post ID is not defined');
            }
            console.log('Making VK request wall.getComments', params);
            return this.executeCommand('wall.getComments', params, 'GET');
        }
    };
};