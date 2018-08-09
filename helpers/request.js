/**
 * Created by xgmv84 on 11/26/2016.
 */
const QueueApi = require('./queue');
const axios = require('axios');

const queue = new QueueApi();

module.exports = {
  makeRequest: function (config, params) {
    if (!config) {
      throw new Error('Config not specified');
    }

    const paramsOrData = {};
    const { _key: key, _rule: rule, ...httpParams } = params;

    if (config.method === 'post') {
      paramsOrData.data = httpParams;
    } else {
      paramsOrData.params = httpParams;
    }

    return queue.request(backoff => axios({...config, ...paramsOrData})
      .then(response => response.data)
      .catch(error => {
        if (typeof backoff === 'function' && error.response.status === 429) {
          return backoff(error.response.parameters.retry_after);
        }

        if (error.response.status >= 400 && error.response.status <= 600) {
          console.error('An error occured with code ' + error.response.status);
          console.error(error.response.data);
          throw error.response.data;
        }

        return {};
      }), key, rule);
  },
  fulfillAll: function (requests) {
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
  },
  fulfillAllSequentally: function (requests) {
    let results = [];

    if (!requests.length) {
      return [];
    }
    return requests.reduce(function (p, request) {
      return p.then(function (result) {
        if (result) {
          results.push(result);
        }

        return request;
      }).catch(function (error) {
        console.error('Sequental fullfilment error');
        console.error(error);
      });
    }).then(function (lastResponse) {
      results.push(lastResponse);
      return results;
    }).catch(function (error) {
      console.error('Sequental fullfilment error');
      console.error(error);
      return results;
    });
  }
};
