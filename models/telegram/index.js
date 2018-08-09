const EventEmitter = require('../events/index');
const config = require('config');

class Telegram extends EventEmitter {
  constructor (request) {
    super();

    this.request = request;
  }

  sendRequest (request, params = {}, method = 'POST') {
    const axiosConfig = {
      url: `${config.get('telegram.url')}${config.get('telegram.token')}/${request}`,
      method: method.toLowerCase()
    };

    params._key = params._key || params.chat_id;

    if (!params._rule) {
      if (params._key > 0) {
        params._rule = config.get('telegram.rules.individualMessage');
      } else {
        params._rule = config.get('telegram.rules.groupMessage');
      }
    }

    return this.request.makeRequest(axiosConfig, params).then(response => response.result);
  }

  sendInline (inlineId, results, nextOffset) {
    return this.sendRequest('answerInlineQuery', {
      inline_query_id: inlineId,
      results: JSON.stringify(results),
      next_offset: nextOffset || 0,
      cache_time: 0,
      _key: Number(inlineId),
      _rule: config.get('telegram.rules.inlineQuery')
    });
  }

  // prepareButtons (message, params = {}) {
  //   let buttons = [];
  //
  //   if (params.buttons) {
  //     buttons = params.buttons;
  //   } else if (!params.disableButtons) {
  //     if (message && message.from_id && message.post_id) {
  //       buttons.push([]);
  //       buttons[buttons.length - 1].push({
  //         text: dict.translate(params.language, 'go_to_anek'),
  //         url: 'https://vk.com/wall' + message.from_id + '_' + message.post_id
  //       });
  //
  //       if (!params.disableComments) {
  //         buttons[buttons.length - 1].push({
  //           text: dict.translate(params.language, 'comments'),
  //           callback_data: 'comment ' + message.post_id
  //         });
  //       }
  //     }
  //
  //     if (message.attachments && message.attachments.length > 0 && !params.forceAttachments) {
  //       buttons.push([]);
  //       buttons[buttons.length - 1].push({
  //         text: dict.translate(params.language, 'attachments'),
  //         callback_data: 'attach ' + message.post_id
  //       });
  //     }
  //
  //     if (message.post_id) {
  //       if (params.admin && message.spam) {
  //         buttons.push([]);
  //         buttons[buttons.length - 1].push({
  //           text: 'Ne spam',
  //           callback_data: 'unspam ' + message.post_id
  //         });
  //       } else if (params.admin && !message.spam) {
  //         buttons.push([]);
  //         buttons[buttons.length - 1].push({
  //           text: 'Spam',
  //           callback_data: 'spam ' + message.post_id
  //         });
  //       }
  //     }
  //
  //     if (params.suggest) {
  //       buttons.push([]);
  //       if (params.editor) {
  //         if (message.public) {
  //           buttons[buttons.length - 1].push({
  //             text: '+',
  //             callback_data: 's_a ' + message._id
  //           });
  //         }
  //         buttons[buttons.length - 1].push({
  //           text: 'Анон',
  //           callback_data: 's_aa ' + message._id
  //         });
  //         buttons[buttons.length - 1].push({
  //           text: '-',
  //           callback_data: 's_d ' + message._id
  //         });
  //       } else {
  //         buttons[buttons.length - 1].push({
  //           text: 'Удалить',
  //           callback_data: 's_d ' + message._id
  //         });
  //       }
  //     }
  //   }
  //
  //   return buttons;
  // }

  prepareInlineKeyboard (buttons) {
    return JSON.stringify({ inline_keyboard: buttons });
  }

  // sendMessage (userId, message, params = {}) {
  //   if (!message) {
  //     return;
  //   }
  //
  //   if (message && message.copy_history && message.copy_history.length && message.post_id) {
  //     const insideMessage = message.copy_history[0];
  //
  //     insideMessage.post_id = message.post_id;
  //     insideMessage.from_id = message.from_id;
  //     insideMessage.text = message.text + (message.text.length ? '\n' : '') + insideMessage.text;
  //
  //     return this.sendMessage(userId, insideMessage, params);
  //   }
  //
  //   // let attachments = [];
  //   let buttons = [];
  //   let sendMessage;
  //
  //   if (typeof message === 'string') {
  //     sendMessage = {
  //       chat_id: userId,
  //       text: message
  //     };
  //   } else {
  //     buttons = this.prepareButtons(message, params);
  //
  //     sendMessage = {
  //       chat_id: userId,
  //       text: message.text + ((message.attachments && message.attachments.length > 0) ? '\n(Вложений: ' + message.attachments.length + ')' : '')
  //     };
  //
  //     // if (params.forceAttachments) {
  //     //   attachments = (message.attachments || []);
  //     // }
  //   }
  //
  //   sendMessage._key = params._key;
  //   sendMessage._rule = params._rule;
  //
  //   if (params.parse_mode) {
  //     sendMessage.parse_mode = params.parse_mode;
  //   }
  //
  //   if (params.keyboard || params.remove_keyboard || buttons.length) {
  //     sendMessage.reply_markup = {};
  //   }
  //
  //   if (params.keyboard) {
  //     sendMessage.reply_markup = this.prepareKeyboard();
  //   }
  //
  //   if (params.remove_keyboard) {
  //     sendMessage.reply_markup.remove_keyboard = true;
  //   }
  //
  //   if (buttons.length > 0) {
  //     sendMessage.reply_markup.inline_keyboard = buttons;
  //   }
  //
  //   if (sendMessage.reply_markup) {
  //     sendMessage.reply_markup = JSON.stringify(sendMessage.reply_markup);
  //   }
  //
  //   if (message.reply_to_message_id) {
  //     sendMessage.reply_to_message_id = message.reply_to_message_id;
  //   }
  //
  //   return this.sendRequest('sendMessage', sendMessage);
  // }

