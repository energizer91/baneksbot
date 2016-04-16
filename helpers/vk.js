/**
 * Created by Александр on 27.12.2015.
 */

var config = require('./../config/vk.json'),
    http = require('https'),
    querystring = require('querystring'),
    url = require('url'),
    q = require('q');

module.exports = {
    executeCommand: function(command, params, method) {
        var vkUrl = url.parse(config.url + command + (!method || method.toLowerCase == 'get' ? '?' + querystring.stringify(params) : '')),
            parameters = {
                protocol: vkUrl.protocol,
                hostname: vkUrl.hostname,
                port: vkUrl.port,
                path: vkUrl.path,
                method: method || 'GET',
                headers: {}
            },
            req;

        return q.Promise(function (resolve, reject) {
            var result = '';
            req = http.request(parameters, function (res) {
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

            if (method && method.toLowerCase() === 'post') {
                req.write(querystring.stringify(params));
            }
            req.end();
        });
    }
};