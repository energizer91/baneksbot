/**
 * Created by Алекс on 27.11.2016.
 */
const CronJob = require('cron').CronJob;
const config = require('config');
const common = require('../helpers/common');
const botApi = require('../botApi');

let updateInProcess = false;
let currentUpdate = '';
let forceDenyUpdate = false;

function updateAneksTimer () {
  if (updateInProcess) {
    console.log(new Date(), 'Conflict: updating ' + currentUpdate + ' and update aneks');

    return;
  }

  updateInProcess = true;
  currentUpdate = 'update aneks';

  return common.getAneksUpdate()
    .then(aneks => {
      if (aneks.length) {
        console.log(new Date(), aneks.length + ' anek(s) found. Start broadcasting');

        return botApi.database.User.find({subscribed: true}).exec()
          .then(users => common.broadcastAneks(users, aneks, {_rule: 'individual'}));
      }
    })
    .catch((error) => {
      console.error(new Date(), 'Update aneks error', error);
    })
    .then(() => {
      updateInProcess = false;
    });
}

function updateLastAneksTimer () {
  if (updateInProcess) {
    console.log(new Date(), 'Conflict: updating ' + currentUpdate + ' and update last anek');

    return;
  }

  updateInProcess = true;
  currentUpdate = 'update last anek';

  return common.getLastAneks(100)
    .catch((error) => {
      console.error(new Date(), 'Last aneks error', error);
    })
    .then(() => {
      updateInProcess = false;
    });
}

function refreshAneksTimer () {
  if (updateInProcess) {
    console.log(new Date(), 'Conflict: updating ' + currentUpdate + ' and refresh aneks');

    return;
  }

  updateInProcess = true;
  currentUpdate = 'refresh aneks';

  return common.updateAneks()
    .catch((error) => {
      console.error(new Date(), 'Aneks refresh', error);
    })
    .then(() => {
      updateInProcess = false;
    });
}

function synchronizeDatabase () {
  return synchronizeWithElastic()
    .catch((error) => {
      console.error(new Date(), 'Database synchronize error', error);
    });
}

function calculateStatisticsTimer () {
  return botApi.statistics.calculateStatistics()
    .catch((error) => {
      console.error(new Date(), 'Statistics calculate error', error);
    });
}

const updateAneksCron = new CronJob('*/30 * * * * *', updateAneksTimer, null, true);
const updateLastAneksCron = new CronJob('10 0 */1 * * *', updateLastAneksTimer, null, true);
const synchronizeDatabaseCron = new CronJob('0 30 */1 * * *', synchronizeDatabase, null, true);
const refreshAneksCron = new CronJob('20 0 0 */1 * *', refreshAneksTimer, null, true);

new CronJob('0 */5 * * * *', calculateStatisticsTimer, null, true); // eslint-disable-line

process.on('message', function (m) {
  console.log('CHILD got message:', m);
  if (m.type === 'service') {
    switch (m.action) {
      case 'update':
        console.log('Switch automatic updates to', m.value);
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
        synchronizeDatabase();
        break;
      case 'last':
        updateLastAneksTimer();
        break;
      case 'message':
        process.send({type: 'message', userId: m.value, message: m.text || 'Проверка'});
        break;
      case 'anek':
        return botApi.database.Anek.random().then(function (anek) {
          process.send({
            type: 'message',
            userId: m.value.user_id,
            message: anek.text,
            params: {language: m.value.language}
          });
        });
      default:
        console.log('Unknown service command');
        break;
    }
  }
});

async function synchronizeWithElastic () {
  if (config.get('mongodb.searchEngine') !== 'elastic') {
    console.log('Database synchronizing is only available on elasticsearch engine');
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
