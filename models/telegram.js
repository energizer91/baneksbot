const EventEmitter = require('events');
const config = require('config');
const dict = require('../helpers/dictionary');

class Telegram extends EventEmitter {
  constructor(request) {
    super();

    this.request = request;
    this.webhookMiddleware = this.webhookMiddleware.bind(this);
  }

  sendRequest(request, params, method = 'POST') {
    const botUrl = `${config.get('telegram.url')}${config.get('telegram.token')}/${request}`;
    const parameters = this.request.prepareConfig(botUrl, method);

    params._key = params._key || params.chat_id;

    if (!params._rule) {
      if (params._key > 0) {
        params._rule = config.get('telegram.rules.individualMessage');
      } else {
        params._rule = config.get('telegram.rules.groupMessage');
      }
    }

    return this.request.makeRequest(parameters, params);
  }

  /**
   *
   * @param {String} inlineId inline query id
   * @param {{}[]} results stringified array of results
   * @param {Number} [next_offset] Next inline result offset
   * @returns {Promise}
   */
  sendInline(inlineId, results, next_offset) {
    return this.sendRequest('answerInlineQuery', {
      inline_query_id: inlineId,
      results: JSON.stringify(results),
      next_offset: next_offset || 0,
      cache_time: 0,
      _key: Number(inlineId),
      _rule: config.get('telegram.rules.inlineQuery')
    });
  }

  prepareButtons(message, params = {}) {
    let buttons = [];

    if (params.buttons) {
      buttons = params.buttons;
    } else if (!params.disableButtons) {
      if (message && message.from_id && message.post_id) {
        buttons.push([]);
        buttons[buttons.length - 1].push({
          text: dict.translate(params.language, 'go_to_anek'),
          url: 'https://vk.com/wall' + message.from_id + '_' + message.post_id
        });

        if (!params.disableComments) {
          buttons[buttons.length - 1].push({
            text: dict.translate(params.language, 'comments'),
            callback_data: 'comment ' + message.post_id
          });
        }
      }

      if (message.attachments && message.attachments.length > 0 && !params.forceAttachments) {
        buttons.push([]);
        buttons[buttons.length - 1].push({
          text: dict.translate(params.language, 'attachments'),
          callback_data: 'attach ' + message.post_id
        });
      }

      if (message.post_id) {
        if (params.admin && message.spam) {
          buttons.push([]);
          buttons[buttons.length - 1].push({
            text: 'Ne spam',
            callback_data: 'unspam ' + message.post_id
          });
        } else if (params.admin && !message.spam) {
          buttons.push([]);
          buttons[buttons.length - 1].push({
            text: 'Spam',
            callback_data: 'spam ' + message.post_id
          });
        }
      }

      if (params.suggest) {
        buttons.push([]);
        if (params.editor) {
          if (message.public) {
            buttons[buttons.length - 1].push({
              text: '+',
              callback_data: 's_a ' + message._id
            });
          }
          buttons[buttons.length - 1].push({
            text: 'Анон',
            callback_data: 's_aa ' + message._id
          });
          buttons[buttons.length - 1].push({
            text: '-',
            callback_data: 's_d ' + message._id
          });
        } else {
          buttons[buttons.length - 1].push({
            text: 'Удалить',
            callback_data: 's_d ' + message._id
          });
        }
      }
    }

    return buttons;
  }

