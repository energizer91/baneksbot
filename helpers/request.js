/**
 * Created by xgmv84 on 11/26/2016.
 */

module.exports = function () {
    var q = require('q'),
        url = require('url'),
        requestLimiter = require('request-rate-limiter'),
        limiter = new requestLimiter({
            rate: 30,
            interval: 1
        });

    return {
        makeRequest: function (url, params, returnStream) {
            if (!url) {
                throw new Error('URL not specified');
            }

            return limiter.request({
                url: url,
                method: 'POST',
                formData: params || {}
            }).then(function (response) {
                if (returnStream) {
                    return response;
                }

                return JSON.parse(response.body);
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