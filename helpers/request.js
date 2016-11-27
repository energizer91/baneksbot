/**
 * Created by xgmv84 on 11/26/2016.
 */

var q = require('q'),
    http = require('http'),
    queryString = require('querystring'),
    url = require('url'),
    https = require('https');

module.exports = {
    makeRequest: function (config, params) {
        if (!config) {
            throw new Error('Config not specified');
        }

        if ((config.method == 'GET') && params) {
            config.path += '?' + queryString.stringify(params);
        }

        return q.Promise(function (resolve, reject) {
            var result = '',
            req = (config.protocol == 'https:' ? https : http).request(config, function (res) {
                //console.log('STATUS: ' + res.statusCode);
                //console.log('HEADERS: ' + JSON.stringify(res.headers));
                res.setEncoding('utf8');
                res.on('end', function() {
                    //console.log('No more data in response.')
                    return resolve(JSON.parse(result));
                });
                res.on('data', function (chunk) {
                    //console.log('BODY: ' + chunk);
                    result += chunk;
                });
            });

            req.on('error', function(e) {
                return reject('problem with request: ' + e.message);
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
            protocol: parsedUrl.protocol || 'http',
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.path,
            method: method ? method.toUpperCase() : 'GET',
            headers: {}
        }
    }
};