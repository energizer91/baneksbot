/**
 * Created by Алекс on 27.11.2016.
 */
import * as config from 'config';
import {CronJob} from 'cron';
import * as debugFactory from 'debug';
import {IAnek, IAnekModel, IUser} from "../helpers/mongo";
import {Anek} from "../models/vk";
import {UpdaterMessageTypes} from './types';

import {database, statistics} from '../botApi';
import common from '../helpers/common';

const debug = debugFactory('baneks-node:updater');
const error = debugFactory('baneks-node:updater:error');

let updateInProcess = false;
let currentUpdate = '';
let forceDenyUpdate = false;

function updateAneksTimer() {
  if (updateInProcess) {
    debug('Conflict: updating ' + currentUpdate + ' and update aneks');

    return;
  }

  updateInProcess = true;
  currentUpdate = 'update aneks';

  return common.getAneksUpdate()
    .then((aneks: Anek[]) => {
      if (aneks.length) {
        debug(aneks.length + ' anek(s) found. Start broadcasting');

        return database.User.find({subscribed: true}).exec()
          .then((users: IUser[]) => common.broadcastAneks(users, aneks, {_rule: 'individual'}));
      }
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
const calculateStetisticsCron = new CronJob('0 */5 * * * *', calculateStatisticsTimer, null, true); // tslint-disable-line no-unused-expression

process.on('message', (m: UpdaterMessageTypes) => {
  debug('CHILD got message:', m);

  if (m.type === 'service') {
    switch (m.action) {
      case 'update':
        debug('Switch automatic updates to', m.value);
        forceDenyUpdate = !m.value;

        if (forceDenyUpdate) {
          updateAneksCron.stop();
          updateLastAneksCron.stop();
          refreshAneksCron.stop();
          synchronizeDatabaseCron.stop();
        } else {
          updateAneksCron.start();
          updateLastAneksCron.start();
          refreshAneksCron.start();
          synchronizeDatabaseCron.start();
        }
        break;
      case 'synchronize':
        return synchronizeDatabase();
      case 'last':
        return updateLastAneksTimer();
      case 'message':
        process.send({type: 'service', action: 'message', value: m.value, text: m.text || 'Проверка'});

        break;
      case 'anek':
        return database.Anek.random().then((anek: IAnek) => {
          process.send({
            message: anek.text,
            params: {language: m.value.language},
            type: 'message',
            userId: m.value.user_id
          });
        });
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

process.send({message: 'ready'});
