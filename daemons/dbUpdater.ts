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

async function updateAneksTimer() {
  if (updateInProcess) {
    debug('Conflict: updating ' + currentUpdate + ' and update aneks');

    return;
  }

  updateInProcess = true;
  currentUpdate = 'update aneks';

  const needApprove: boolean = config.get('vk.needApprove');

  try {
    const aneks = await common.getAneksUpdate();
    const filteredAneks = aneks.map((anek) => common.processAnek(anek, !needApprove || !common.filterAnek(anek)));
    const dbAneks = await database.Anek.insertMany(filteredAneks);

    if (needApprove) {
      const approvedUsers = await database.User.find({approver: true}).exec();
      const approves = await bot.fulfillAll(dbAneks.map(async (anek) => {
        const result = new database.Approve({anek});
        const message = await bot.sendAnek(config.get("telegram.editorialChannel"), anek);
        const poll = await bot.sendApprovePoll(config.get("telegram.editorialChannel"), message, {
          open_period: config.get("telegram.approveTimeout")
        });

        result.poll = poll.message_id;

        try {
          await approvedUsers.map((user) => {
            bot.forwardMessage(user.user_id, poll.message_id, poll.from.id);
            bot.forwardMessage(user.user_id, message.message_id, message.from.id);
          });
        } catch (e) {
          error("Unable to forward poll", e);
        }

        return result;
      }));

      await database.Approve.insertMany(approves);
    }

    const users = await database.User.find({subscribed: true}).exec();

    await common.broadcastAneks(users, dbAneks, {_rule: 'individual'});
  } catch (err) {
    error('Update aneks error', err);
  } finally {
    updateInProcess = false;
  }
}

function updateLastAneksTimer() {
  if (updateInProcess) {
    debug('Conflict: updating ' + currentUpdate + ' and update last anek');

    return;
  }

  updateInProcess = true;
  currentUpdate = 'update last anek';

  return common.getLastAneks(100)
    .catch((err: Error) => {
      error('Last aneks error', err);
    })
    .then(() => {
      updateInProcess = false;
    });
}

async function refreshAneksTimer() {
  if (updateInProcess) {
    debug('Conflict: updating ' + currentUpdate + ' and refresh aneks');

    return;
  }

  updateInProcess = true;
  currentUpdate = 'refresh aneks';

  try {
    await common.updateAneks();
  } catch (err) {
    error('Aneks refresh', err);
  } finally {
    updateInProcess = false;
  }
}

function synchronizeDatabase() {
  return synchronizeWithElastic()
    .catch((err: Error) => {
      error('Database synchronize error', err);
    });
}

function calculateStatisticsTimer() {
  return statistics.calculateStatistics()
    .catch((err: Error) => {
      error('Statistics calculate error', err);
    });
}

const updateAneksCron = new CronJob('*/30 * * * * *', updateAneksTimer, null, true);
const updateLastAneksCron = new CronJob('10 0 */1 * * *', updateLastAneksTimer, null, true);
const synchronizeDatabaseCron = new CronJob('0 30 */1 * * *', synchronizeDatabase, null, true);
const refreshAneksCron = new CronJob('20 0 0 */1 * *', refreshAneksTimer, null, true);
// const approveAneksCron = new CronJob('25 * * * * *', approveAneksTimer, null, true);
const calculateStatisticsCron = new CronJob('0 */5 * * * *', calculateStatisticsTimer, null, true);

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
            // approveAneksCron.stop();
          } else {
            updateAneksCron.start();
            updateLastAneksCron.start();
            refreshAneksCron.start();
            synchronizeDatabaseCron.start();
            // approveAneksCron.start();
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

process.send({type: UpdaterMessageTypes.service, action: UpdaterMessageActions.ready});
