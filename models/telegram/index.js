const NetworkModel = require('../network');
const config = require('config');
const debug = require('../../helpers/debug')('baneks-node:telegram');
const debugError = require('debug')('baneks-node:telegram:error');

class Telegram extends NetworkModel {
  constructor () {
    super();

    this.endpoint = `${config.get('telegram.url')}${config.get('telegram.token')}`;
    this.params = {
      _getBackoff: error => error.response.data.parameters.retry_after
    };
    this.individualRule = config.get('telegram.rules.individualMessage');
    this.groupRule = config.get('telegram.rules.groupMessage');
  }

  sendRequest (request, params = {}, method = 'POST') {
    const axiosConfig = {
      url: `${this.endpoint}/${request}`,
      method: method.toLowerCase()
    };

    const requestParams = Object.assign({}, this.params, params);

    if (!requestParams._key) {
      requestParams._key = requestParams.chat_id;
    }

    if (!requestParams._rule) {
      requestParams._rule = requestParams._key > 0 ? this.individualRule : this.groupRule;
    }

    return this.makeRequest(axiosConfig, requestParams).then(response => response ? response.result : {});
  }

  sendInline (inlineId, results, nextOffset = 0) {
    return this.sendRequest('answerInlineQuery', {
      inline_query_id: inlineId,
      results: JSON.stringify(results),
      next_offset: String(nextOffset),
      cache_time: 0,
      _key: Number(inlineId),
      _rule: config.get('telegram.rules.inlineQuery')
    });
  }

  prepareInlineKeyboard (buttons) {
    return JSON.stringify({ inline_keyboard: buttons });
  }

  async sendMessage (userId, message, params) {
    if (!message) {
      return {};
    }

    if (message.length > 4096) {
      const messages = [];

      let messageCursor = 0;
      let messagePart = '';

      do {
        messagePart = message.slice(messageCursor, messageCursor + 4096);

        if (messagePart) {
          messages.push(messagePart);
        }

        messageCursor += 4096;
      } while (messagePart);

      return this.sendMessages(userId, messages, params);
    }

    debug('Sending message', userId, message, params);

    return this.sendRequest('sendMessage', {
      chat_id: userId,
      text: message,
      ...params
    });
  }

  sendMessages (userId, messages = [], params) {
    return this.fulfillAll(messages.map(message => this.sendMessage(userId, message, params)));
  }

  forwardMessage (userId, messageId, fromId) {
    debug('Forwarding message', userId, messageId, fromId);

    return this.sendRequest('forwardMessage', {
      chat_id: userId,
      from_chat_id: fromId,
      message_id: messageId
    });
  }

  forwardMessages (userId, messages, params) {
    return this.fulfillAll(messages.map(message => this.forwardMessage(userId, message, params)));
  }

  async sendPhoto (userId, photo, params) {
    await this.sendChatAction(userId, 'upload_photo');

    return this.sendRequest('sendPhoto', {
      chat_id: userId,
      ...photo,
      ...params
    });
  }

  async sendAudio (userId, audio, params) {
    await this.sendChatAction(userId, 'upload_audio');

    return this.sendRequest('sendAudio', {
      chat_id: userId,
      ...audio,
      ...params
    });
  }

  async sendVideo (userId, video, params) {
    await this.sendChatAction(userId, 'upload_video');

    return this.sendRequest('sendPhoto', {
      chat_id: userId,
      ...video,
      ...params
    });
  }

  async sendDocument (userId, video, params) {
    await this.sendChatAction(userId, 'upload_document');

    return this.sendRequest('sendDocument', {
      chat_id: userId,
      ...video,
      ...params
    });
  }

  async sendMediaGroup (userId, mediaGroup, params) {
    if (!mediaGroup.length) {
      return {};
    }

    await this.sendChatAction(userId, 'upload_photo');

    if (params.forcePlaceholder) {
      await this.sendMessage(userId, 'Вложений: ' + mediaGroup.length, params);
    }

    debug('Sending media group', userId, mediaGroup, params);

    return this.sendRequest('sendMediaGroup', {
      chat_id: userId,
      media: JSON.stringify(mediaGroup),
      ...params
    });
  }

  async sendMessageWithChatAction (userId, chatAction, message, params) {
    await this.sendChatAction(userId, chatAction);

    return this.sendMessage(userId, message, params);
  }

  async sendAttachment (userId, attachment, params) {
    const {type, ...attach} = attachment;

    debug('Sending attachment', userId, attachment, params);

    switch (type) {
      case 'photo':
        return this.sendPhoto(userId, attach, params);
      case 'audio':
        return this.sendAudio(userId, attach, params);
      case 'video':
        return this.sendVideo(userId, attach, params);
      case 'document':
        return this.sendDocument(userId, attach, params);
      case 'poll':
      case 'link':
        return this.sendMessageWithChatAction(userId, 'typing', attach.text, params);
      default:
        debug('Unknown attachment', attachment);

        return {};
    }
  }

  async sendAttachments (userId, attachments = [], params) {
    if (!attachments.length) {
      return [];
    }

    const mediaGroup = attachments
      .filter(attachment => attachment.type === 'photo')
      .map(attachment => ({
        type: attachment.type,
        media: attachment.photo,
        caption: attachment.caption
      }));

    if (mediaGroup.length === attachments.length && (mediaGroup.length >= 2 && mediaGroup.length <= 10)) {
      return this.sendMediaGroup(userId, mediaGroup, params);
    }

    return this.fulfillAll(attachments.map(attachment => this.sendAttachment(userId, attachment, params)));
  }

  sendSticker (userId, stickerId) {
    if (!stickerId) {
      throw new Error('No sticker specified!');
    }

    if (!userId) {
      throw new Error('No user specified!');
    }

    debug('Sending sticker', userId, stickerId);

    return this.sendRequest('sendSticker', {
      chat_id: userId,
      sticker: stickerId
    });
  }

  getMe () {
    return this.sendRequest('getMe');
  }

  getWebhookInfo () {
    return this.sendRequest('getWebhookInfo');
  }

  answerCallbackQuery (queryId, payload = {}) {
    debug('Answering callback query', queryId, payload);

    return this.sendRequest('answerCallbackQuery', {
      callback_query_id: queryId,
      text: payload.text,
      show_alert: payload.show_alert,
      url: payload.url,
      _key: Number(queryId),
      _rule: config.get('telegram.rules.callbackQuery')
    })
      .catch(error => {
        debugError(error);

        return {};
      });
  }

  editMessageText (chatId, messageId, text, params = {}) {
    if (!text || !messageId) {
      return {};
    }

    debug('Editing message text', chatId, messageId, text, params);

    return this.sendRequest('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      ...params
    })
  }

  editMessageButtons (message, buttons = []) {
    if (!message) {
      return;
    }

    message.reply_markup = this.prepareInlineKeyboard(buttons);

    if (message.chat && message.chat.id) {
      message.chat_id = message.chat.id;
    }

    debug('Editing message buttons', message, buttons);

    return this.sendRequest('editMessageReplyMarkup', message)
      .catch(error => {
        debugError('Editing message error', error);

        return message;
      });
  }

  sendChatAction (userId, action) {
    debug('Sending chat action', userId, action);

    return this.sendRequest('sendChatAction', {
      chat_id: userId,
      action
    });
  }

  sendInvoice (userId, invoice) {
    debug('Sending invoice', userId, invoice);

    return this.sendRequest('sendInvoice', {
      chat_id: userId,
      provider_token: config.get('telegram.paymentToken'),
      currency: 'RUB',
      start_parameter: 'donate',
      ...invoice
    });
  }
}

module.exports = Telegram;
