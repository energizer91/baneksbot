/**
 * Created by Александр on 27.12.2015.
 */

module.exports = function (configs) {
  var config = configs.vk,
    requestHelper = require('./request')(configs);

  return {
    executeCommand: function (command, params, method) {
      var vkUrl = config.url + command,
        parameters = requestHelper.prepareConfig(vkUrl, method);

      if (config.api_version) {
        params.v = config.api_version;
      }
      if (config.access_token) {
        params.access_token = config.access_token;
      }

      params._skipQueue = true;
      params._rule = 'vk';

      return requestHelper.makeRequest(parameters, params).then(function (data) {
        if (data.error) {
          throw new Error(data.error.error_msg);
        }

        return data;
      });
    },
    getPostById: function (postId, params) {
      if (!params) {
        params = {};
      }

      params.posts = config.group_id + '_' + postId;
      params._key = config.group_id;
      console.log('Making VK request wall.getById', params);
      return this.executeCommand('wall.getById', params, 'GET');
    },
    getPosts: function (params) {
      if (!params) {
        params = {};
      }

      params.owner_id = config.group_id;

      console.log('Making VK request wall.get', params);

      params._key = config.group_id;

      return this.executeCommand('wall.get', params, 'GET');
    },
    getCommentsCount: function (postId) {
      return this.getComments({post_id: postId, offset: 0, count: 1}).then(function (count) {
        return (count.response || {}).count || 0;
      });
    },
    getPostsCount: function () {
      return this.getPosts({offset: 0, count: 1}).then(function (count) {
        var postCount = (count.response || {}).count || 0;

        /*if (postCount > 0 && count.response.items[0].is_pinned) {
            postCount--;
        }

        return postCount;*/
        return {count: postCount, hasPinned: count.response.items ? count.response.items[0].is_pinned : false};
      });
    },
    getComments: function (params) {
      if (!params) {
        params = {};
      }

      params.owner_id = config.group_id;
      params.need_likes = 1;

      console.log('Making VK request wall.getComments', params);

      params._key = config.group_id;

      if (!(params.hasOwnProperty('post_id') && params.post_id)) {
        throw new Error('Post ID is not defined');
      }
      return this.executeCommand('wall.getComments', params, 'GET');
    }
  };
};