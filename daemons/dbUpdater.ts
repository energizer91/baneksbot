/**
 * Created by Алекс on 27.11.2016.
 */
import * as config from 'config';
import {CronJob} from 'cron';
import debugFactory from '../helpers/debug';
import {IAnek} from "../helpers/mongo";
import SmartQueue from "../models/queue";
import {Anek} from "../models/vk";
import {UpdaterMessageActions, UpdaterMessages, UpdaterMessageTypes} from './types';

import {bot, database, statistics, vk} from '../botApi';
import * as common from '../helpers/common';

const debug = debugFactory('baneks-node:updater');
const error = debugFactory('baneks-node:updater:error', true);

let forceDenyUpdate = false;

const cronQueue = new SmartQueue({
  default: {
    key: "cron",
    rule: "cron"
  },
  rules: {
    cron: {
      limit: 1,
      priority: 1,
      rate: 1000
    }
  }
});

async function synchronizeWithElastic() {
  if (config.get('mongodb.searchEngine') !== 'elastic') {
    debug('Database synchronizing is only available on elasticsearch engine');
    return;
  }

  return new Promise((resolve, reject) => {
    let stream;
    let count = 0;

    try {
      stream = database.Anek.synchronize();
    } catch (err) {
      return reject(err);
    }

    stream.on('data', () => {
      count++;
    });
    stream.on('close', () => {
      return resolve(count);
    });
    stream.on('error', (err: Error) => {
      return reject(err);
    });
  });
}

async function performAnek(post: Anek) {
  const needApprove = config.get<boolean>('vk.needApprove');
  const anek = common.processAnek(post);

  // @ts-ignore
  if (!common.filterAnek(anek)) {
    return;
  }

  const dbAnek = new database.Anek(anek);

  await dbAnek.save();

  if (needApprove) {
    const approvedUsers = await database.User.find({approver: true}).exec();
    const approve = new database.Approve({dbAnek});
    const approveMessages = await bot.sendApproveAneks(approvedUsers, dbAnek, approve.id);

    approve.messages = approveMessages.map((m) => ({
      chat_id: m.chat.id,
      message_id: m.message_id
    }));

    await approve.save();
  }

  const users = await database.User.find({subscribed: true}).exec();

  return common.broadcastAneks(users, [dbAnek], {_rule: 'individual'});
}

async function approveAneksTimer() {
  const approves = await database.Approve.find({approveTimeout: {$lte: new Date()}})
    .populate('anek')
    .exec();

  if (!approves.length) {
    return;
  }

  const messages = approves
    .map((approve) => approve.messages)
    .reduce((acc, m) => acc.concat(m), []);

  await bot.fulfillAll(messages.map((message) => bot
    .editMessageReplyMarkup(
      message.chat_id,
      message.message_id,
      bot.prepareInlineKeyboard([])
    )));

  const ids = approves.map((a) => a.id);

  await database.Approve.deleteMany({
    _id: {$in: ids}
  }).exec();

  const readyApproves = approves
    .filter((approve) => approve.pros >= approve.cons)
    .map((approve) => approve.anek);

  if (readyApproves.length) {
    debug(approves.length + ' anek(s) approve time expired. ' + readyApproves.length + ' of them approved. Start broadcasting');
  }

  const users = await database.User.find({subscribed: true}).exec();

  return common.broadcastAneks(users, readyApproves, {_rule: 'individual'});
}

async function updateAneksTimer() {
  const needApprove: boolean = config.get('vk.needApprove');
  const aneks = await common.getAneksUpdate();

  const filteredAneks = aneks
    .map(common.processAnek)
    .filter(common.filterAnek);

  const dbAneks = await database.Anek.insertMany(filteredAneks);

  debug(`Found ${aneks.length} new aneks`);

  if (!aneks.length) {
    return;
  }

  if (needApprove) {
    const approvedUsers = await database.User.find({approver: true}).exec();
    const approves = dbAneks
      .map((anek) => {
        const result = new database.Approve({anek});

        return bot.sendApproveAneks(approvedUsers, anek, result.id)
          .then((messages) => {
            result.messages = messages.map((m) => ({
              chat_id: m.chat.id,
              message_id: m.message_id
            }));

            return result;
          });
      })
      .reduce((acc, r) => acc.concat(r), []);

    const results = await bot.fulfillAll(approves);

    return database.Approve.insertMany(results);
  }

  const users = await database.User.find({subscribed: true}).exec();

  return common.broadcastAneks(users, dbAneks, {_rule: 'individual'});
}

