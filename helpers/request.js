/**
 * Created by xgmv84 on 11/26/2016.
 */

module.exports = function () {
    var q = require('q'),
        http = require('http'),
        queryString = require('querystring'),
        url = require('url'),
        formData = require('form-data'),
        https = require('https'),
        httpAgent = require('http-pooling-agent'),
        agent = new httpAgent.Agent({
            freeSocketsTimeout: 10000
        }),
        sslAgent = new httpAgent.SSL.Agent({
            keepAliveMsecs: 5000
        });

    return {
        sendFile: function (config, params, file) {
            if (!config) {
                throw new Error('Config not specified');
            }

            if (!file) {
                throw new Error ('File not specified');
            }

            var form = new formData();
            for (var field in params) {
                if (params.hasOwnProperty(field)) {
                    form.append(field, params[field]);
                }
            }

            form.append(file.type, file.file, file.name);
            config.headers = form.getHeaders();

            return q.Promise(function (resolve, reject) {
                form.submit(config, function (err, res) {
                    if (err) {
                        return reject(err);
                    }

                    var result = '';

                    res.setEncoding('utf8');
                    res.on('end', function() {
                        return resolve(JSON.parse(result));
                    });
                    res.on('data', function (chunk) {
                        result += chunk;
                    });
                });
            })
        },
        makeRequest: function (config, params, returnStream) {
            if (!config) {
                throw new Error('Config not specified');
            }

            if ((config.method == 'GET') && params) {
                config.path += '?' + queryString.stringify(params);
            }

            return q.Promise(function (resolve, reject) {

                var result = '',
                    req = (config.protocol == 'https:' ? https : http).request(config);

                req.on('response', function (res) {
                    var code = res.statusCode;

                    //console.log('STATUS: ' + res.statusCode);
                    //console.log('HEADERS: ' + JSON.stringify(res.headers));
                    if (returnStream) {
                        return resolve(res);
                    }
                    res.setEncoding('utf8');
                    res.on('end', function() {
                        //console.log('No more data in response.');
                        if (code >= 400 && code <= 600) {
                            var returnResult;
                            console.error('An error occured with code ' + code);
                            try {
                                returnResult = JSON.parse(result);
                            } catch(e) {
                                returnResult = result;
                            }

                            return reject(returnResult);
                        }
                        //console.log(result);
                        return resolve(JSON.parse(result));
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
                    req.write(queryString.stringify(params));
                }
                req.end();
            });
        },
        prepareConfig: function (targetUrl, method) {
            var parsedUrl = url.parse(targetUrl);
            return {
                protocol: parsedUrl.protocol || 'http:',
                hostname: parsedUrl.hostname,
                port: parsedUrl.port,
                path: parsedUrl.path,
                method: method ? method.toUpperCase() : 'GET',
                headers: {},
                agent: parsedUrl.protocol == 'http:' ? agent : sslAgent
            }
        }
    };
};