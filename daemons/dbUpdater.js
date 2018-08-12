/**
 * Created by Алекс on 27.11.2016.
 */
const CronJob = require('cron').CronJob;
const config = require('config');
const common = require('../helpers/common');
const botApi = require('../botApi');

let updateInProcess = false;
let forceDenyUpdate = false;

function checkUpdateProgress (operation, ignoreUpdateProcess) {
  return new Promise(function (resolve, reject) {
    console.log(new Date(), operation);
    if (updateInProcess && !ignoreUpdateProcess) {
      return reject(new Error('Update is in progress'));
    }
    if (forceDenyUpdate) {
      return reject(new Error('Update is disabled'));
    }
    if (!ignoreUpdateProcess) {
      updateInProcess = true;
    }

    return resolve();
  });
}

function updateAneksTimer () {
  return checkUpdateProgress('Initializing aneks update')
    .then(function () {
      return botApi.database.Anek.count();
    })
    .then(count => common.redefineDatabase(count))
    .then(aneks => {
      if (aneks.length) {
        console.log(new Date(), aneks.length + ' aneks found. Start broadcasting');
      } else {
        console.log(new Date(), aneks.length + ' aneks found.');
      }
      return botApi.database.User.find({subscribed: true})
        .then(users => common.broadcastAneks(users, aneks, {_rule: 'common'}));
    })
    .catch(function (error) {
      console.error(new Date(), 'An error occured: ' + error.message);
    })
    .then(function () {
      console.log(new Date(), 'Updating aneks finished');
      updateInProcess = false;
    });
}

function updateLastAneksTimer () {
  return checkUpdateProgress('Initializing last aneks update')
    .then(function () {
      return common.getLastAneks(100);
    })
    .catch(function (error) {
      console.error(new Date(), 'An error occured: ' + error.message);
    })
    .then(function () {
      console.log(new Date(), 'Updating last aneks finished');
      updateInProcess = false;
    });
}

function refreshAneksTimer () {
  return checkUpdateProgress('Initializing aneks refresh')
    .then(common.updateAneks.bind(common))
    .catch(function (error) {
      console.error(new Date(), 'An error occured: ' + error.message);
    })
    .then(function () {
      console.log(new Date(), 'Refreshing aneks finished');
      updateInProcess = false;
    });
}

function synchronizeDatabase () {
  return checkUpdateProgress('Initializing aneks refresh', true)
    .then(synchronizeWithElastic)
    .then(function (count) {
      console.log(new Date(), 'Successfully indexed', count, 'records');
    })
    .catch(function (error) {
      console.error(new Date(), 'An error occured: ' + error.message);
    })
    .then(function () {
      console.log(new Date(), 'Synchronize database finished');
    });
}

function calculateStatisticsTimer () {
  return checkUpdateProgress('Initializing statistics calculate', true).then(function () {
    return botApi.statistics.calculateStatistics();
  }).catch(function (error) {
    console.error(new Date(), 'An error occured: ' + error.message);
  }).then(function () {
    console.log(new Date(), 'Statistics calculate finished');
  });
}

const updateAneksCron = new CronJob('*/30 * * * * *', updateAneksTimer, null, true);
const updateLastAneksCron = new CronJob('0 0 */1 * * *', updateLastAneksTimer, null, true);
const synchronizeDatabaseCron = new CronJob('0 30 */1 * * *', synchronizeDatabase, null, true);
const refreshAneksCron = new CronJob('0 0 0 */1 * *', refreshAneksTimer, null, true);

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
        console.log('Start database synchronizing');
        synchronizeDatabase();
        break;
      case 'last':
        console.log('Start last aneks update');
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

function synchronizeWithElastic () {
  return new Promise(function (resolve, reject) {
    if (config.get('mongodb.searchEngine') !== 'elastic') {
      console.log('Database synchronizing is only available on elasticsearch engine');
      return;
    }

    let stream;
    let count = 0;

    try {
      stream = botApi.database.Anek.synchronize();
    } catch (err) {
      return reject(err);
    }

    updateInProcess = true;

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