async function updateLastAneksTimer() {
  return common.getLastAneks();
}

async function refreshAneksTimer() {
  return common.updateAneks();
}

async function synchronizeDatabase() {
  try {
    await synchronizeWithElastic();
  } catch (err) {
    error('Database synchronize error', err);
  }
}

async function calculateStatisticsTimer() {
  try {
    await statistics.calculateStatistics();
  } catch (err) {
    error('Statistics calculate error', err);
  }
}

async function sendScheduledAneks() {
  const now = new Date().getHours();
  const users = await database.User.find({
    scheduleCount: {
      $gt: 0
    },
    scheduleTimes: {
      $in: [now]
    }
  });

  if (!users.length) {
    return;
  }

  const aneks = await database.Anek
    .find({})
    .where({date: {$gte: Math.floor(new Date().getTime() / 1000) - 24 * 60 * 60}})
    .sort({likes: -1})
    .limit(3)
    .exec();

  const messages = users
    .map((user) => (bot.sendAneks(user.user_id, aneks.slice(0, user.scheduleCount))));

  bot.fulfillAll(messages);
}

function createUpdateFunction(fn: () => Promise<any>): () => void {
  const name = fn.name || "Unknown function";

  return () => {
    debug(`Starting update function "${name}"`);

    cronQueue.request(fn)
      .catch((err) => {
        error(`Executing update function "${name}" error`, err);
      })
      .then(() => {
        debug(`Finishing update function "${name}"`);
      });
  };
}

const useVkWebhook = config.get<boolean>("vk.useWebhook");

const updateAneksCron = new CronJob('*/30 * * * * *', createUpdateFunction(updateAneksTimer), null, !useVkWebhook);
const updateLastAneksCron = new CronJob('10 0 */1 * * *', createUpdateFunction(updateLastAneksTimer), null, true);
const synchronizeDatabaseCron = new CronJob('0 30 */1 * * *', synchronizeDatabase, null, true);
const scheduleAneksCron = new CronJob('0 0 */1 * * *', createUpdateFunction(sendScheduledAneks), null, true);
const refreshAneksCron = new CronJob('20 0 0 */1 * *', createUpdateFunction(refreshAneksTimer), null, true);
const approveAneksCron = new CronJob('25 * * * * *', createUpdateFunction(approveAneksTimer), null, true);
const calculateStatisticsCron = new CronJob('0 */5 * * * *', calculateStatisticsTimer, null, true);

if (useVkWebhook) {
  vk.on("anek", performAnek);
}

if (!config.get("telegram.spawnUpdater")) {
  process.on('message', (m: UpdaterMessages) => {
    debug('CHILD got message:', m);

    switch (m.type) {
      case UpdaterMessageTypes.service:
        switch (m.action) {
          case UpdaterMessageActions.update:
            debug('Switch automatic updates to', m.value);
            forceDenyUpdate = !m.value;

            if (forceDenyUpdate) {
              if (!useVkWebhook) {
                updateAneksCron.stop();
              }
              updateLastAneksCron.stop();
              refreshAneksCron.stop();
              synchronizeDatabaseCron.stop();
              synchronizeDatabaseCron.stop();
              scheduleAneksCron.stop();
              approveAneksCron.stop();
            } else {
              if (!useVkWebhook) {
                updateAneksCron.start();
              }
              updateLastAneksCron.start();
              refreshAneksCron.start();
              synchronizeDatabaseCron.start();
              scheduleAneksCron.start();
              approveAneksCron.start();
            }
            break;
          case UpdaterMessageActions.synchronize:
            return synchronizeDatabase();
          case UpdaterMessageActions.last:
            return updateLastAneksTimer();
          case UpdaterMessageActions.message:
            return bot.sendMessage(m.value, m.text || 'Проверка');
          case UpdaterMessageActions.anek:
            return database.Anek.random().then((anek: IAnek) => bot.sendAnek(m.userId, anek, {language: m.params.language}));
          case UpdaterMessageActions.statistics:
            debug('Switch statistics update to', m.value);
            forceDenyUpdate = !m.value;

            if (forceDenyUpdate) {
              calculateStatisticsCron.stop();
            } else {
              calculateStatisticsCron.start();
            }
            break;
          default:
            debug('Unknown service command');
            break;
        }
    }
  });

  process.send({type: UpdaterMessageTypes.service, action: UpdaterMessageActions.ready});
}
