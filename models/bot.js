const EventEmitter = require('events');
const dict = require('../helpers/dictionary');

class Bot extends EventEmitter {
  constructor (telegram, vk) {
    super();

    this.telegram = telegram;
    this.vk = vk;

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

  convertAttachment (attachment) {
    if (!attachment) {
      return {};
    }

    switch (attachment.type) {
      case 'photo':
        return {
          type: 'photo',
          photo: attachment.photo.photo_2560 ||
            attachment.photo.photo_1280 ||
            attachment.photo.photo_604 ||
            attachment.photo.photo_130 ||
            attachment.photo.photo_75,
          caption: attachment.text
        };
      case 'video':
        return {
          type: 'video',
          text: (attachment.title || '') + '\nhttps://vk.com/video' + attachment.video.owner_id + '_' + attachment.video.id
        };
      case 'doc':
        return {
          type: 'document',
          document: attachment.doc.url,
          caption: attachment.doc.title
        };
      case 'audio':
        return {
          type: 'audio',
          audio: attachment.audio.url,
          title: attachment.audio.artist + ' - ' + attachment.audio.title
        };
      case 'poll':
        return {
          type: 'poll',
          text: 'Опрос: *' + attachment.poll.question + '*\n' + (attachment.poll.answers || []).map(function (answer, index) {
            return (index + 1) + ') ' + answer.text + ': ' + answer.votes + ' голоса (' + answer.rate + '%)';
          }).join('\n')
        };
      case 'link':
        return {
          type: 'link',
          text: attachment.link.title + '\n' + attachment.link.url
        };
    }
  }

  convertAttachments (attachments = []) {
    return attachments.map(attachment => this.convertAttachment(attachment));
  }

  sendAnek (userId, anek, params = {}) {
    if (!anek) {
      return;
    }

    const buttons = [];

    if (anek.copy_history && anek.copy_history.length && anek.post_id) {
      const insideMessage = anek.copy_history[0];

      insideMessage.post_id = anek.post_id;
      insideMessage.from_id = anek.from_id;
      insideMessage.text = anek.text + (anek.text.length ? '\n' : '') + insideMessage.text;

      return this.sendAnek(userId, insideMessage, params);
    }

    if (anek.from_id && anek.post_id) {
      buttons.push([]);
      buttons[buttons.length - 1].push({
        text: dict.translate(params.language, 'go_to_anek'),
        url: 'https://vk.com/wall' + anek.from_id + '_' + anek.post_id
      });

      if (!params.disableComments) {
        buttons[buttons.length - 1].push({
          text: dict.translate(params.language, 'comments'),
          callback_data: 'comment ' + anek.post_id
        });
      }
    }

    if (anek.attachments && anek.attachments.length > 0 && !params.forceAttachments) {
      buttons.push([]);
      buttons[buttons.length - 1].push({
        text: dict.translate(params.language, 'attachments'),
        callback_data: 'attach ' + anek.post_id
      });
    }

    if (anek.post_id) {
      if (params.admin && anek.spam) {
        buttons.push([]);
        buttons[buttons.length - 1].push({
          text: 'Ne spam',
          callback_data: 'unspam ' + anek.post_id
        });
      } else if (params.admin && !anek.spam) {
        buttons.push([]);
        buttons[buttons.length - 1].push({
          text: 'Spam',
          callback_data: 'spam ' + anek.post_id
        });
      }
    }

    const replyMarkup = this.telegram.prepareInlineKeyboard(buttons);

    return this.telegram.sendMessage(userId, anek.text, {
      reply_markup: replyMarkup
    })
  }

  sendComment (userId, comment, params) {
    const attachments = this.convertAttachments(comment.attachments || []);

    return this.telegram.sendMessage(userId, comment.text, params)
      .then(() => this.telegram.sendAttachments(userId, attachments, { forceAttachments: true }));
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
    const {update, user} = req;

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
    } else if (update.inline_query) {
      this.performInlineQuery(update.inline_query, user);
    } else if (update.callback_query) {
      this.performCallbackQuery(update.callback_query, user);
    } else if (update.pre_checkout_query) {
      this.performPreCheckoutQuery(update.pre_checkout_query, user);
    }
  }
}

module.exports = Bot;
