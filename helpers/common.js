/**
 * Created by energizer on 30.06.17.
 */

const config = require('config');
const botApi = require('../botApi');

module.exports = {
  searchAneks: function (searchPhrase, limit, skip) {
    return botApi.database.Anek.find({$text: {$search: searchPhrase}}).limit(limit).skip(skip || 0).exec().then(function (results) {
      if (results.length) {
        return results;
      }

      throw new Error('Nothing was found.');
    });
  },
  searchAneksElastic: function (searchPhrase, limit, skip) {
    return new Promise(function (resolve, reject) {
      return botApi.database.Anek.esSearch({
        query: {
          match: {
            text: searchPhrase
          }
        },
        from: skip,
        size: limit
      }, {
        highlight: {
          pre_tags: ['*'],
          post_tags: ['*'],
          fields: {
            text: {}
          }
        }
      }, function (err, results) {
        if (err) {
          return reject(err);
        }

        if (results && results.hits && results.hits.hits) {
          return resolve(results.hits.hits);
        }

        return reject(new Error('Nothing was found.'));
      });
    });
  },
  performSearch: function (searchPhrase, limit, skip) {
    if (config.get('mongodb.searchEngine') === 'elastic') {
      return this.searchAneksElastic(searchPhrase, limit, skip);
    }

    return this.searchAneks(searchPhrase, limit, skip);
  },
  getLastAneks: function (count) {
    botApi.vk.getPosts({offset: 0, count: count})
      .then(function (response) {
        return response.response.items.map(function (anek) {
          return botApi.database.Anek.findOneAndUpdate({post_id: anek.post_id}, {
            likes: anek.likes.count,
            comments: anek.comments,
            reposts: anek.reposts.count
          });
        });
      });
  },
  getAllAneks: function (start) {
    return botApi.vk.getPostsCount().then(function (counter) {
      let requests = [];
      let current = counter.count - (start || 0);
      let goal = counter.hasPinned ? 1 : 0;
      let step = 100;

      while (current > goal) {
        if (current - step < goal) {
          step = current - goal;
        }

        current -= step;

        requests.push(botApi.vk.getPosts({offset: current, count: step}));
      }

      return botApi.bot.fulfillAllSequentally(requests);
    });
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
  redefineDatabase: function (count) {
    return this.getAllAneks(count).then(function (responses) {
      return botApi.bot.fulfillAllSequentally(responses.map(function (response) {
        return botApi.database.Anek.collection.insertMany(response.response.items.reverse().map(function (anek) {
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
    });
  },
  updateAneks: function () {
    return this.getAllAneks().then(function (responses) {
      let aneks = [];

      responses.forEach(function (response) {
        aneks = aneks.concat(response.response.items.reverse().map(function (anek) {
          return [{post_id: anek.post_id}, {
            likes: anek.likes.count,
            comments: anek.comments,
            reposts: anek.reposts.count
          }];
        }));
      });

      return botApi.bot.fulfillAll(aneks.map(function (anek) {
        return botApi.database.Anek.findOneAndUpdate(anek[0], anek[1]);
      })).catch(function (error) {
        console.log(error);
        return [];
      });
    });
  },
  filterAnek: function (anek) {
    const donate = (anek.text || '').indexOf('#донат') >= 0;
    const ads = anek.marked_as_ads;

    return !donate && !ads;
  },
  broadcastAneks: function (users, aneks, params) {
    let errorMessages = [];

    if (!users.length || !aneks.length) {
      return Promise.resolve([]);
    }

    return aneks
      .filter(this.filterAnek)
      .map(anek => botApi.bot.fulfillAll(users.map(user => botApi.bot.sendAnek(user.user_id, anek, params)
        .catch(function (error) {
          if ((!error.ok && (error.error_code === 403)) || (
            error.description === 'Bad Request: chat not found' ||
            error.description === 'Bad Request: group chat was migrated to a supergroup chat' ||
            error.description === 'Bad Request: chat_id is empty')) {
            errorMessages.push(user.user_id);
            return {};
          }

          return botApi.bot.sendMessageToAdmin('Sending message error: ' + JSON.stringify(error) + JSON.stringify(anek));
        })))
        .then(() => {
          if (errorMessages.length) {
            let text = errorMessages.length + ' messages has been sent with errors due to access errors. Unsubscribing them: \n' + errorMessages.join(', ');
            console.log(text);
            let bulk = botApi.database.User.collection.initializeOrderedBulkOp();
            bulk.find({user_id: {$in: errorMessages}}).update({$set: {subscribed: false, deleted_subscribe: true}});
            botApi.bot.sendMessageToAdmin(text);
            return bulk.execute();
          }
        }));
  }
};
