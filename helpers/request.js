/**
 * Created by xgmv84 on 11/26/2016.
 */

module.exports = function () {
    var q = require('q'),
        url = require('url'),
        requestLimiter = require('request-rate-limiter'),
        request = require('request'),
        limiter = new requestLimiter({
            rate: 30,
            interval: 1
        });

    return {
        makeRequest: function (url, params, returnStream) {
            if (!url) {
                throw new Error('URL not specified');
            }

            return limiter.request().then(function (backoff) {
                return q.Promise(function (resolve, reject) {
                    return request({
                        url: url,
                        method: 'POST',
                        formData: params || {}
                    }, function(err, response, body) {
                        if (err) {
                            return reject(err);
                        }
                        else if (response.statusCode === 429) {

                            // we have to back off. this callback will be called again as soon as the remote enpoint
                            // should accept requests again. no need to queue your callback another time on the limiter.
                            backoff();
                        }
                        else {
                            if (returnStream) {
                                return resolve(response);
                            }
                            return resolve(JSON.parse(body));
                        }
                    });
                });
            });
        },
        prepareConfig: function (targetUrl, method) {
            var parsedUrl = url.parse(targetUrl);
            return {
                protocol: parsedUrl.protocol || 'http:',
                hostname: parsedUrl.hostname,
                port: parsedUrl.port,
                path: parsedUrl.path,
                method: method && typeof method == 'string' ? method.toUpperCase() : 'GET',
                headers: {}
            }
        },
        fulfillAll: function (requests) {
            var results = [];
            if (!requests.length) {
                return [];
            }
            return requests.reduce(function (p, request) {
                return p.then(function (result) {
                    if (result) {
                        results.push(result);
                    }

                    return request;
                })
            }).then(function (lastResponse) {
                results.push(lastResponse);
                return results;
            });
        },
        fulfillAllSequentally: function (method, requests) {
            var results = [];
            if (!requests.length) {
                return [];
            }
            return requests.reduce(function (p, request) {
                return p.then(function (result) {
                    if (result) {
                        results.push(result);
                    }

                    return method(request);
                }).catch(function (error) {
                    console.error('Sequental fullfilment error');
                    console.error(error);
                })
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
};