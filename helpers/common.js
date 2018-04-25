/**
 * Created by energizer on 30.06.17.
 */

module.exports = function (configs) {
    let requestApi = require('../helpers/request')(configs),
        botApi = require('../helpers/bot')(configs),
        vkApi = require('../helpers/vk')(configs);
    return {
        getLastAneks: function (count, mongo) {
            vkApi.getPosts({offset: 0, count: count})
                .then(function (response) {
                    return response.response.items.map(function (anek) {
                        return mongo.Anek.findOneAndUpdate({post_id: anek.post_id}, {
                            likes: anek.likes.count,
                            comments: anek.comments,
                            reposts: anek.reposts.count
                        });
                    })
                });
        },
        getAllAneks: function (start) {
            return vkApi.getPostsCount().then(function (counter) {
                let requests = [],
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

                return requestApi.fulfillAllSequentally(requests);
            })
        },
        zipAneks: function (responses) {
            let result = [];
            for (let i = 0; i < responses.length; i++) {
                if (responses[i] && responses[i].ops) {
                    result = result.concat(responses[i].ops);
                }
            }
            return result;
        },
        redefineDatabase: function (count, mongo) {
            return this.getAllAneks(count).then(function (responses) {
                return requestApi.fulfillAllSequentally(responses.map(function (response) {
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
        updateAneks: function (mongo) {
            return this.getAllAneks().then(function (responses) {
                let aneks = [];

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
        broadcastAneks: function (users, aneks, params, mongo) {
            let errorMessages = [];

            if (!users.length || !aneks.length) {
                return Promise.resolve([]);
            }

            return aneks.map(function (anek) {
                if (anek.marked_as_ads) {
                    return botApi.sendMessageToAdmin('New anek but its an ad. Skipping broadcast')
                        .then(function () {
                            botApi.sendMessage(configs.bot.adminChat, anek, params);
                        });
                }

                return botApi.sendMessageToAdmin('Start broadcasting message ' + JSON.stringify(anek), true).then(function () {
                    return requestApi.fulfillAll(users.map(function (user) {
                        return botApi.sendMessage(user.user_id, anek, params).catch(function (error) {
                            if (!error.ok && (error.error_code === 403) || (
                                error.description === 'Bad Request: chat not found' ||
                                error.description === 'Bad Request: group chat was migrated to a supergroup chat' ||
                                error.description === 'Bad Request: chat_id is empty')) {
                                errorMessages.push(user.user_id);
                                return {};
                            } else {
                                return botApi.sendMessageToAdmin('Sending message error: ' + JSON.stringify(error) + JSON.stringify(anek));
                            }
                        });
                    })).then(function () {
                        return botApi.sendMessageToAdmin('Broadcast finished', true).then(function () {
                            if (errorMessages.length) {
                                let text = errorMessages.length + ' messages has been sent with errors due to access errors. Unsubscribing them: \n' + errorMessages.join(', ');
                                console.log(text);
                                let bulk = mongo.User.collection.initializeOrderedBulkOp();
                                bulk.find({user_id: {$in: errorMessages}}).update({$set: {subscribed: false, deleted_subscribe: true}});
                                botApi.sendMessageToAdmin(text);
                                return bulk.execute();
                            }
                        })
                    });
                })
            });
            //return aneks.map(anek => users.map(user => botApi.sendMessage(user.user_id, anek)));
        }
    };
};