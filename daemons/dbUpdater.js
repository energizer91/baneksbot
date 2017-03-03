/**
 * Created by Алекс on 27.11.2016.
 */
var q = require('q'),
    updateInProcess = false,
    forceDenyUpdate = false,
    configs = require('../configs'),
    mongo = require('../helpers/mongo')(configs),
    requestApi = require('../helpers/request')(configs),
    vkApi = require('../helpers/vk')(configs);

var getAllAneks = function (start) {
        return vkApi.getPostsCount().then(function (counter) {
            var requests = [],
                current = counter.count - (start || 0),
                goal = counter.hasPinned ? 1 : 0,
                maxStep = 100,
                step = maxStep;

            while (current > goal) {
                if (current - step < goal) {
                    step = current - goal;
                }

                current -= step;

                requests.push(vkApi.getPosts({offset: current, count: step}));
            }

            return requestApi.fulfillAll(requests);
        })
    },
    zipAneks = function (responses) {
        var result = [];
        for (var i = 0; i < responses.length; i++) {
            if (responses[i] && responses[i].ops) {
                result = result.concat(responses[i].ops);
            }
        }
        return result;
    },
    redefineDatabase = function (count) {
        return getAllAneks(count).then(function (responses) {
            return requestApi.fulfillAll(responses.map(function (response) {
                return mongo.Anek.collection.insertMany(response.response.items.reverse().map(function (anek) {
                    anek.post_id = anek.id;
                    anek.likes = anek.likes.count;
                    anek.reposts = anek.reposts.count;
                    delete anek.id;
                    return anek;
                })).catch(function (error) {
                    console.log(error);
                    return [];
                });
            }));
        })
    },
    updateAneks = function () {
        return getAllAneks().then(function (responses) {
            var aneks = [];

            responses.forEach(function (response) {
                aneks = aneks.concat(response.response.items.reverse().map(function (anek) {
                    return [{post_id: anek.post_id}, {
                        likes: anek.likes.count,
                        comments: anek.comments,
                        reposts: anek.reposts.count
                    }];
                }))
            });

            return requestApi.fulfillAll(aneks.map(function (anek) {
                return mongo.Anek.findOneAndUpdate(anek[0], anek[1]);
            })).catch(function (error) {
                console.log(error);
                return [];
            });
        })
    },
    checkUpdateProgress = function (operation) {
        return q.Promise(function (resolve, reject) {
            console.log(new Date(), operation);
            if (updateInProcess) {
                return reject(new Error('Update is in progress'));
            }
            if (forceDenyUpdate) {
                return reject(new Error('Update is disabled'));
            }
            updateInProcess = true;
            return resolve(undefined);
        })
    },
    updateAneksTimer =function () {
        return checkUpdateProgress('Initializing aneks update').then(function () {
            return mongo.Anek.count();
        }).then(function (count) {
            return redefineDatabase(count).then(zipAneks);
        }).then(function (aneks){
            console.log(new Date(), aneks.length + ' aneks found. Start broadcasting');
            return mongo.User.find({subscribed: true/*user_id: {$in: [85231140, 5630968, 226612010]}*/}).then(function (users) {
                aneks.forEach(function (anek) {
                    users.forEach(function (user) {
                        process.send({type: 'message', userId: user.user_id, message: anek, params: {language: user.language}});
                    })
                });
            });
        }).finally(function () {
            console.log(new Date(), 'Updating aneks finished');
            updateInProcess = false;
            setTimeout(updateAneksTimer, 30000);
        }).catch(function (error) {
            console.error(new Date(), 'An error occured: ' + error.message);
        }).done();
    },
    refreshAneksTimer = function () {
        return checkUpdateProgress('Initializing aneks refresh').then(updateAneks).finally(function () {
            console.log(new Date(), 'Refreshing aneks finished');
            updateInProcess = false;
            setTimeout(refreshAneksTimer, 130000);
        }).catch(function (error) {
            console.error(new Date(), 'An error occured: ' + error.message);
        }).done();
    },
    synchronizeDatabase = function () {
        if (configs.mongo.searchEngine !== 'elastic') {
            console.log('Database synchronizing is only available on elasticsearch engine');
            return;
        }

        var stream = mongo.Anek.synchronize(),
            count = 0;

        stream.on('data', function () {
            count++;
        });
        stream.on('close', function () {
            console.log('indexed ' + count + ' documents!');
        });
        stream.on('error', function (err) {
            console.log(err);
        });
    };

setTimeout(updateAneksTimer, 30000);

setTimeout(refreshAneksTimer, 130000);

process.on('message', function(m) {
    console.log('CHILD got message:', m);
    if (m.type == 'service') {
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
                mongo.User.findOne({user_id: m.value}).then(function (user) {
                    process.send({type: 'message', userId: user.user_id, message: 'Проверка', params: {language: user.language}});
                    });
                break;
            default:
                console.log('Unknown service command');
                break;
        }
    }
});

process.send({ message: 'ready' });