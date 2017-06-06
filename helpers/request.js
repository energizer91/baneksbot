/**
 * Created by xgmv84 on 11/26/2016.
 */

module.exports = function () {
    var q = require('q'),
        http = require('http'),
        queryString = require('querystring'),
        url = require('url'),
        formData = require('form-data'),
        RateLimiter = require('request-rate-limiter'),
        limiter = new RateLimiter({
            rate: 7,
            interval: 0.3,
            backoffCode: 429,
            backOffTime: 60,
            maxWaitingTime: 600
        }),
        https = require('https');

    return {
        makeRequest: function (config, params, returnStream) {
            if (!config) {
                throw new Error('Config not specified');
            }

            if ((config.method === 'GET') && params) {
                config.path += '?' + queryString.stringify(params);
            }

            return q.Promise(function (resolve, reject) {

                limiter.request().then(function (backoff) {
                    if ((config.method && config.method.toLowerCase() === 'post') && params) {
                        //req.write(queryString.stringify(params));
                        var form = new formData();
                        for (var field in params) {
                            if (params.hasOwnProperty(field) && params[field]) {
                                form.append(field, params[field]);
                            }
                        }

                        config.headers = form.getHeaders();
                    }

                    var result = '',
                        req = (config.protocol === 'https:' ? https : http).request(config);

                    req.on('response', function (res) {
                        var code = res.statusCode;

                        //console.log('STATUS: ' + res.statusCode);
                        //console.log('HEADERS: ' + JSON.stringify(res.headers));
                        if (returnStream) {
                            return resolve(res);
                        }
                        res.setEncoding('utf8');
                        res.on('end', function() {
                            var returnResult;
                            try {
                                returnResult = JSON.parse(result);
                            } catch(e) {
                                returnResult = result;
                            }
                            //console.log('No more data in response.');
                            if (code === 429) {
                                console.log('backin\' off request in', returnResult.parameters.retry_after);
                                return backoff();
                            }
                            if (code >= 400 && code <= 600) {
                                console.error('An error occured with code ' + code);
                                console.error(returnResult);
                                return reject(returnResult);
                            }
                            //console.log(result);
                            return resolve(returnResult);
                        });
                        res.on('data', function (chunk) {
                            //console.log('BODY: ' + chunk);
                            result += chunk;
                        });
                    });

                    req.on('error', function(e) {
                        return reject(e);
                    });

                    if ((config.method && config.method.toLowerCase() === 'post') && params) {
                        form.pipe(req);

                        form.on('end', function () {
                            req.end();
                        })
                    } else {
                        req.end();
                    }
                }).catch(function (err) {
                    return reject(err);
                });
            });
        },
        prepareConfig: function (targetUrl, method) {
            var parsedUrl = url.parse(targetUrl);
            if (!parsedUrl.protocol) {
                parsedUrl.protocol = 'http:';
            }

            parsedUrl.method = method && typeof method == 'string' ? method.toUpperCase() : 'GET';
            parsedUrl.headers = {};

            return parsedUrl;
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