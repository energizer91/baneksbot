/**
 * Created by xgmv84 on 11/26/2016.
 */
const http = require('http');
const queryString = require('querystring');
const url = require('url');
const FormData = require('form-data');
const QueueApi = require('./queue');
const https = require('https');

const queue = new QueueApi();

module.exports = {
  makeRequest: function (config, params, returnStream) {
    if (!config) {
      throw new Error('Config not specified');
    }

    let key = params._key;
    let rule = params._rule;

    delete params._skipQueue;
    delete params._key;
    delete params._rule;

    if ((config.method === 'GET') && params) {
      config.path += '?' + queryString.stringify(params);
    }

    return queue.request(function (backoff) {
      return new Promise(function (resolve, reject) {
        let form;
        if ((config.method && config.method.toLowerCase() === 'post') && params) {
          form = new FormData();

          for (let field in params) {
            if (params.hasOwnProperty(field) && params[field]) {
              form.append(field, params[field]);
            }
          }

          config.headers = form.getHeaders();
        }

        let result = '';
        const req = (config.protocol === 'https:' ? https : http).request(config);

        req.on('response', function (res) {
          const code = res.statusCode;

          if (returnStream) {
            return resolve(res);
          }
          res.setEncoding('utf8');
          res.on('end', function () {
            let returnResult;

            try {
              returnResult = JSON.parse(result);
            } catch (e) {
              returnResult = result;
            }

            if ((typeof backoff === 'function') && code === 429) {
              return resolve(backoff(returnResult.parameters.retry_after));
            }
            if (code >= 400 && code <= 600) {
              console.error('An error occured with code ' + code);
              console.error(returnResult);
              return reject(returnResult);
            }

            return resolve(returnResult);
          });
          res.on('data', function (chunk) {
            result += chunk;
          });
        });

        req.on('error', function (e) {
          return reject(e);
        });

        if ((config.method && config.method.toLowerCase() === 'post') && params) {
          form.pipe(req);

          form.on('end', function () {
            req.end();
          });
        } else {
          req.end();
        }
      });
    }, key, rule);
  },
  prepareConfig: function (targetUrl, method) {
    const parsedUrl = url.parse(targetUrl);

    if (!parsedUrl.protocol) {
      parsedUrl.protocol = 'http:';
    }

    parsedUrl.method = method && typeof method === 'string' ? method.toUpperCase() : 'GET';
    parsedUrl.headers = {};

    return parsedUrl;
  },
  fulfillAll: function (requests) {
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
      });
    }).then(function (lastResponse) {
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
