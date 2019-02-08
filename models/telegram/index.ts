import {AxiosError} from 'axios';
import * as config from 'config';
import debugFactory from '../../helpers/debug';
import NetworkModel, {Methods, RequestConfig, RequestParams} from '../network';

const debug = debugFactory('baneks-node:telegram');
const debugError = debugFactory('baneks-node:telegram:error', true);

type Photo = {
  type: 'photo',
  photo: string,
  caption: string,
  parse_mode?: 'markdown' | 'html'
};

type Video = {
  type: 'video',
  photo: string,
  caption: string
};

type Document = {
  type: 'document',
  document: string,
  caption?: string
};

type Poll = {
  type: 'poll',
  text: string
};

type Link = {
  type: 'link',
  text: string
};

type Audio = {
  type: 'audio',
  title: string,
  audio: string
};

type InputMediaPhoto = {
  type: 'photo',
  media: string,
  caption: string
};

type MediaGroup = InputMediaPhoto[];

type MediaGroupParams = {
  forcePlaceholder?: boolean
};

export type User = {
  id: number,
  is_bot: boolean,
  first_name?: string,
  last_name?: string,
  username?: string,
  language_code?: string,
  title?: string
};

export type PreCheckoutQuery = {
  id: string,
  from: User,
  currency: string,
  total_amount: number,
  invoice_payload: string,
  shipping_option_id?: string,
  order_info?: OrderInfo
};

export type Chat = {
  id: number,
  type: string,
  title?: string,
  username?: string,
  first_name?: string,
  last_name?: string,
  all_members_are_administrators?: boolean,
  language_code?: string
};

type OrderInfo = {
  name?: string,
  phone_number?: string,
  email?: string
};

export type InlineKeyboardButton = {
  text: string,
  url?: string,
  callback_data?: string,
  switch_inline_query?: string,
  switch_inline_query_current_chat?: string,
  pay?: string
};

export type KeyboardButton = {
  text: string,
  request_contact?: boolean,
  request_location?: boolean
};

export type InlineKeyboardMarkup = {
  inline_keyboard: InlineKeyboardButton[][]
};

export type ReplyKeyboardMarkup = {
  keyboard: KeyboardButton[][],
  resize_keyboard?: boolean,
  one_time_keyboard?: boolean,
  selective?: boolean
};

export type RemoveReplyKeyboard = {
  remove_keyboard: true,
  selective?: true
};

export type ForceReply = {
  force_reply: true,
  selective?: true
};

export type ReplyMarkup = InlineKeyboardMarkup | ReplyKeyboardMarkup | RemoveReplyKeyboard | ForceReply;

export type SuccessfulPayment = {
  currency: string,
  total_amount: number,
  invoice_payload: string,
  order_info?: OrderInfo,
  telegram_payment_charge_id: string,
  provider_payment_charge_id: string
};

// describes incoming Telegram message
export type Message = {
  caption?: string,
  message_id?: number,
  from?: User,
  chat?: Chat,
  forward_from?: User,
  forward_from_char?: Chat,
  reply_to_message?: Message,
  successful_payment?: SuccessfulPayment,
  new_chat_member?: User,
  left_chat_member?: User,
  reply_markup?: string,
  chat_id?: number,
  text?: string,
  audio?: Audio,
  photo?: Photo,
  video?: Video
};

export type InlineQuery = {
  id: string,
  from: User,
  query: string,
  offset: string
};

export type CallbackQuery = {
  id: string,
  from: User,
  message?: Message,
  inline_message_id?: string,
  chat_instance: string,
  data: string
};

type Invoice = {
  title: string,
  description?: string,
  payload: string,
  prices?: string
};

type AnswerCallbackQuery = {
  text: string,
  show_alert?: boolean,
  url?: string
};

export type Update = {
  update_id: number,
  message?: Message,
  edited_message?: Message,
  channel_post?: Message,
  edited_channel_post?: Message,
  inline_query?: InlineQuery,
  callback_query?: CallbackQuery,
  pre_checkout_query?: PreCheckoutQuery
};

type TelegramParams = {
  chat_id?: number,
  keyboard?: boolean,
  remove_keyboard?: boolean,
  disable_web_page_preview?: boolean,
  reply_to_message_id?: number
};

