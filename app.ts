import * as bodyParser from 'body-parser';
import * as config from 'config';
import * as cookieParser from 'cookie-parser';
import * as debugFactory from 'debug';
import * as express from 'express';
import * as path from 'path';
import * as botApi from './botApi';

const debugError = debugFactory('baneks-node:app:error');

const app = express();

interface NetworkError extends Error {
  status?: number;
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'bundle'))); // eslint-disable-line

botApi.connect(app);

require('./helpers/commands'); // tslint:disable-line

if (config.get('telegram.daemonEnabled')) {
  botApi.updater.connect();
}

// catch 404 and forward to error handler
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const err: NetworkError = new Error('Not Found');

  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use((err: NetworkError, req: express.Request, res: express.Response, next: express.NextFunction) => {
    debugError(err, err.stack);
    res.status(err.status || 500);
    res.json(err);
  });
}

// production error handler
// no stacktraces leaked to user
app.use((err: NetworkError, req: express.Request, res: express.Response, next: express.NextFunction) => {
  debugError(err, err.stack);
  res.status(err.status || 500);
  res.json(err);
});

export default app;
