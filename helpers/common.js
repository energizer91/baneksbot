/**
 * Created by energizer on 30.06.17.
 */

const config = require('config');
const botApi = require('../botApi');

const processAnek = anek => {
  const {id, ...rest} = anek;

  return {
    ...rest,
    post_id: anek.id,
    likes: anek.likes.count,
    reposts: anek.reposts.count
  }
};

function searchAneks (searchPhrase, skip = 0, limit) {
  return botApi.database.Anek.find({$text: {$search: searchPhrase}}).limit(limit).skip(skip).exec();
}

function searchAneksElastic (searchPhrase, skip = 0, limit) {
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

      return resolve([]);
    });
  });
}

function performSearch (searchPhrase, skip, limit) {
  if (config.get('mongodb.searchEngine') === 'elastic') {
    return this.searchAneksElastic(searchPhrase, skip, limit);
  }

  return this.searchAneks(searchPhrase, skip, limit);
}

async function getAneksUpdate (skip = 0, limit = 10, aneks = []) {
  const lastDBAnek = await botApi.database.Anek.findOne().sort({date: -1}).exec();
  const lastDBAnekDate = lastDBAnek.date;
  const vkAneks = await botApi.vk.getPosts({offset: skip, count: limit});

  if (vkAneks.response.items[0] && vkAneks.response.items[0].is_pinned) {
    vkAneks.response.items.splice(0, 1);
  }

  if (!vkAneks.response.items.length) {
    if (aneks.length) {
      return botApi.database.Anek.collection.insertMany(aneks)
        .then(() => {
          return aneks;
        })
    }

    return aneks;
  }

  for (let i = 0; i < vkAneks.response.items.length; i++) {
    if (vkAneks.response.items[i].date > lastDBAnekDate) {
      aneks.unshift(processAnek(vkAneks.response.items[i]));
    } else {
      if (aneks.length) {
        return botApi.database.Anek.collection.insertMany(aneks).then(() => {
          return aneks;
        });
      }

      return aneks;
    }
  }

  return getAneksUpdate(skip + limit, limit, aneks);
}

function getLastAneks (count) {
  return botApi.vk.getPosts({offset: 0, count: count})
    .then(function (response) {
      return response.response.items.map(function (anek) {
        return botApi.database.Anek.findOneAndUpdate({post_id: anek.post_id}, {
          likes: anek.likes.count,
          comments: anek.comments,
          reposts: anek.reposts.count
        });
      });
    });
}

function getAllAneks (start) {
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
}

async function redefineDatabase (count) {
  const responses = await this.getAllAneks(count);

  const aneks = responses
    .reduce((acc, response) => acc.concat(response.response.items.reverse()), [])
    .map(anek => {
      anek.post_id = anek.id;
      anek.likes = anek.likes.count;
      anek.reposts = anek.reposts.count;
      delete anek.id;
      return anek;
    });

  if (aneks.length) {
    return botApi.database.Anek.collection.insertMany(aneks)
      .catch(err => {
        console.log(err);

        return [];
      })
      .then(() => aneks);
  }

  return [];
}

function updateAneks () {
  return this.getAllAneks()
    .then(responses => {
      let bulk = botApi.database.Anek.collection.initializeOrderedBulkOp();

      responses.forEach(response => {
        response.response.items.forEach(anek => {
          bulk.find({post_id: anek.post_id}).update({$set: {
            likes: anek.likes.count,
            comments: anek.comments,
            reposts: anek.reposts.count
          }});
        });
      });

      return bulk.execute();
    });
}

function filterAnek (anek) {
  const donate = (anek.text || '').indexOf('#донат') >= 0;
  const ads = anek.marked_as_ads;

  return !donate && !ads;
}

async function broadcastAneks (users, aneks, params) {
  let errorMessages = {};

  if (!users.length || !aneks.length) {
    return [];
  }

  return Promise.all(aneks
    .filter(this.filterAnek)
    .map(anek => botApi.bot.fulfillAll(users.map(user => botApi.bot.sendAnek(user.user_id, anek, params)
      .catch(function (error) {
        if ((!error.ok && (error.error_code === 403)) || (
          error.description === 'Bad Request: chat not found' ||
          error.description === 'Bad Request: group chat was migrated to a supergroup chat' ||
          error.description === 'Bad Request: chat_id is empty')) {
          errorMessages[user.user_id] = true;

          return {};
        }

        return botApi.bot.sendMessageToAdmin('Sending message error: ' + JSON.stringify(error) + JSON.stringify(anek));
      })))))
    .then(() => {
      const usersArray = Object.keys(errorMessages).map(Number);

      if (usersArray.length) {
        let text = usersArray.length + ' message(s) has been sent with errors due to access errors. Unsubscribing them: \n' + usersArray.join(', ');
        let bulk = botApi.database.User.collection.initializeOrderedBulkOp();

        bulk.find({user_id: {$in: usersArray}}).update({$set: {subscribed: false, deleted_subscribe: true}});
        botApi.bot.sendMessageToAdmin(text);

        return bulk.execute();
      }
    });
}

module.exports = {
  searchAneks,
  searchAneksElastic,
  performSearch,
  getAneksUpdate,
  getLastAneks,
  getAllAneks,
  redefineDatabase,
  updateAneks,
  filterAnek,
  broadcastAneks
};
