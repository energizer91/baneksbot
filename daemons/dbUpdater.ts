/**
 * Created by Алекс on 27.11.2016.
 */
import * as config from 'config';
import {CronJob} from 'cron';
import debugFactory from '../helpers/debug';
import {IAnek, IUser} from "../helpers/mongo";
import {UpdaterMessageActions, UpdaterMessages, UpdaterMessageTypes} from './types';

import {bot, database, statistics} from '../botApi';
import * as botApi from "../botApi";
import * as common from '../helpers/common';

const debug = debugFactory('baneks-node:updater');
const error = debugFactory('baneks-node:updater:error', true);

let updateInProcess = false;
let currentUpdate = '';
let forceDenyUpdate = false;

function approveAneksTimer() {
  if (updateInProcess) {
    debug('Conflict: updating ' + currentUpdate + ' and approve aneks');

    return;
  }

  updateInProcess = true;
  currentUpdate = 'approve aneks';

  return database.Approve.find({approveTimeout: {$lte: new Date()}})
    .populate('anek')
    .exec()
    .then((approves) => {
      if (!approves.length) {
        return;
      }

      const readyApproves = approves.filter((approve) => approve.pros.length >= approve.cons.length);

      if (readyApproves.length) {
        debug(approves.length + ' anek(s) approve time expired. ' + readyApproves.length + ' of them approved. Start broadcasting');
      }

      const messages = approves
        .map((approve) => approve.messages)
        .reduce((acc, m) => acc.concat(m), []);

      return bot
        .fulfillAll(messages.map(
          (message) =>
            bot
              .editMessageReplyMarkup(
                message.chat_id,
                message.message_id,
                botApi.bot.prepareInlineKeyboard([])
              )
          )
        )
        .then(() => database.Approve.deleteMany(approves).exec())
        .then(() => database.User.find({subscribed: true}).exec())
        .then((users: IUser[]) =>
          common.broadcastAneks(
            users,
            readyApproves.map((approve) => approve.anek),
            {_rule: 'individual'}
          )
        );
    })
    .catch((err: Error) => {
      error('Update aneks error', err);
    })
    .then(() => {
      updateInProcess = false;
    });
}

function updateAneksTimer() {
  if (updateInProcess) {
    debug('Conflict: updating ' + currentUpdate + ' and update aneks');

    return;
  }

  updateInProcess = true;
  currentUpdate = 'update aneks';

  const needApprove: boolean = config.get('vk.needApprove');

  return common.getAneksUpdate()
    .then((aneks) => aneks.map((anek) => common.processAnek(anek, !needApprove || !common.filterAnek(anek))))
    .then((aneks) => database.Anek.insertMany(aneks))
    .then((aneks) => aneks.filter((anek) => common.filterAnek(anek)))
    .then((aneks: IAnek[]) => {
      if (needApprove) {
        return database.User.find({approver: true}).exec()
          .then((users: IUser[]) => aneks.map((anek) => {
            const result = new database.Approve({anek});

            const results = users
              .map((user) =>
                bot.sendAnek(user.user_id, anek, {
                  reply_markup: botApi.bot.prepareReplyMarkup(botApi.bot.prepareApproveInlineKeyboard(result.id, anek, user))
                })
              );

            return bot
              .fulfillAll(results)
              .then((messages) => {
                result.messages = messages.map((message) => ({
                  chat_id: message.chat.id,
                  message_id: message.message_id
                }));

                return result;
              });
            }))
          .then((messages) => bot.fulfillAll(messages))
          .then((approves) => {
            database.Approve.insertMany(approves);
          });
      }

      debug(aneks.length + ' anek(s) found. Start broadcasting.');

      return database.User.find({subscribed: true}).exec()
        .then((users: IUser[]) => common.broadcastAneks(users, aneks, {_rule: 'individual'}));
    })
    .catch((err: Error) => {
      error('Update aneks error', err);
    })
    .then(() => {
      updateInProcess = false;
    });
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

function refreshAneksTimer() {
  if (updateInProcess) {
    debug('Conflict: updating ' + currentUpdate + ' and refresh aneks');

    return;
  }

  updateInProcess = true;
  currentUpdate = 'refresh aneks';

  return common.updateAneks()
    .catch((err: Error) => {
      error('Aneks refresh', err);
    })
    .then(() => {
      updateInProcess = false;
    });
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
const approveAneksCron = new CronJob('25 * * * * *', approveAneksTimer, null, true);
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
