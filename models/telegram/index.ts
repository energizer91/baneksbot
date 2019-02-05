import * as debugFactory from 'debug';
import * as config from 'config';
import NetworkModel, {RequestConfig, RequestParams} from '../network';
import {AxiosError} from 'axios';

const debug = debugFactory('baneks-node:telegram');
const debugError = debugFactory('baneks-node:telegram:error');

type Photo = {
  type: 'photo',
  photo: string,
  caption: string,
  parse_mode: 'markdown' | 'html'
}

type Video = {
  type: 'video',
  photo: string,
  caption: string
}

type Document = {
  type: 'document',
  photo: string,
  caption: string
}

type Poll = {
  type: 'poll',
  text: string
}

type Link = {
  type: 'link',
  text: string
}

type Audio = {
  type: 'audio',
  audio: string,
  caption: string
}

type InputMediaPhoto = {
  type: 'photo',
  media: string,
  caption: string
}

type MediaGroup = InputMediaPhoto[];

type MediaGroupParams = {
  forcePlaceholder?: boolean
}

type User = {
  id: number,
  is_bot: boolean,
  first_name?: string,
  last_name?: string,
  username?: string,
  language_code?: string
}

type PreCheckoutQuery = {
  id: string,
  from: User,
  currency: string,
  total_amount: number,
  invoice_payload: string,
  shipping_option_id?: string,
  order_info?: OrderInfo
}

type Chat = {
  id: number,
  type: string,
  title?: string,
  username?: string,
  first_name?: string,
  last_name?: string,
  all_members_are_administrators?: boolean,
  language_code?: string
}

type OrderInfo = {
  name?: string,
  phone_number?: string,
  email?: string
}

type InlineKeyboardButton = {
  text: string,
  url?: string,
  callback_data?: string,
  switch_inline_query?: string,
  switch_inline_query_current_chat?: string,
  pay?: string
}

type InlineKeyboardMarkup = InlineKeyboardButton[][];

type SuccessfulPayment = {
  currency: string,
  total_amount: number,
  invoice_payload: string,
  order_info?: OrderInfo,
  telegram_payment_charge_id: string,
  provider_payment_charge_id: string
}

// describes incoming Telegram message
type Message = {
  message_id: number,
  from?: User,
  chat?: Chat,
  forward_from?: User,
  forward_from_char?: Chat,
  reply_to_message?: Message,
  successful_payment?: SuccessfulPayment,
  new_chat_member?: User,
  left_chat_member?: User,
  reply_markup?: string,
  chat_id?: number
}

type InlineQuery = {
  id: string,
  from: User,
  query: string,
  offset: string
}

type CallbackQuery = {
  id: string,
  from: User,
  message?: Message,
  inline_message_id?: string,
  chat_instance: string,
  data: string
}

type Invoice = {
  title: string,
  description?: string,
  payload: string,
  prices?: string
}

type AnswerCallbackQuery = {
  text: string,
  show_alert?: boolean,
  url?: string
}

type Update = {
  update_id: number,
  message?: Message,
  edited_message?: Message,
  channel_post?: Message,
  edited_channel_post?: Message,
  inline_query?: InlineQuery,
  callback_query?: CallbackQuery,
  pre_checkout_query?: PreCheckoutQuery
}

type TelegramParams = {
  chat_id?: number
}

type MessageParams = {
  parse_mode?: 'Markdown' | 'HTML',
  buttons?: InlineKeyboardMarkup,
  forceAttachments?: boolean,
  admin?: boolean,
  editor?: boolean,
  suggest?: boolean,
  disableComments?: boolean,
  reply_markup?: string,
  native?: boolean
}

type AllMessageParams = TelegramParams & MessageParams & RequestParams;

enum ChatAction {
  typing = 'typing',
  uploadPhoto = 'upload_photo',
  uploadVideo = 'upload_video',
  uploadAudio = 'upload_audio',
  uploadDocument = 'upload_document'
}

type Attachment = Photo | Audio | Video | Poll | Link | Document

class Telegram extends NetworkModel {
  endpoint: string = `${config.get('telegram.url')}${config.get('telegram.token')}`;
  individualRule: string = config.get('telegram.rules.individualMessage');
  groupRule: string = config.get('telegram.rules.groupMessage');

  sendRequest (request: string, params: AllMessageParams | {} = {}, method: string = 'POST') {
    const axiosConfig: RequestConfig = {
      url: `${this.endpoint}/${request}`,
      method: method.toLowerCase()
    };

    const requestParams: AllMessageParams = Object.assign({
      _getBackoff: (error: AxiosError): number => error.response.data.parameters.retry_after
    }, params);

    if (!requestParams._key) {
      requestParams._key = String(requestParams.chat_id);
    }

    if (!requestParams._rule) {
      requestParams._rule = Number(requestParams._key) > 0 ? this.individualRule : this.groupRule;
    }

    return this.makeRequest(axiosConfig, requestParams).then((response: any) => response ? response.result : {});
  }

  sendInline (inlineId: string, results: [], nextOffset = 0): Promise<Message> {
    return this.sendRequest('answerInlineQuery', {
      inline_query_id: inlineId,
      results: JSON.stringify(results),
      next_offset: String(nextOffset),
      cache_time: 0,
      _key: inlineId,
      _rule: config.get('telegram.rules.inlineQuery')
    });
  }

  prepareInlineKeyboard (buttons: InlineKeyboardButton[]): string {
    return JSON.stringify({ inline_keyboard: buttons });
  }

