/**
 * Created by Алекс on 27.11.2016.
 */
import * as config from 'config';
import {CronJob} from 'cron';
import debugFactory from '../helpers/debug';
import {IAnek} from "../helpers/mongo";
import {UpdaterMessageActions, UpdaterMessages, UpdaterMessageTypes} from './types';

import {bot, database, statistics} from '../botApi';
import * as common from '../helpers/common';

const debug = debugFactory('baneks-node:updater');
const error = debugFactory('baneks-node:updater:error', true);

let updateInProcess = false;
let currentUpdate = '';
let forceDenyUpdate = false;

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

  await database.Approve.deleteMany(approves).exec();

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
  const filteredAneks = aneks.map((anek) => common.processAnek(anek, !needApprove || !common.filterAnek(anek)));
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

function createUpdateFunction(fn: () => Promise<any>): () => void {
  const name = fn.name || "Unknown function";

  return () => {
    if (updateInProcess) {
      error(`Conflict: updating "${currentUpdate}" and "${name}"`);

      return;
    }

    updateInProcess = true;
    currentUpdate = name;

    debug(`Starting update function "${name}"`);

    fn()
      .catch((err) => {
        error(`Executing update function "${name}" error`, err);

        return;
      })
      .then(() => {
        updateInProcess = false;
        debug(`Finishing update function "${name}"`);
      });
  };
}

const updateAneksCron = new CronJob('*/30 * * * * *', createUpdateFunction(updateAneksTimer), null, true);
const updateLastAneksCron = new CronJob('10 0 */1 * * *', createUpdateFunction(updateLastAneksTimer), null, true);
const synchronizeDatabaseCron = new CronJob('0 30 */1 * * *', synchronizeDatabase, null, true);
const refreshAneksCron = new CronJob('20 0 0 */1 * *', createUpdateFunction(refreshAneksTimer), null, true);
const approveAneksCron = new CronJob('25 * * * * *', createUpdateFunction(approveAneksTimer), null, true);
const calculateStatisticsCron = new CronJob('0 */5 * * * *', calculateStatisticsTimer, null, true);

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
              updateAneksCron.stop();
              updateLastAneksCron.stop();
              refreshAneksCron.stop();
              synchronizeDatabaseCron.stop();
              approveAneksCron.stop();
            } else {
              updateAneksCron.start();
              updateLastAneksCron.start();
              refreshAneksCron.start();
              synchronizeDatabaseCron.start();
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
