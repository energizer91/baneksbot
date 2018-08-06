const EventEmitter = require('events');

class Bot extends EventEmitter {
  constructor (database) {
    super();

    this.database = database;
    this.middleware = this.middleware.bind(this);
  }

  onCommand (command, callback) {
    return this.on('command:' + command, callback);
  }

  getUserInfo (user) {
    if (!user.user_id) {
      return 'Invalid user';
    }

    if (user.username) {
      return '@' + user.username;
    }

    if (user.first_name && user.last_name) {
      return user.first_name + ' ' + user.last_name + ' (' + user.user_id + ')';
    } else if (user.first_name) {
      return user.first_name + ' (' + user.user_id + ')';
    } else if (user.last_name) {
      return user.last_name + ' (' + user.user_id + ')';
    }

    return user.user_id;
  }

  performInlineQuery (inlineQuery, user) {
    console.log('Performing inline query from ' + this.getUserInfo(user));
    this.emit('inlineQuery', inlineQuery, user);
  }

  performCallbackQuery (callbackQuery, user) {
    console.log('Performing callback query from ' + this.getUserInfo(user));
    this.emit('callbackQuery', callbackQuery, user);
  }

  performMessage (message, user) {
    console.log('Performing message from ' + this.getUserInfo(user));
    this.emit('message', message, user);
  }

  performCommand (command, message, user) {
    console.log('Performing command from ' + this.getUserInfo(user));
    this.emit('command:' + command[0].slice(1), command, message, user);
  }

  performPreCheckoutQuery (preCheckoutQuery, user) {
    console.log('Performing pre checkout query from ' + this.getUserInfo(user));
    this.emit('preCheckoutQuery', preCheckoutQuery, user);
  }

  middleware (req, res, next) {
    const { update, user } = req;

    if (!update) {
      return next(new Error('No webhook data specified'));
    }

    if (update.message) {
      const { text } = update.message;

      if (text && text.startsWith('/')) {
        const command = text.split(' ');

        this.performCommand(command, update.message, user);
      } else {
        this.performMessage(update.message, user);
      }
    }

    if (update.inline_query) {
      this.performInlineQuery(update.inline_query, user);
    }

    if (update.callback_query) {
      this.performCallbackQuery(update.callback_query, user);
    }

    if (update.pre_checkout_query) {
      this.performPreCheckoutQuery(update.pre_checkout_query, user);
    }
  }
}

module.exports = Bot;