  sendMessage (userId, message, params) {
    return this.sendRequest('sendMessage', {
      chat_id: userId,
      text: message,
      ...params
    });
  }

  sendMessages (userId, messages, params) {
    return this.request.fulfillAll(messages.map(message => this.sendMessage(userId, message, params)));
  }

  // forwardMessage (userId, message, params) {
  //   const buttons = this.prepareButtons(message, params);
  //   let sendMessage = {
  //     chat_id: userId,
  //     text: message.text,
  //     caption: message.caption
  //   };
  //   let commandType = '';
  //
  //   if (buttons.length) {
  //     sendMessage.reply_markup = {};
  //     sendMessage.reply_markup.inline_keyboard = buttons;
  //     sendMessage.reply_markup = JSON.stringify(sendMessage.reply_markup);
  //   }
  //
  //   if (params.native) {
  //     let chatId = userId;
  //
  //     if (message && message.chat && message.chat.id) {
  //       chatId = message.chat.id;
  //     }
  //
  //     commandType = 'forwardMessage';
  //     sendMessage = {
  //       chat_id: userId,
  //       from_chat_id: chatId,
  //       message_id: message.message_id
  //     };
  //   } else if (message.audio && message.audio.file_id) {
  //     commandType = 'sendAudio';
  //     sendMessage.audio = message.audio.file_id;
  //   } else if (message.voice && message.voice.file_id) {
  //     commandType = 'sendVoice';
  //     sendMessage.voice = message.voice.file_id;
  //   } else if (message.video_note && message.video_note.file_id) {
  //     commandType = 'sendVideoNote';
  //     sendMessage.video_note = message.video_note.file_id;
  //   } else if (message.document && message.document.file_id) {
  //     commandType = 'sendDocument';
  //     sendMessage.document = message.document.file_id;
  //   } else if (message.photo && message.photo.length > 0) {
  //     commandType = 'sendPhoto';
  //     sendMessage.photo = message.photo[message.photo.length - 1].file_id;
  //   } else {
  //     commandType = 'sendMessage';
  //     sendMessage.text = sendMessage.text || 'Пустое сообщение';
  //   }
  //
  //   return this.sendRequest(commandType, sendMessage);
  // }

  forwardMessage (userId, messageId, fromId) {
    return this.sendRequest('forwardMessage', {
      chat_id: userId,
      from_chat_id: fromId,
      message_id: messageId
    });
  }

  forwardMessages (userId, messages, params) {
    return this.request.fulfillAll(messages.map(message => this.forwardMessage(userId, message, params)));
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
      case 'doc':
        return this.sendDocument(userId, attach, params);
      case 'poll':
        const poll = 'Опрос: *' + attachment.poll.question + '*\n' + (attachment.poll.answers || []).map((answer, index) => {
          return (index + 1) + ') ' + answer.text + ': ' + answer.votes + ' голоса (' + answer.rate + '%)';
        }).join('\n');

        return this.sendMessageWithChatAction(userId, 'typing', poll, params);
      case 'link':
        const link = attachment.link.title + '\n' + attachment.link.url;
        return this.sendMessageWithChatAction(userId, 'typing', link, params);
    }
  }

  sendAttachments (userId, attachments, params) {
    return this.request.fulfillAll(attachments.map(attachment => this.sendAttachment(userId, attachment, params)));
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

  editMessageButtons (message, buttons) {
    if (!message) {
      return;
    }

    if (buttons) {
      message.reply_markup = JSON.stringify({inline_keyboard: buttons});
    } else {
      const newButtons = this.prepareButtons(message);

      message.reply_markup = JSON.stringify({inline_keyboard: newButtons});
    }

    if (message.chat && message.chat.id) {
      message.chat_id = message.chat.id;
    }

    message.text = 'Решение принято';

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

  // sendInvoice (userId, invoice) {
  //   return this.sendRequest('sendInvoice', {
  //     chat_id: userId,
  //     title: invoice.title,
  //     description: invoice.description,
  //     provider_token: config.get('telegram.paymentToken'),
  //     currency: 'RUB',
  //     start_parameter: 'donate',
  //     payload: invoice.payload,
  //     prices: JSON.stringify([
  //       {label: 'Основной взнос', amount: 6000}
  //     ])
  //   });
  // }

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
