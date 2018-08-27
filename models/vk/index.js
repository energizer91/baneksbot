const NetworkModel = require('../network');
const config = require('config');
const debug = require('debug')('baneks-node:vk');

class Vk extends NetworkModel {
  constructor () {
    super();

    this.endpoint = config.get('vk.url');
    this.groupId = config.get('vk.group_id');
    this.params = {
      _skipQueue: true,
      _rule: 'vk',
      _getBackoff: () => 300,
      v: config.get('vk.api_version'),
      access_token: config.get('vk.access_token')
    };
  }

  executeCommand (command, params, method = 'GET') {
    const axiosConfig = {
      url: this.endpoint + command,
      method: method.toLowerCase()
    };

    const requestParams = Object.assign({}, this.params, params);

    return this.makeRequest(axiosConfig, requestParams)
      .then(data => {
        if (data.error) {
          throw new Error(data.error.error_msg || 'Unknown error');
        }

        return data.response || {};
      });
  }

  getPostById (postId, params = {}) {
    params.posts = this.groupId + '_' + postId;
    params._key = this.groupId;

    debug('Making VK request wall.getById', params);

    return this.executeCommand('wall.getById', params, 'GET')
      .then(posts => {
        if (posts.length && posts[0]) {
          return posts[0];
        }

        return null;
      });
  }

  getPosts (params = {}) {
    params.owner_id = this.groupId;

    debug('Making VK request wall.get', params);

    params._key = this.groupId;

    return this.executeCommand('wall.get', params, 'GET');
  }

  getCommentsCount (postId) {
    return this.getComments({post_id: postId, offset: 0, count: 1})
      .then(function (count) {
        return (count || {}).count || 0;
      });
  }

  getPostsCount () {
    return this.getPosts({offset: 0, count: 1})
      .then(response => {
        const count = (response || {}).count || 0;

        return {
          count,
          hasPinned: response.items ? response.items[0].is_pinned : false
        };
      });
  }

  getComments (params = {}) {
    params.owner_id = this.groupId;
    params.need_likes = 1;

    debug('Making VK request wall.getComments', params);

    params._key = this.groupId;

    if (!(params.hasOwnProperty('post_id') && params.post_id)) {
      throw new Error('Post ID is not defined');
    }
    return this.executeCommand('wall.getComments', params, 'GET');
  }

  getAllComments (postId) {
    return this.getCommentsCount(postId)
      .then(counter => {
        const requests = [];
        let current = counter;
        let goal = 0;
        let step = 100;

        while (current > goal) {
          if (current - step < goal) {
            step = current - goal;
          }

          current -= step;

          requests.push(this.getComments({post_id: postId, offset: current, count: step}));
        }

        return this.fulfillAll(requests);
      });
  }
}

module.exports = Vk;