  sendMessage(userId, message, params = {}) {
    if (!message) {
      return;
    }

    if (message && message.copy_history && message.copy_history.length && message.post_id) {
      const insideMessage = message.copy_history[0];

      insideMessage.post_id = message.post_id;
      insideMessage.from_id = message.from_id;
      insideMessage.text = message.text + (message.text.length ? '\n' : '') + insideMessage.text;

      return this.sendMessage(userId, insideMessage, params);
    }

    // let attachments = [];
    let buttons = [];
    let sendMessage;

    if (typeof message === 'string') {
      sendMessage = {
        chat_id: userId,
        text: message
      };
    } else {
      buttons = this.prepareButtons(message, params);

      sendMessage = {
        chat_id: userId,
        text: message.text + ((message.attachments && message.attachments.length > 0) ? '\n(Вложений: ' + message.attachments.length + ')' : '')
      };

      // if (params.forceAttachments) {
      //   attachments = (message.attachments || []);
      // }
    }

    sendMessage._key = params._key;
    sendMessage._rule = params._rule;

    if (params.parse_mode) {
      sendMessage.parse_mode = params.parse_mode;
    }

    if (params.keyboard || params.remove_keyboard || buttons.length) {
      sendMessage.reply_markup = {};
    }

    if (params.keyboard) {
      sendMessage.reply_markup = this.prepareKeyboard();
    }

    if (params.remove_keyboard) {
      sendMessage.reply_markup.remove_keyboard = true;
    }

    if (buttons.length > 0) {
      sendMessage.reply_markup.inline_keyboard = buttons;
    }

    if (sendMessage.reply_markup) {
      sendMessage.reply_markup = JSON.stringify(sendMessage.reply_markup);
    }

    if (message.reply_to_message_id) {
      sendMessage.reply_to_message_id = message.reply_to_message_id;
    }

    return this.sendRequest('sendMessage', sendMessage);
  }

  sendMessageToAdmin(text) {
    return this.sendMessage(config.get('telegram.adminChat'), text);
  }

  /**
   * Answers callback query
   * @param {String} queryId Callback query id
   * @param {Telegram.AnswerCallbackQuery} payload Response payload
   * @returns {Promise}
   */
  answerCallbackQuery(queryId, payload = {}) {
    return this.sendRequest('answerCallbackQuery', {
      callback_query_id: queryId,
      text: payload.text,
      show_alert: payload.show_alert,
      url: payload.url,
      _key: Number(queryId),
      _rule: config.get('telegram.rules.callbackQuery')
    })
      .catch(function (error) {
        console.error(error);
        return {};
      });
  }

  sendChatAction(userId, action) {
    return this.sendRequest('sendChatAction', {
      chat_id: userId,
      action: action
    });
  }

  webhookMiddleware(req, res, next) {
    const update = req.body;

    if (!update) {
      return next(new Error('No webhook data specified'));
    }

    req.update = update;

    return next();
  }
}

module.exports = Telegram;

/**
 * @class Telegram
 */

/**
 * Telegram Update instance
 * @typedef {Object} Telegram.Update
 * @property {Number} update_id The update‘s unique identifier
 * @property {Telegram.Message} [message] New incoming message of any kind — text, photo, sticker, etc.
 * @property {Telegram.Message} [edited_message] New version of a message that is known to the bot and was edited
 * @property {Telegram.Message} [channel_post] New incoming channel post of any kind — text, photo, sticker, etc.
 * @property {Telegram.InlineQuery} [inline_query] New incoming inline query
 * @property {Telegram.CallbackQuery} [callback_query] New incoming callback query
 * @property {Telegram.SuccessfulPayment} [successful_payment] Message is a service message about a successful payment, information about the payment.
 * @property {Telegram.PreCheckoutQuery} [pre_checkout_query] New incoming pre-checkout query. Contains full information about checkout
 */

/**
 * Telegram message instance
 * @typedef {Object} Telegram.Message
 * @property {Number} message_id Unique message identifier inside this chat
 * @property {Telegram.User} [from] Sender, empty for messages sent to channels
 * @property {Number} date Date the message was sent in Unix time
 * @property {Telegram.Chat} chat Conversation the message belongs to
 * @property {Telegram.User} [forward_from] For forwarded messages, sender of the original message
 * @property {Telegram.Chat} [forward_from_chat] For messages forwarded from channels, information about the original channel
 * @property {Telegram.Message} [reply_to_message] For replies, the original message. Note that the Message object in this field will not contain further reply_to_message fields even if it itself is a reply.
 * @property {String} [text] For text messages, the actual UTF-8 text of the message, 0-4096 characters.
 * @property {Telegram.User} [new_chat_member] New member that was added to the group or supergroup and information about it
 * @property {Telegram.User} [left_chat_member] A member was removed from the group, information about them
 *
 */

