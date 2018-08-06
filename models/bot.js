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

  performSuccessfulPayment (successfulPayment, user) {
    console.log('Performing successful payment from ' + this.getUserInfo(user));
    this.emit('successfulPayment', successfulPayment, user);
  }

  performNewChatMember (member, user) {
    this.emit('newChatMember', member, user);
  }

  performLeftChatMember (member, user) {
    this.emit('leftChatMember', member, user);
  }

  performSuggest (suggest, user) {
    this.emit('suggest', suggest, user);
  }

  performReply (reply, message, user) {
    this.emit('reply', reply, message, user);
  }

  middleware (req, res, next) {
    const { update, user } = req;

    if (!update) {
      return next(new Error('No webhook data specified'));
    }

    if (update.message) {
      const { message } = update;

      if (message.successful_payment) {
        this.performSuccessfulPayment(message.successful_payment, user);
      } else if (message.new_chat_member) {
        this.performNewChatMember(message.new_chat_member, user);
      } else if (message.left_chat_member) {
        this.performLeftChatMember(message.left_chat_member, user);
      } else if (user.suggest_mode && !user.banned) {
        this.performSuggest(message, user);
      } else if (message.reply_to_message) {
        this.performReply(message.reply_to_message, message, user)
      } else if (message.text) {
        const { text } = message;

        if (text && text.startsWith('/')) {
          const command = text.split(' ');

          this.performCommand(command, update.message, user);
        } else {
          this.performMessage(update.message, user);
        }
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
