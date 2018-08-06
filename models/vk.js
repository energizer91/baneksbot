const EventEmitter = require('events');
const config = require('config');

class Vk extends EventEmitter {
  constructor (request) {
    super();

    this.groupId = config.get('vk.group_id');
    this.request = request;
  }

  executeCommand (command, params, method) {
    const vkUrl = config.get('vk.url') + command;
    const parameters = this.request.prepareConfig(vkUrl, method);

    if (config.get('vk.api_version')) {
      params.v = config.get('vk.api_version');
    }
    if (config.get('vk.access_token')) {
      params.access_token = config.get('vk.access_token');
    }

    params._skipQueue = true;
    params._rule = 'vk';

    return this.request.makeRequest(parameters, params).then(function (data) {
      if (data.error) {
        throw new Error(data.error.error_msg || 'Unknown error');
      }

      return data;
    });
  }

  getPostById (postId, params = {}) {
    params.posts = this.groupId + '_' + postId;
    params._key = this.groupId;
    console.log('Making VK request wall.getById', params);
    return this.executeCommand('wall.getById', params, 'GET');
  }

  getPosts (params = {}) {
    params.owner_id = this.groupId;

    console.log('Making VK request wall.get', params);

    params._key = this.groupId;

    return this.executeCommand('wall.get', params, 'GET');
  }

  getCommentsCount (postId) {
    return this.getComments({post_id: postId, offset: 0, count: 1})
      .then(function (count) {
        return (count.response || {}).count || 0;
      });
  }

  getPostsCount () {
    return this.getPosts({offset: 0, count: 1})
      .then(function (count) {
        const postCount = (count.response || {}).count || 0;

        return {
          count: postCount,
          hasPinned: count.response.items ? count.response.items[0].is_pinned : false
        };
      });
  }

  getComments (params = {}) {
    params.owner_id = this.groupId;
    params.need_likes = 1;

    console.log('Making VK request wall.getComments', params);

    params._key = this.groupId;

    if (!(params.hasOwnProperty('post_id') && params.post_id)) {
      throw new Error('Post ID is not defined');
    }
    return this.executeCommand('wall.getComments', params, 'GET');
  }
}

module.exports = Vk;
