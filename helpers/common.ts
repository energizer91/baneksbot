/**
 * Created by energizer on 30.06.17.
 */

import * as config from 'config';
import * as botApi from '../botApi';
import {MessageParams, TelegramError} from '../models/telegram';
import {Anek} from '../models/vk';
import {IAnek, IUser} from './mongo';

const processAnek = (anek: Anek): IAnek => {
  const {id, ...rest} = anek;

  return {
    ...rest,
    likes: anek.likes.count,
    post_id: anek.id,
    reposts: anek.reposts.count
  };
};

export function searchAneks(searchPhrase: string, skip: number = 0, limit: number) {
  return botApi.database.Anek.find({$text: {$search: searchPhrase}}).limit(limit).skip(skip).exec();
}

export function searchAneksElastic(searchPhrase: string, skip: number = 0, limit: number) {
  return new Promise((resolve, reject) => {
    return botApi.database.Anek.esSearch({
      from: skip,
      query: {
        match: {
          text: searchPhrase
        }
      },
      size: limit
    }, {
      highlight: {
        fields: {
          text: {}
        },
        post_tags: ['*'],
        pre_tags: ['*']
      }
    }, (err: Error, results) => {
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

export function performSearch(searchPhrase: string, skip: number, limit: number) {
  if (config.get('mongodb.searchEngine') === 'elastic') {
    return this.searchAneksElastic(searchPhrase, skip, limit);
  }

  return this.searchAneks(searchPhrase, skip, limit);
}

export async function getAneksUpdate(skip: number = 0, limit: number = 100, aneks: Anek[] = []) {
  const lastDBAnek = await botApi.database.Anek.findOne().sort({date: -1}).exec();
  const lastDBAnekDate = lastDBAnek.date;
  const vkAneks = await botApi.vk.getPosts(skip, limit);

  if (vkAneks.items[0] && vkAneks.items[0].is_pinned) {
    vkAneks.items.splice(0, 1);
  }

  if (!vkAneks.items.length) {
    if (aneks.length) {
      return botApi.database.Anek.collection.insertMany(aneks)
        .then(() => {
          return aneks;
        });
    }

    return aneks;
  }

  for (const vkAnek of vkAneks.items) {
    if (vkAnek.date > lastDBAnekDate) {
      aneks.unshift(processAnek(vkAnek));
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

export function getLastAneks(count: number) {
  return botApi.vk.getPosts(0, count)
    .then((response) => {
      return response.items.map((anek) => {
        return botApi.database.Anek.findOneAndUpdate({post_id: anek.post_id}, {
          comments: anek.comments,
          likes: anek.likes.count,
          reposts: anek.reposts.count
        });
      });
    });
}

export function getAllAneks(start: number) {
  return botApi.vk.getPostsCount().then((counter) => {
    const requests = [];
    let current = counter.count - (start || 0);
    const goal = counter.hasPinned ? 1 : 0;
    let step = 100;

    while (current > goal) {
      if (current - step < goal) {
        step = current - goal;
      }

      current -= step;

      requests.push(botApi.vk.getPosts(current, step));
    }

    return botApi.bot.fulfillAll(requests);
  });
}

export async function redefineDatabase(count: number) {
  const responses = await this.getAllAneks(count);

  const aneks = responses
    .reduce((acc, response) => acc.concat(response.items.reverse()), [])
    .map((anek: Anek): IAnek => {
      anek.post_id = anek.id;
      anek.likes = anek.likes.count;
      anek.reposts = anek.reposts.count;
      delete anek.id;
      return anek;
    });

  if (aneks.length) {
    return botApi.database.Anek.collection.insertMany(aneks)
      .catch((): [] => [])
      .then(() => aneks);
  }

  return [];
}

export function updateAneks() {
  return this.getAllAneks()
    .then((responses) => {
      const bulk = botApi.database.Anek.collection.initializeOrderedBulkOp();

      responses.forEach((response) => {
        response.items.forEach((anek) => {
          bulk.find({post_id: anek.post_id}).update({$set: {
            comments: anek.comments,
            likes: anek.likes.count,
            reposts: anek.reposts.count
          }});
        });
      });

      return bulk.execute();
    });
}

export function filterAnek(anek: Anek) {
  const donate = (anek.text || '').indexOf('#донат') >= 0;
  const ads = anek.marked_as_ads;

  return !donate && !ads;
}

export async function broadcastAneks(users: IUser[], aneks: IAnek[], params: MessageParams) {
  const errorMessages: {[key: string]: boolean} = {};

  if (!users.length || !aneks.length) {
    return [];
  }

  return Promise.all(aneks
    .filter(this.filterAnek)
    .map((anek) => botApi.bot.fulfillAll(users.map((user) => botApi.bot.sendAnek(user.user_id, anek, {...params, forceAttachments: user.force_attachments})
      .catch((error: TelegramError) => {
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
        const text = usersArray.length + ' message(s) has been sent with errors due to access errors. Unsubscribing them: \n' + usersArray.join(', ');
        const bulk = botApi.database.User.collection.initializeOrderedBulkOp();

        bulk.find({user_id: {$in: usersArray}}).update({$set: {subscribed: false, deleted_subscribe: true}});
        botApi.bot.sendMessageToAdmin(text);

        return bulk.execute();
      }
    });
}

export default {
  broadcastAneks,
  filterAnek,
  getAllAneks,
  getAneksUpdate,
  getLastAneks,
  performSearch,
  redefineDatabase,
  searchAneks,
  searchAneksElastic,
  updateAneks
};
