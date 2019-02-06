/**
 * Created by Алекс on 27.11.2016.
 */
import * as config from 'config';
import {CronJob} from 'cron';
import * as debugFactory from 'debug';
import {UpdaterMessageTypes} from './types';

const common = require('../helpers/common');
const botApi = require('../botApi');

const debug = debugFactory('baneks-node:updater');
const error = debugFactory('baneks-node:updater:error');

let updateInProcess = false;
let currentUpdate = '';
let forceDenyUpdate = false;

function updateAneksTimer () {
  if (updateInProcess) {
    debug('Conflict: updating ' + currentUpdate + ' and update aneks');

    return;
  }

  updateInProcess = true;
  currentUpdate = 'update aneks';

  return common.getAneksUpdate()
    .then(aneks => {
      if (aneks.length) {
        debug(aneks.length + ' anek(s) found. Start broadcasting');

        return botApi.database.User.find({subscribed: true}).exec()
          .then(users => common.broadcastAneks(users, aneks, {_rule: 'individual'}));
      }
    })
    .catch(err => {
      error('Update aneks error', err);
    })
    .then(() => {
      updateInProcess = false;
    });
}

function updateLastAneksTimer () {
  if (updateInProcess) {
    debug('Conflict: updating ' + currentUpdate + ' and update last anek');

    return;
  }

  updateInProcess = true;
  currentUpdate = 'update last anek';

  return common.getLastAneks(100)
    .catch(err => {
      error('Last aneks error', err);
    })
    .then(() => {
      updateInProcess = false;
    });
}

function refreshAneksTimer () {
  if (updateInProcess) {
    debug('Conflict: updating ' + currentUpdate + ' and refresh aneks');

    return;
  }

  updateInProcess = true;
  currentUpdate = 'refresh aneks';

  return common.updateAneks()
    .catch(err => {
      error('Aneks refresh', err);
    })
    .then(() => {
      updateInProcess = false;
    });
}

function synchronizeDatabase () {
  return synchronizeWithElastic()
    .catch(err => {
      error('Database synchronize error', err);
    });
}

function calculateStatisticsTimer () {
  return botApi.statistics.calculateStatistics()
    .catch(err => {
      error('Statistics calculate error', err);
    });
}

const updateAneksCron = new CronJob('*/30 * * * * *', updateAneksTimer, null, true);
const updateLastAneksCron = new CronJob('10 0 */1 * * *', updateLastAneksTimer, null, true);
const synchronizeDatabaseCron = new CronJob('0 30 */1 * * *', synchronizeDatabase, null, true);
const refreshAneksCron = new CronJob('20 0 0 */1 * *', refreshAneksTimer, null, true);

new CronJob('0 */5 * * * *', calculateStatisticsTimer, null, true); // eslint-disable-line

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
        return botApi.database.Anek.random().then(anek => {
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

  return new Promise(function (resolve, reject) {
    let stream;
    let count = 0;

    try {
      stream = botApi.database.Anek.synchronize();
    } catch (err) {
      return reject(err);
    }

    stream.on('data', function () {
      count++;
    });
    stream.on('close', function () {
      return resolve(count);
    });
    stream.on('error', function (err) {
      return reject(err);
    });
  });
}

process.send({message: 'ready'});
