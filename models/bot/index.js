const dict = require('../../helpers/dictionary');
const config = require('config');
const Telegram = require('../telegram');

class Bot extends Telegram {
  constructor () {
    super();

    this.middleware = this.middleware.bind(this);
  }

  onCommand (command, callback) {
    return this.on('command:' + command, callback);
  }

  getUserInfo (user) {
    if (!user || !user.user_id) {
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

  getAnekButtons (anek, params = {}) {
    const buttons = [];

    const {disableComments, language, forceAttachments, admin, disableAttachments} = params;

    if (anek.from_id && anek.post_id) {
      buttons.push([]);
      buttons[buttons.length - 1].push({
        text: dict.translate(language, 'go_to_anek'),
        url: 'https://vk.com/wall' + anek.from_id + '_' + anek.post_id
      });

      if (!disableComments) {
        buttons[buttons.length - 1].push({
          text: dict.translate(language, 'comments'),
          callback_data: 'comment ' + anek.post_id
        });
      }
    }

    if (anek.attachments && anek.attachments.length > 0 && !forceAttachments) {
      if (!disableAttachments) {
        buttons.push([]);
        buttons[buttons.length - 1].push({
          text: dict.translate(language, 'attachments'),
          callback_data: 'attach ' + anek.post_id
        });

        anek.text += '\n(Вложений: ' + anek.attachments.length + ')';
      }
    }

    if (anek.post_id) {
      if (admin && anek.spam) {
        buttons.push([]);
        buttons[buttons.length - 1].push({
          text: 'Ne spam',
          callback_data: 'unspam ' + anek.post_id
        });
      } else if (admin && !anek.spam) {
        buttons.push([]);
        buttons[buttons.length - 1].push({
          text: 'Spam',
          callback_data: 'spam ' + anek.post_id
        });
      }
    }

    return buttons;
  }

  sendAnek (userId, anek, params = {}) {
    if (!anek) {
      return;
    }

    const immutableAnek = Object.assign({}, anek.toObject ? anek.toObject() : anek);

    const buttons = this.getAnekButtons(immutableAnek, params);

    if (immutableAnek.copy_history && immutableAnek.copy_history.length && immutableAnek.post_id) {
      const insideMessage = immutableAnek.copy_history[0];

      insideMessage.post_id = immutableAnek.post_id;
      insideMessage.from_id = immutableAnek.from_id;
      insideMessage.text = immutableAnek.text + (immutableAnek.text.length ? '\n' : '') + insideMessage.text;

      if (immutableAnek.attachments && immutableAnek.attachments.length) {
        if (!insideMessage.attachments || !insideMessage.attachments.length) {
          insideMessage.attachments = [];
        }

        insideMessage.attachments = insideMessage.attachments.concat(immutableAnek.attachments);
      }

      return this.sendAnek(userId, insideMessage, params);
    }

    const replyMarkup = this.prepareInlineKeyboard(buttons);

    return this.sendMessage(userId, immutableAnek.text, {
      reply_markup: replyMarkup,
      ...params
    })
  }

  sendComment (userId, comment, params) {
    const attachments = this.convertAttachments(comment.attachments || []);

    return this.sendMessage(userId, comment.text, params)
      .then(() => this.sendAttachments(userId, attachments, { forceAttachments: true }));
  }

  sendSuggest (userId, suggest, params) {
    const buttons = [];

    let sendMessage = {
      chat_id: userId,
      text: suggest.text,
      caption: suggest.caption
    };
    let commandType = '';

    if (params.native) {
      let chatId = userId;

      if (suggest && suggest.chat && suggest.chat.id) {
        chatId = suggest.chat.id;
      }

      return this.forwardMessage(userId, suggest.message_id, chatId);
    }

    if (params.suggest) {
      buttons.push([]);
      if (params.editor) {
        if (suggest.public) {
          buttons[buttons.length - 1].push({
            text: '+',
            callback_data: 's_a ' + suggest._id
          });
        }
        buttons[buttons.length - 1].push({
          text: 'Анон',
          callback_data: 's_aa ' + suggest._id
        });
        buttons[buttons.length - 1].push({
          text: '-',
          callback_data: 's_d ' + suggest._id
        });
      } else {
        buttons[buttons.length - 1].push({
          text: 'Удалить',
          callback_data: 's_d ' + suggest._id
        });
      }
    }

    if (buttons.length) {
      sendMessage.reply_markup = this.prepareInlineKeyboard(buttons);
    }

    if (suggest.audio && suggest.audio.file_id) {
      commandType = 'sendAudio';
      sendMessage.audio = suggest.audio.file_id;
    } else if (suggest.voice && suggest.voice.file_id) {
      commandType = 'sendVoice';
      sendMessage.voice = suggest.voice.file_id;
    } else if (suggest.video_note && suggest.video_note.file_id) {
      commandType = 'sendVideoNote';
      sendMessage.video_note = suggest.video_note.file_id;
    } else if (suggest.document && suggest.document.file_id) {
      commandType = 'sendDocument';
      sendMessage.document = suggest.document.file_id;
    } else if (suggest.photo && suggest.photo.length > 0) {
      commandType = 'sendPhoto';
      sendMessage.photo = suggest.photo[suggest.photo.length - 1].file_id;
    } else {
      commandType = 'sendMessage';
      sendMessage.text = sendMessage.text || 'Пустое сообщение';
    }

    return this.sendRequest(commandType, sendMessage);
  }

  sendSuggests (userId, suggests, params) {
    return this.fulfillAll(suggests.map(suggest => this.sendSuggest(userId, suggest, params)));
  }

  forwardMessageToChannel (message, params) {
    if (!config.get('telegram.baneksChannel')) {
      return;
    }
    return this.sendSuggest(config.get('telegram.baneksChannel'), message, params);
  }

  sendMessageToAdmin (text) {
    return this.sendMessage(config.get('telegram.adminChat'), text);
  }

  performInlineQuery (inlineQuery, user) {
    console.log('Performing inline query from ' + this.getUserInfo(user));
    return this.emit('inlineQuery', inlineQuery, user);
  }

  performCallbackQuery (callbackQuery, user) {
    console.log('Performing callback query from ' + this.getUserInfo(user));
    return this.emit('callbackQuery', callbackQuery, user);
  }

  performMessage (message, user) {
    console.log('Performing message from ' + this.getUserInfo(user));
    return this.emit('message', message, user);
  }

  performCommand (command, message, user) {
    console.log('Performing command from ' + this.getUserInfo(user));
    return this.emit('command:' + command[0].slice(1), command, message, user);
  }

  performPreCheckoutQuery (preCheckoutQuery, user) {
    console.log('Performing pre checkout query from ' + this.getUserInfo(user));
    return this.emit('preCheckoutQuery', preCheckoutQuery, user);
  }

  performSuccessfulPayment (successfulPayment, user) {
    console.log('Performing successful payment from ' + this.getUserInfo(user));
    return this.emit('successfulPayment', successfulPayment, user);
  }

  performNewChatMember (member, user) {
    return this.emit('newChatMember', member, user);
  }

  performLeftChatMember (member, user) {
    return this.emit('leftChatMember', member, user);
  }

  performSuggest (suggest, user) {
    return this.emit('suggest', suggest, user);
  }

  performReply (reply, message, user) {
    return this.emit('reply', reply, message, user);
  }

  performUpdate (update, user) {
    if (!update) {
      throw new Error('No webhook data specified');
    }

    const { message } = update;

    if (message) {
      if (message.successful_payment) {
        return this.performSuccessfulPayment(message.successful_payment, user);
      }

      if (message.new_chat_member) {
        return this.performNewChatMember(message.new_chat_member, user);
      }

      if (message.left_chat_member) {
        return this.performLeftChatMember(message.left_chat_member, user);
      }

      if (user.suggest_mode && !user.banned) {
        return this.performSuggest(message, user);
      }

      if (message.reply_to_message) {
        return this.performReply(message.reply_to_message, message, user);
      }

      if (message.text) {
        const { text } = message;

        if (text && text.startsWith('/')) {
          const command = text.split(' ');
          const firstPart = command[0];

          if (firstPart) {
            const botName = firstPart.split('@');

            if (botName.length === 1 || (botName.length === 2 && botName[1] === config.get('telegram.botName'))) {
              return this.performCommand([botName[0], ...command.slice(1)], update.message, user);
            }
          }
        }

        return this.performMessage(update.message, user);
      }

      throw new Error('Unknown message');
    }

    if (update.inline_query) {
      return this.performInlineQuery(update.inline_query, user);
    }

    if (update.callback_query) {
      return this.performCallbackQuery(update.callback_query, user);
    }

    if (update.pre_checkout_query) {
      return this.performPreCheckoutQuery(update.pre_checkout_query, user);
    }

    return Promise.resolve([]);
  }

  async middleware (req, res, next) {
    const update = req.body;

    if (!update) {
      return next(new Error('No webhook data specified'));
    }

    const { user } = req;

    this.emit('update', update, user);

    req.update = update;

    try {
      req.results = await this.performUpdate(update, user);

      return next();
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = Bot;