export type MessageParams = {
  parse_mode?: 'Markdown' | 'HTML',
  buttons?: InlineKeyboardMarkup,
  forceAttachments?: boolean,
  disableAttachments?: boolean,
  disableButtons?: boolean,
  admin?: boolean,
  editor?: boolean,
  keyboard?: boolean,
  suggest?: boolean,
  disableComments?: boolean,
  forcePlaceholder?: boolean,
  reply_markup?: string,
  native?: boolean,
  language?: string,
  needApprove?: boolean
};

export type AllMessageParams = TelegramParams & MessageParams & RequestParams;

export type TelegramError = {
  ok: false,
  error_code: number,
  description: string,
  parameters?: {
    retry_after?: number
  }
};

enum ChatAction {
  typing = 'typing',
  uploadPhoto = 'upload_photo',
  uploadVideo = 'upload_video',
  uploadAudio = 'upload_audio',
  uploadDocument = 'upload_document'
}

export type Attachment = Photo | Audio | Video | Poll | Link | Document;

class Telegram extends NetworkModel {
  public endpoint: string = `${config.get('telegram.url')}${config.get('telegram.token')}`;
  public individualRule: string = config.get('telegram.rules.individualMessage');
  public groupRule: string = config.get('telegram.rules.groupMessage');

  public sendRequest(request: string, params: AllMessageParams | {} = {}, method: Methods = Methods.POST) {
    const axiosConfig: RequestConfig = {
      method,
      url: `${this.endpoint}/${request}`
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

  public sendInline(inlineId: string, results: any[], nextOffset = 0): Promise<boolean> {
    return this.sendRequest('answerInlineQuery', {
      _key: inlineId,
      _rule: config.get('telegram.rules.inlineQuery'),
      cache_time: 0,
      inline_query_id: inlineId,
      next_offset: String(nextOffset),
      results: JSON.stringify(results)
    });
  }

  public prepareInlineKeyboard(buttons: InlineKeyboardButton[][]): InlineKeyboardMarkup {
    return {inline_keyboard: buttons};
  }

  public prepareReplyKeyboard(buttons: KeyboardButton[][], resize: boolean = false, oneTime: boolean = false): ReplyKeyboardMarkup {
    return {keyboard: buttons, resize_keyboard: resize, one_time_keyboard: oneTime};
  }

  public prepareRemoveKeyboard(): RemoveReplyKeyboard {
    return {remove_keyboard: true};
  }

  public prepareReplyMarkup(...args: ReplyMarkup[]): string {
    return JSON.stringify(args.reduce((acc: ReplyMarkup, arg: ReplyMarkup) => Object.assign(acc, arg), {}));
  }

  public async sendMessage(userId: number, message: string, params?: AllMessageParams): Promise<Message> {
    if (!message) {
      return;
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

      return this.sendMessages(userId, messages, params)
          .then((returnedMessages: Message[]) => returnedMessages[returnedMessages.length - 1]);
    }

    debug('Sending message', userId, message, params);

    return this.sendRequest('sendMessage', {
      chat_id: userId,
      text: message,
      ...params
    });
  }

  public sendMessages(userId: number, messages: string[] = [], params?: AllMessageParams): Promise<Message[]> {
    return this.fulfillAll(messages.map((message: string) => this.sendMessage(userId, message, params)));
  }

  public forwardMessage(userId: number, messageId: number, fromId: number, params?: AllMessageParams): Promise<Message> {
    debug('Forwarding message', userId, messageId, fromId);

    return this.sendRequest('forwardMessage', {
      chat_id: userId,
      from_chat_id: fromId,
      message_id: messageId,
      ...params
    });
  }

  public async sendPhoto(userId: number, photo: Photo, params?: AllMessageParams): Promise<Message> {
    this.sendChatAction(userId, ChatAction.uploadPhoto);

    return this.sendRequest('sendPhoto', {
      chat_id: userId,
      ...photo,
      ...params
    });
  }

  public async sendAudio(userId: number, audio: Audio, params?: AllMessageParams): Promise<Message> {
    this.sendChatAction(userId, ChatAction.uploadAudio);

    return this.sendRequest('sendAudio', {
      chat_id: userId,
      ...audio,
      ...params
    });
  }

  public async sendVideo(userId: number, video: Video, params?: AllMessageParams): Promise<Message> {
    this.sendChatAction(userId, ChatAction.uploadVideo);

    return this.sendRequest('sendPhoto', {
      chat_id: userId,
      ...video,
      ...params
    });
  }

  public async sendDocument(userId: number, document: Document, params?: AllMessageParams): Promise<Message> {
    this.sendChatAction(userId, ChatAction.uploadDocument);

    return this.sendRequest('sendDocument', {
      chat_id: userId,
      ...document,
      ...params
    });
  }

  public async sendMediaGroup(
    userId: number,
    mediaGroup: MediaGroup,
    params?: AllMessageParams & MediaGroupParams
  ): Promise<Message> {
    if (!mediaGroup.length) {
      return;
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

  public async sendMessageWithChatAction(
    userId: number,
    chatAction: ChatAction,
    message: string,
    params?: AllMessageParams
  ): Promise<Message> {
    this.sendChatAction(userId, chatAction);

    return this.sendMessage(userId, message, params);
  }

  public async sendAttachment(
    userId: number,
    attachment: Attachment,
    params?: AllMessageParams
  ): Promise<Message> {
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
    }
  }

  public async sendAttachments(
    userId: number,
    attachments: Attachment[] = [],
    params?: AllMessageParams
  ): Promise<Message | Message[]> {
    if (!attachments.length) {
      return;
    }

    const mediaGroup: MediaGroup = attachments
      .filter((attachment: Attachment) => attachment.type === 'photo')
      .map((attachment: Photo): InputMediaPhoto => ({
        caption: attachment.caption,
        media: attachment.photo,
        type: attachment.type
      }));

    if (mediaGroup.length === attachments.length && (mediaGroup.length >= 2 && mediaGroup.length <= 10)) {
      return this.sendMediaGroup(userId, mediaGroup, params);
    }

    return this.fulfillAll(attachments.map((attachment: Attachment) =>
      this.sendAttachment(userId, attachment, params))
    );
  }

  public sendSticker(userId: number, stickerId: string) {
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

  public getMe() {
    return this.sendRequest('getMe');
  }

  public getWebhookInfo() {
    return this.sendRequest('getWebhookInfo');
  }

  public async answerCallbackQuery(queryId: string, payload?: AnswerCallbackQuery): Promise<Message | void> {
    debug('Answering callback query', queryId, payload);

    if (!payload) {
      return;
    }

    return this.sendRequest('answerCallbackQuery', {
      _key: Number(queryId),
      _rule: config.get('telegram.rules.callbackQuery'),
      callback_query_id: queryId,
      show_alert: payload.show_alert,
      text: payload.text,
      url: payload.url
    })
      .catch((error: Error) => {
        debugError(error);

        return {};
      });
  }

  public async editMessageText(
    chatId: number,
    messageId: number,
    text: string,
    params?: AllMessageParams
  ): Promise<Message | void> {
    if (!text || !messageId) {
      return;
    }

    debug('Editing message text', chatId, messageId, text, params);

    return this.sendRequest('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      ...params
    });
  }

  public async editMessageButtons(message: Message, buttons: InlineKeyboardButton[][] = []): Promise<boolean> {
    if (!message) {
      return;
    }

    debug('Editing message buttons', message, buttons);

    return this.sendRequest('editMessageReplyMarkup', {
      chat_id: message.chat && message.chat.id,
      message_id: message.message_id,
      reply_markup: this.prepareInlineKeyboard(buttons)
    })
      .catch((error: Error) => {
        debugError('Editing message error', error);

        return false;
      });
  }

  public sendChatAction(userId: number, action: ChatAction): Promise<boolean> {
    debug('Sending chat action', userId, action);

    return this.sendRequest('sendChatAction', {
      action,
      chat_id: userId
    });
  }

  public sendInvoice(userId: number, invoice: Invoice): Promise<Message> {
    debug('Sending invoice', userId, invoice);

    return this.sendRequest('sendInvoice', {
      chat_id: userId,
      currency: 'RUB',
      provider_token: config.get('telegram.paymentToken'),
      start_parameter: 'donate',
      ...invoice
    });
  }
}

export default Telegram;