/**
 * Telegram inline query instance
 * @typedef {Object} Telegram.InlineQuery
 * @property {Number} id Unique identifier for this query
 * @property {Telegram.User} from Sender
 * @property {String} query Text of the query (up to 512 characters)
 * @property {String} offset Offset of the results to be returned, can be controlled by the bot
 */

/**
 * Telegram callback query instance
 * @typedef {Object} Telegram.CallbackQuery
 * @property {String} id Unique identifier for this query
 * @property {Telegram.User} from Sender
 * @property {Telegram.Message} [message] Message with the callback button that originated the query. Note that message content and message date will not be available if the message is too old
 * @property {String} [inline_message_id] Identifier of the message sent via the bot in inline mode, that originated the query.
 * @property {String} [data] Data associated with the callback button. Be aware that a bad client can send arbitrary data in this field.
 */

/**
 * Telegram successful payment instance
 * @typedef {Object} Telegram.SuccessfulPayment
 * @property {String} currency Three-letter ISO 4217 currency code
 * @property {Number} total_amount Total price in the smallest units of the currency (integer, not float/double). For example, for a price of US$ 1.45 pass amount = 145. See the exp parameter in currencies.json, it shows the number of digits past the decimal point for each currency (2 for the majority of currencies).
 * @property {String} invoice_payload Bot specified invoice payload
 * @property {String} [shipping_option_id] Identifier of the shipping option chosen by the user
 * @property {Telegram.OrderInfo} [order_info] Order info provided by the user
 */

/**
 * Telegram pre-checkout query
 * @typedef {Object} Telegram.PreCheckoutQuery
 * @property {String} id Unique query identifier
 * @property {Telegram.User} from User who sent the query
 * @property {String} currency Three-letter ISO 4217 currency code
 * @property {Number} total_amount Total price in the smallest units of the currency (integer, not float/double). For example, for a price of US$ 1.45 pass amount = 145. See the exp parameter in currencies.json, it shows the number of digits past the decimal point for each currency (2 for the majority of currencies).
 * @property {String} invoice_payload Bot specified invoice payload.
 * @property {String} [shipping_option_id] Identifier of the shipping option chosen by the user
 * @property {Telegram.OrderInfo} [order_info] Order info provided by the use
 */

/**
 * Telegram Order Info instance
 * @typedef {Object} Telegram.OrderInfo
 * @property {String} [name] User name
 * @property {String} [phone_number] User's phone number
 * @property {String} [email] User email
 */

/**
 * Telegram user instance
 * @typedef {Object} Telegram.User
 * @property {Number} id Unique identifier for this user or bot
 * @property {Boolean} is_bot True, if this user is a bot
 * @property {String} [first_name] User‘s or bot’s first name
 * @property {String} [last_name] User‘s or bot’s last name
 * @property {String} [username] User‘s or bot’s username
 * @property {String} [language_code] IETF language tag of the user's language
 */

/**
 * Telegram chat instance
 * @typedef {Object} Telegram.Chat
 * @property {String} type Type of chat, can be either “private”, “group”, “supergroup” or “channel”
 * @property {String} [title] Title, for supergroups, channels and group chats
 * @property {String} [first_name] User‘s or bot’s first name
 * @property {String} [last_name] User‘s or bot’s last name
 * @property {String} [username] User‘s or bot’s username
 * @property {String} [language_code] IETF language tag of the user's language
 * @property {Boolean} [all_members_are_administrators] True if a group has ‘All Members Are Admins’ enabled.
 */

/**
 * Telegram Callback query answer
 * @typedef {Object} Telegram.AnswerCallbackQuery
 * @property {String} text
 * @property {Boolean} show_alert
 * @property {String} url
 */
