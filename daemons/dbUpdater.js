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
  console.log(new Date(), operation);

  if (updateInProcess && !ignoreUpdateProcess) {
    throw new Error('Update is in progress');
  }

  if (forceDenyUpdate) {
    throw new Error('Update is disabled');
  }

  if (!ignoreUpdateProcess) {
    updateInProcess = true;
  }

  return true;
}

async function updateAneksTimer () {
  try {
    checkUpdateProgress('Initializing aneks update');

    const count = await botApi.database.Anek.count();
    const aneks = await common.redefineDatabase(count);

    if (aneks.length) {
      console.log(new Date(), aneks.length + ' aneks found. Start broadcasting');

      const users = await botApi.database.User.find({subscribed: true});

      await common.broadcastAneks(users, aneks, {_rule: 'common'});
    } else {
      console.log(new Date(), aneks.length + ' aneks found.');
    }
    updateInProcess = false;
  } catch (error) {
    console.error(new Date(), 'An error occured: ' + error.message);
  } finally {
    console.log(new Date(), 'Updating aneks finished');
  }
}

async function updateLastAneksTimer () {
  try {
    checkUpdateProgress('Initializing last aneks update');

    await common.getLastAneks(100);
    updateInProcess = false;
  } catch (error) {
    console.error(new Date(), 'An error occured: ' + error.message);
  } finally {
    console.log(new Date(), 'Updating last aneks finished');
  }
}

async function refreshAneksTimer () {
  try {
    checkUpdateProgress('Initializing aneks refresh');

    await common.updateAneks();
    updateInProcess = false;
  } catch (error) {
    console.error(new Date(), 'An error occured: ' + error.message);
  } finally {
    console.log(new Date(), 'Refreshing aneks finished');
  }
}

async function synchronizeDatabase () {
  try {
    checkUpdateProgress('Initializing aneks refresh', true);

    const count = await synchronizeWithElastic();

    console.log(new Date(), 'Successfully indexed', count, 'records');
  } catch (error) {
    console.error(new Date(), 'An error occured: ' + error.message);
  } finally {
    console.log(new Date(), 'Synchronize database finished');
  }
}

async function calculateStatisticsTimer () {
  try {
    checkUpdateProgress('Initializing statistics calculate', true);

    await botApi.statistics.calculateStatistics();
  } catch (error) {
    console.error(new Date(), 'An error occured: ' + error.message);
  } finally {
    console.log(new Date(), 'Statistics calculate finished');
  }
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
