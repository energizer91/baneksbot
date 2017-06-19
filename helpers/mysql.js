/**
 * Created by Александр on 27.12.2015.
 */

module.exports = function (configs) {
    var mysql = require('mysql'),
        mysqlConfig = configs.mysql,
        mysqlConnection = mysql.createConnection({
            host     : mysqlConfig.server,
            port     : mysqlConfig.port,
            user     : mysqlConfig.user,
            password : mysqlConfig.password,
            database : mysqlConfig.database
        });

    return {
        makeRequest: function (query) {
            return new Promise(function (resolve, reject) {
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
};