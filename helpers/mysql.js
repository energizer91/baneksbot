/**
 * Created by Александр on 27.12.2015.
 */
var mysql = require('mysql'),
    q = require('q'),
    mysqlConfig = require('../config/mysql.json'),
    mysqlConnection = mysql.createConnection({
        host     : mysqlConfig.server,
        port     : mysqlConfig.port,
        user     : mysqlConfig.user,
        password : mysqlConfig.password,
        database : mysqlConfig.database
    });

module.exports = {
    makeRequest: function (query) {
        return q.Promise(function (resolve, reject) {
            mysqlConnection.connect(function(err) {
                if (err) {
                    return reject(err);
                }

                console.log('Connected as id ' + mysqlConnection.threadId);
            });
            mysqlConnection.query(query, function (err, rows) {
                if (err) {
                    return reject(err);
                }

                return resolve(rows);
            });
            mysqlConnection.end(function(err) {
                if (err) {
                    return reject(err);
                }

                console.log('Connection ' + mysqlConnection.threadId + ' has been terminated');
            });
        })
    }
};