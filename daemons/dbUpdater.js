/**
 * Created by Алекс on 27.11.2016.
 */
var updateInProcess = false,
    forceDenyUpdate = false,
    CronJob = require('cron').CronJob,
    configs = require('../configs'),
    mongo = require('../helpers/mongo')(configs),
    commonApi = require('../helpers/common')(configs),
    statisticsApi = require('../helpers/statistics')(configs);

var checkUpdateProgress = function (operation, ignoreUpdateProcess) {
        return new Promise(function (resolve, reject) {
            console.log(new Date(), operation);
            if (updateInProcess && !ignoreUpdateProcess) {
                return reject(new Error('Update is in progress'));
            }
            if (forceDenyUpdate) {
                return reject(new Error('Update is disabled'));
            }
            if (!ignoreUpdateProcess) {
                updateInProcess = true;
            }

            return resolve();
        })
    },
    updateAneksTimer = function () {
        return checkUpdateProgress('Initializing aneks update').then(function () {
            return mongo.Anek.count();
        }).then(function (count) {
            return commonApi.redefineDatabase(count, mongo).then(commonApi.zipAneks);
        }).then(function (aneks){
            if (aneks.length) {
                console.log(new Date(), aneks.length + ' aneks found. Start broadcasting');
            } else {
                console.log(new Date(), aneks.length + ' aneks found.');
            }
            return mongo.User.find({subscribed: true}).then(function (users) {
                return commonApi.broadcastAneks(users, aneks, {_rule: 'common'}, mongo);
            });
        }).catch(function (error) {
            console.error(new Date(), 'An error occured: ' + error.message);
        }).then(function () {
            console.log(new Date(), 'Updating aneks finished');
            updateInProcess = false;
        });
    },
    updateLastAneksTimer = function () {
        return checkUpdateProgress('Initializing last aneks update').then(function () {
            return commonApi.getLastAneks(100, mongo);
        }).catch(function (error) {
            console.error(new Date(), 'An error occured: ' + error.message);
        }).then(function () {
            console.log(new Date(), 'Updating last aneks finished');
            updateInProcess = false;
        });
    },
    refreshAneksTimer = function () {
        return checkUpdateProgress('Initializing aneks refresh').then(commonApi.updateAneks.bind(commonApi, mongo)).catch(function (error) {
            console.error(new Date(), 'An error occured: ' + error.message);
        }).then(function () {
            console.log(new Date(), 'Refreshing aneks finished');
            updateInProcess = false;
        });
    },
    synchronizeDatabase = function () {
        return checkUpdateProgress('Initializing aneks refresh', true).then(function () {
            return new Promise(function (resolve, reject) {
                if (configs.mongo.searchEngine !== 'elastic') {
                    console.log('Database synchronizing is only available on elasticsearch engine');
                    return;
                }

                var stream = mongo.Anek.synchronize(),
                    count = 0;

                updateInProcess = true;

                stream.on('data', function () {
                    count++;
                });
                stream.on('close', function () {
                    return resolve(count);
                });
                stream.on('error', function (err) {
                    return reject(err);
                });
            });
        }).then(function (count) {
            console.log(new Date(), 'Successfully indexed', count, 'records');
        }).catch(function (error) {
            console.error(new Date(), 'An error occured: ' + error.message);
        }).then(function () {
            console.log(new Date(), 'Synchronize database finished');
        });
    },
    calculateStatisticsTimer = function () {
        return checkUpdateProgress('Initializing statistics calculate', true).then(function () {
            return statisticsApi.calculateStatistics(mongo);
        }).catch(function (error) {
            console.error(new Date(), 'An error occured: ' + error.message);
        }).then(function () {
            console.log(new Date(), 'Statistics calculate finished');
        });
    };

process.on('message', function(m) {
    console.log('CHILD got message:', m);
    if (m.type === 'service') {
        switch (m.action) {
            case 'update':
                console.log('Switch automatic updates to', m.value);
                forceDenyUpdate = !m.value;
                break;
            case 'synchronize':
                console.log('Start database synchronizing');
                synchronizeDatabase();
                break;
            case 'message':
                process.send({type: 'message', userId: m.value, message: m.text || 'Проверка'});
                break;
            case 'anek':
                return mongo.Anek.random().then(function (anek) {
                    process.send({type: 'message', userId: user.user_id, message: anek.text, params: {language: user.language}});
                });
            default:
                console.log('Unknown service command');
                break;
        }
    }
});

new CronJob('*/30 * * * * *', updateAneksTimer, null, true);
new CronJob('0 */5 * * * *', calculateStatisticsTimer, null, true);
new CronJob('0 0 */1 * * *', updateLastAneksTimer, null, true);
new CronJob('0 30 */1 * * *', synchronizeDatabase, null, true);
new CronJob('0 0 0 */1 * *', refreshAneksTimer, null, true);

process.send({ message: 'ready' });