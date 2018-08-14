const NetworkModel = require('../network');
const config = require('config');

class Telegram extends NetworkModel {
  sendRequest (request, params = {}, method = 'POST') {
    const axiosConfig = {
      url: `${config.get('telegram.url')}${config.get('telegram.token')}/${request}`,
      method: method.toLowerCase()
    };

    if (!params._key) {
      params._key = params.chat_id;
    }

    if (!params._rule) {
      if (params._key > 0) {
        params._rule = config.get('telegram.rules.individualMessage');
      } else {
        params._rule = config.get('telegram.rules.groupMessage');
      }
    }

    return this.makeRequest(axiosConfig, params).then(response => response ? response.result : {});
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

  sendMessage (userId, message, params) {
    if (!message) {
      return {};
    }

    return this.sendRequest('sendMessage', {
      chat_id: userId,
      text: message,
      ...params
    });
  }

  sendMessages (userId, messages, params) {
    return this.fulfillAll(messages.map(message => this.sendMessage(userId, message, params)));
  }

  forwardMessage (userId, messageId, fromId) {
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

    return this.sendRequest('sendMessage', {
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

  sendAttachment (userId, attachment, params) {
    const {type, ...attach} = attachment;

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
        const poll = 'Опрос: *' + attachment.poll.question + '*\n' + (attachment.poll.answers || []).map((answer, index) => {
          return (index + 1) + ') ' + answer.text + ': ' + answer.votes + ' голоса (' + answer.rate + '%)';
        }).join('\n');

        return this.sendMessageWithChatAction(userId, 'typing', poll, params);
      case 'link':
        const link = attachment.link.title + '\n' + attachment.link.url;

        return this.sendMessageWithChatAction(userId, 'typing', link, params);
      default:
        console.log('Unknown attachment', attachment);

        return {};
    }
  }

  sendAttachments (userId, attachments, params) {
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

  editMessageText (chatId, messageId, text, params = {}) {
    if (!text || !messageId) {
      return {};
    }

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

    return this.sendRequest('editMessageReplyMarkup', message)
      .catch(function (error) {
        console.error('Editing message error', error);
        return message;
      });
  }

  sendChatAction (userId, action) {
    return this.sendRequest('sendChatAction', {
      chat_id: userId,
      action: action
    });
  }

  sendInvoice (userId, invoice) {
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