  async sendMessage (userId: number, message: string, params: AllMessageParams): Promise<Message | Message[] | null> {
    if (!message) {
      return Promise.resolve(null);
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

  sendMessages (userId: number, messages: string[] = [], params: AllMessageParams): Promise<Message[]> {
    return this.fulfillAll(messages.map((message: string) => this.sendMessage(userId, message, params)));
  }

  forwardMessage (userId: number, messageId: number, fromId: number, params = {}): Promise<Message> {
    debug('Forwarding message', userId, messageId, fromId);

    return this.sendRequest('forwardMessage', {
      chat_id: userId,
      from_chat_id: fromId,
      message_id: messageId,
      ...params
    });
  }

  async sendPhoto (userId: number, photo: Photo, params = {}): Promise<Message> {
    this.sendChatAction(userId, ChatAction.uploadPhoto);

    return this.sendRequest('sendPhoto', {
      chat_id: userId,
      ...photo,
      ...params
    });
  }

  async sendAudio (userId: number, audio: Audio, params = {}): Promise<Message> {
    this.sendChatAction(userId, ChatAction.uploadAudio);

    return this.sendRequest('sendAudio', {
      chat_id: userId,
      ...audio,
      ...params
    });
  }

  async sendVideo (userId: number, video: Video, params = {}): Promise<Message> {
    this.sendChatAction(userId, ChatAction.uploadVideo);

    return this.sendRequest('sendPhoto', {
      chat_id: userId,
      ...video,
      ...params
    });
  }

  async sendDocument (userId: number, document: Document, params = {}): Promise<Message> {
    this.sendChatAction(userId, ChatAction.uploadDocument);

    return this.sendRequest('sendDocument', {
      chat_id: userId,
      ...document,
      ...params
    });
  }

  async sendMediaGroup (userId: number, mediaGroup: MediaGroup, params: AllMessageParams & MediaGroupParams): Promise<Message | {}> {
    if (!mediaGroup.length) {
      return {};
    }

    if (params.forcePlaceholder) {
      await this.sendMessage(userId, 'Вложений: ' + mediaGroup.length, params);
    }

    this.sendChatAction(userId, ChatAction.uploadPhoto);

    debug('Sending media group', userId, mediaGroup, params);

    return this.sendRequest('sendMediaGroup', {
      chat_id: userId,
      media: JSON.stringify(mediaGroup),
      ...params
    });
  }

  async sendMessageWithChatAction (userId: number, chatAction: ChatAction, message: string, params: AllMessageParams): Promise<Message | {}> {
    this.sendChatAction(userId, chatAction);

    return this.sendMessage(userId, message, params);
  }

  async sendAttachment (userId: number, attachment: Attachment, params: AllMessageParams) {
    debug('Sending attachment', userId, attachment, params);

    switch (attachment.type) {
      case 'photo':
        return this.sendPhoto(userId, attachment, params);
      case 'audio':
        return this.sendAudio(userId, attachment, params);
      case 'video':
        return this.sendVideo(userId, attachment, params);
      case 'document':
        return this.sendDocument(userId, attachment, params);
      case 'poll':
      case 'link':
        return this.sendMessageWithChatAction(userId, ChatAction.typing, attachment.text, params);
      default:
        debug('Unknown attachment', attachment);

        return {};
    }
  }

  async sendAttachments (userId: number, attachments: Attachment[] = [], params: AllMessageParams): Promise<Message[] | {}> {
    if (!attachments.length) {
      return [];
    }

    const mediaGroup: MediaGroup = attachments
      .filter((attachment: Attachment) => attachment.type === 'photo')
      .map((attachment: Photo): InputMediaPhoto => ({
        type: attachment.type,
        media: attachment.photo,
        caption: attachment.caption
      }));

    if (mediaGroup.length === attachments.length && (mediaGroup.length >= 2 && mediaGroup.length <= 10)) {
      return this.sendMediaGroup(userId, mediaGroup, params);
    }

    return this.fulfillAll(attachments.map(attachment => this.sendAttachment(userId, attachment, params)));
  }

  sendSticker (userId: number, stickerId: number) {
    if (!userId) {
      throw new Error('No user specified!');
    }

    if (!stickerId) {
      throw new Error('No sticker specified!');
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

  answerCallbackQuery (queryId: number, payload?: AnswerCallbackQuery) {
    debug('Answering callback query', queryId, payload);

    if (!payload) {
      return Promise.resolve({});
    }

    return this.sendRequest('answerCallbackQuery', {
      callback_query_id: queryId,
      text: payload.text,
      show_alert: payload.show_alert,
      url: payload.url,
      _key: Number(queryId),
      _rule: config.get('telegram.rules.callbackQuery')
    })
      .catch((error: Error) => {
        debugError(error);

        return {};
      });
  }

  editMessageText (chatId: number, messageId: number, text: string, params = {}) {
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

  editMessageButtons (message: Message, buttons: InlineKeyboardButton[] = []) {
    if (!message) {
      return;
    }

    message.reply_markup = this.prepareInlineKeyboard(buttons);

    debug('Editing message buttons', message, buttons);

    return this.sendRequest('editMessageReplyMarkup', {
      chat_id: message.chat && message.chat.id,
      message
    })
      .catch((error: Error) => {
        debugError('Editing message error', error);

        return message;
      });
  }

  sendChatAction (userId: number, action: ChatAction) {
    debug('Sending chat action', userId, action);

    return this.sendRequest('sendChatAction', {
      chat_id: userId,
      action
    });
  }

  sendInvoice (userId: number, invoice: Invoice) {
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
