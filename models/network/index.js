const EventEmitter = require('../events');
const Queue = require('../queue');
const axios = require('axios');
const debugError = require('debug')('baneks-node:network:error');

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
    const {_key: key, _rule: rule, getBackoff: _getBackoff, ...httpParams} = params;

    if (config.method === 'post') {
      paramsOrData.data = httpParams;
    } else {
      paramsOrData.params = httpParams;
    }

    return this.queue.request(backoff => axios({...config, ...paramsOrData})
      .then(response => response.data)
      .catch(error => {
        if (!error || !error.response) {
          throw error;
        }

        if (typeof backoff === 'function' && error.response.status === 429) {
          debugError('Back off request', error.response.data.parameters);
          backoff(_getBackoff ? _getBackoff(error) : 300);

          return error;
        }

        if (error.response.status >= 400 && error.response.status <= 600) {
          debugError('An error occured with code ' + error.response.status, error.response.data);
          throw error.response.data;
        }

        return {};
      }), key, rule);
  }

  async fulfillAll (requests) {
    let results = [];

    if (!requests.length) {
      return [];
    }

    return requests.reduce((p, request) => {
      return p
        .then(result => {
          if (result) {
            results.push(result);
          }

          return request;
        })
        .catch(error => {
          debugError('single fulfillment error', error);

          return {};
        })
    }, Promise.resolve())
      .then(lastResponse => {
        results.push(lastResponse);

        return results;
      })
      .catch(error => {
        debugError('fulfillment error', error);

        return results;
      });
  }

  async fulfillAllSequentally (requests) {
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
        debugError('single sequental fulfillment error', error);
      });
    }, Promise.resolve()).then(lastResponse => {
      results.push(lastResponse);
      return results;
    }).catch(error => {
      debugError('Sequental fulfillment error', error);
      return results;
    });
  }
}

module.exports = NetworkModel;
