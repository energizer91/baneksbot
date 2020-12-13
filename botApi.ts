import * as io from "@pm2/io";
import * as cp from 'child_process';
import * as config from 'config';
import * as path from 'path';

import {Application, NextFunction, Request, Response} from 'express';
import {UpdaterMessageActions, UpdaterMessages, UpdaterMessageTypes} from './daemons/types';
import debugFactory from './helpers/debug';
import * as databaseModel from './helpers/mongo';
import {IUser} from './helpers/mongo';
import Bot from './models/bot';
import Statistics from './models/statistics';
import {Update} from './models/telegram';
import User from './models/user';
import Vk from './models/vk';

const debug = debugFactory('baneks-node:api');
const debugError = debugFactory('baneks-node:api:error', true);

export interface IBotRequest extends Request {
  update: Update;
  user: IUser;
  chat: IUser;
  body: Update | void;
  results: any[];
}

const meter = io.meter({
  name: 'req/min'
});

const earlyResponse = (req: IBotRequest, res: Response, next: NextFunction) => {
  meter.mark();
  res.status(200);
  res.send('OK');

  return next();
};

const writeLog = async (data: Update, result: any[], error?: Error) => {
  if (Array.isArray(result)) {
    return databaseModel.Log.insertMany(result.map((log: any) => ({
      date: new Date(),
      error,
      request: data,
      response: log
    })));
  }

  const logRecord = new databaseModel.Log({
    date: new Date(),
    error,
    request: data,
    response: result
  });

  return logRecord.save();
};

const errorMiddleware = (err: Error, req: IBotRequest, res: Response, next: NextFunction) => { // eslint-disable-line
  if (err) {
    return writeLog(req.update, req.results, err)
      .catch(next);
  }
};

const logMiddleware = (req: IBotRequest, res: Response, next: NextFunction) => {
  writeLog(req.update, req.results)
    .catch(next);
};

export const vk = new Vk();
export const bot = new Bot();
export const user = new User();
export const statistics = new Statistics();
export const database = databaseModel;

export const connect = (app: Application) => {
  const middlewares = [
    earlyResponse,
    user.middleware,
    bot.middleware,
    logMiddleware,
    errorMiddleware
  ];

  io.metric({
    name: "Network queue length",
    value: () => bot.queue.totalLength
  });

  app.post(config.get<string>('telegram.endpoint'), middlewares);

  if (config.get<boolean>("vk.useWebhook")) {
    app.post(config.get<string>('vk.endpoint'), vk.middleware);
  }
};

let dbUpdater: cp.ChildProcess = null;

export async function startDaemon() {
  if (process.env.NODE_ENV !== 'production') {
    process.execArgv.push('--inspect=' + (40894));
  }

  dbUpdater = cp.fork(path.join(__dirname, 'daemons/dbUpdater'));

  const text = 'Aneks update process has been started at ' + new Date().toISOString();

  debug(text);
  await bot.sendMessageToAdmin(text);

  dbUpdater.on('close', async (code, signal) => {
    debugError('Aneks update process has been closed with code ' + code + ' and signal ' + signal);
    await bot.sendMessageToAdmin('Aneks update process has been closed with code ' + code + ' and signal ' + signal);

    await startDaemon();
  });

  dbUpdater.on('exited', async (code, signal) => {
    debugError('Aneks update process has been exited with code ' + code + ' and signal ' + signal);
    await bot.sendMessageToAdmin('Aneks update process has been exited with code ' + code + ' and signal ' + signal);
  });

  dbUpdater.on('disconnect', async () => {
    debugError('Aneks update process has been disconnected');
    await bot.sendMessageToAdmin('Aneks update process has been disconnected');
  });

  dbUpdater.on('error', async (error) => {
    debugError('Error in aneks update process', error);
    await bot.sendMessageToAdmin('Error in aneks update process: ' + JSON.stringify(error));
  });

  dbUpdater.on('message', (m: UpdaterMessages) => {
    debug('PARENT got message:', m);

    switch (m.type) {
      case UpdaterMessageTypes.service:
        switch (m.action) {
          case UpdaterMessageActions.message:
            if (!m.text) {
              return;
            }

            return bot.sendMessage(m.value, m.text, m.params);
          case UpdaterMessageActions.ready:
            debug('dbUpdater is ready', m);

            return;
          case UpdaterMessageActions.anek:
            if (!m.anek || !m.userId) {
              return;
            }

            return bot.sendAnek(m.userId, m.anek, m.params);
          default:
            debug('Unknown message');
        }
    }
  });
}

export function sendUpdaterMessage(message: UpdaterMessages) {
  if (!config.get<boolean>("telegram.spawnUpdater")) {
    throw new Error("Updater is not spawned");
  }

  if (!dbUpdater || !dbUpdater.connected) {
    throw new Error('Updater is not connected');
  }

  if (!message || !Object.values(UpdaterMessageTypes).includes(message.type) || !Object.values(UpdaterMessageActions).includes(message.action)) {
    throw new Error('Message is not defined properly');
  }

  dbUpdater.send(message);
}
