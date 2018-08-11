const EventEmitter = require('../events');
const Queue = require('../queue');
const axios = require('axios');

const queue = new Queue();

class NetworkModel extends EventEmitter {
  constructor () {
    super();

    this.queue = queue;
  }

  makeRequest (config, params) {
    if (!config) {
      throw new Error('Config not specified');
    }

    const paramsOrData = {};
    const {_key: key, _rule: rule, ...httpParams} = params;

    if (config.method === 'post') {
      paramsOrData.data = httpParams;
    } else {
      paramsOrData.params = httpParams;
    }

    return this.queue.request(backoff => axios({...config, ...paramsOrData})
      .then(response => response.data)
      .catch(error => {
        if (typeof backoff === 'function' && error.response.status === 429) {
          console.warn('Back off request', error.response.parameters);
          return backoff(error.response.parameters.retry_after);
        }

        if (error.response.status >= 400 && error.response.status <= 600) {
          console.error('An error occured with code ' + error.response.status);
          console.error(error.response.data);
          throw error.response.data;
        }

        return {};
      }), key, rule);
  }

  fulfillAll (requests) {
    let results = [];

    if (!requests.length) {
      return Promise.resolve([]);
    }

    return requests.reduce((p, request) => {
      return p.then(result => {
        if (result) {
          results.push(result);
        }

        return request;
      });
    }).then(lastResponse => {
      results.push(lastResponse);
      return results;
    });
  }

  fulfillAllSequentally (requests) {
    let results = [];

    if (!requests.length) {
      return [];
    }

    return requests.reduce((p, request) => {
      return p.then(result => {
        if (result) {
          results.push(result);
        }

        return request;
      }).catch(error => {
        console.error('Sequental fullfilment error');
        console.error(error);
      });
    }).then(lastResponse => {
      results.push(lastResponse);
      return results;
    }).catch(error => {
      console.error('Sequental fullfilment error');
      console.error(error);
      return results;
    });
  }
}

module.exports = NetworkModel;
