import {AxiosError} from 'axios';
import * as config from 'config';
import debugFactory from '../../helpers/debug';
import NetworkModel, {Methods, RequestConfig, RequestParams} from '../network';

const debug = debugFactory('baneks-node:telegram');
const debugError = debugFactory('baneks-node:telegram:error', true);

export enum ParseMode {
  Markdown = 'Markdown',
  HTML = 'HTML'
}

export type User = {
  id: number,
  is_bot: boolean,
  first_name?: string,
  last_name?: string,
  username?: string,
  language_code?: string,
  title?: string
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

/**
 * Describes incoming Telegram message
 */
export type Message = {
  message_id: number,
  from?: User,
  chat: Chat,
  forward_from?: User,
  forward_from_chat?: Chat,
  forward_from_message_id?: number,
  forward_signature?: string,
  forward_date?: number,
  reply_to_message?: Message,
  editt_date?: number,
  media_group_id?: string,
  author_signature?: string,
  text?: string,
  entities?: MessageEntity[],
  caption_entries?: MessageEntity[],
  audio?: Audio,
  document?: Document,
  animation?: Animation,
  game?: Game,
  photo?: PhotoSize[],
  sticker?: Sticker,
  video?: Video,
  voice?: Voice,
  video_note?: VideoNote,
  caption?: string,
  contact?: Contact,
  location?: Location,
  venue?: Venue,
  new_chat_members?: User[],
  left_chat_member?: User,
  new_chat_title?: string,
  new_chat_photo: PhotoSize[],
  delete_chat_photo?: true,
  group_chat_created?: true,
  supergroup_chat_created?: true,
  channel_chat_created?: true,
  migrate_to_chat_id?: number,
  pinned_message?: Message,
  invoice?: Invoice,
  successful_payment?: SuccessfulPayment,
  connected_website?: string,
  passport_data?: PassportData
};

type MessageEntity = {
  type: string,
  offset: number,
  length: number,
  url?: string,
  user?: User
};

type PhotoSize = {
  file_id: string,
  width: number,
  height: number,
  file_size?: number
};

type Audio = {
  file_id: string,
  duration: number,
  performer?: string,
  title?: string,
  mime_type?: string,
  file_size?: number,
  thumb?: PhotoSize
};

type Document = {
  file_id: string,
  thumb?: PhotoSize,
  file_name?: string,
  mime_type?: string,
  file_size?: number
};

type Video = {
  file_id: string,
  width: number,
  height: number,
  duration: number,
  thumb?: PhotoSize,
  mime_type?: string,
  file_size?: number
};

type Animation = {
  file_id: string,
  width: number,
  height: number,
  duration: number,
  thumb?: PhotoSize,
  file_name?: string,
  mime_type?: string,
  file_size?: number
};

type Voice = {
  file_id: string,
  duration: number,
  mime_type?: string,
  file_size?: number
};

type VideoNote = {
  file_id: string,
  length: number,
  duration: number,
  thumb?: PhotoSize,
  file_size?: number
};

type Contact = {
  phone_number: string,
  first_name: string,
  last_name?: string,
  user_id?: number,
  vcard?: string
};

type Location = {
  longitude: number,
  latitude: number
};

type Venue = {
  location: Location,
  title: string,
  address: string,
  foursquare_id?: string,
  foursquare_type?: string
};

type UserProfilePhotos = {
  total_count: string,
  photos: PhotoSize[][]
};

type File = {
  file_id: string,
  file_size?: number,
  file_path?: string
};

export type ReplyKeyboardMarkup = {
  keyboard: KeyboardButton[][],
  resize_keyboard?: boolean,
  one_time_keyboard?: boolean,
  selective?: boolean
};

export type KeyboardButton = {
  text: string,
  request_contact?: boolean,
  request_location?: boolean
};

export type ReplyKeyboardRemove = {
  remove_keyboard: true,
  selective?: true
};

export type InlineKeyboardMarkup = {
  inline_keyboard: InlineKeyboardButton[][]
};

export type InlineKeyboardButton = {
  text: string,
  url?: string,
  callback_data?: string,
  switch_inline_query?: string,
  switch_inline_query_current_chat?: string,
  callback_game?: CallbackGame,
  pay?: boolean
};

export type CallbackQuery = {
  id: string,
  from: User,
  message?: Message,
  inline_message_id?: string,
  chat_instance: string,
  data?: string,
  game_short_name?: string
};

export type ForceReply = {
  force_reply: true,
  selective?: true
};

type ChatPhoto = {
  small_file_id: string,
  big_file_id: string
};

type ChatMember = {
  user: User,
  status: 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked',
  until_date?: number,
  can_be_edited?: boolean,
  can_change_info?: boolean,
  can_post_messages?: boolean,
  can_edit_messages?: boolean,
  can_delete_messages?: boolean,
  can_invite_users?: boolean,
  can_restrict_members?: boolean,
  can_pin_messages?: boolean,
  can_promote_members?: boolean,
  can_send_messages?: boolean,
  can_send_media_messages?: boolean,
  can_send_other_messages?: boolean,
  can_add_web_page_previews?: boolean
};

type ResponseParameters = {
  migrate_to_chat_id?: number,
  retry_after?: number
};

interface InputMedia {
  type: string;
  media: string;
  caption?: string;
  parse_mode?: ParseMode;
}

export interface InputMediaPhoto extends InputMedia {
  type: 'photo';
}

interface InputMediaVideo extends InputMedia {
  type: 'video';
  thumb?: InputFile | string;
  width?: number;
  height?: number;
  duration?: number;
  supports_streaming?: boolean;
}

interface InputMediaAnimation extends InputMedia {
  type: 'animation';
  thumb?: InputFile | string;
  width?: number;
  height?: number;
  duration?: number;
}

interface InputMediaAudio extends InputMedia {
  type: 'audio';
  thumb?: InputFile | string;
  duration?: number;
  performer?: string;
  title?: string;
}

interface InputMediaDocument extends InputMedia {
  type: 'document';
  thumb?: InputFile | string;
}

type InputFile = ReadableStream;

type TextAttachment = {
  type: 'text',
  text: string
};

type Game = {
  title: string,
  description: string,
  photo: PhotoSize[],
  text?: string,
  text_entities?: MessageEntity[],
  animation?: Animation
};

type CallbackGame = void;

type Sticker = {
  file_id: string,
  width: number,
  height: number,
  thumb?: PhotoSize,
  emoji?: string,
  set_name?: string,
  mask_position?: MaskPosition,
  file_size?: number
};

type StickerSet = {
  name: string,
  title: string,
  contains_masks: boolean,
  stickers: Sticker[]
};

type MaskPosition = {
  point: 'forehead' | 'eyes' | 'mouth' | 'chin',
  x_shift: number,
  y_shift: number,
  scale: number
};

type PassportData = {
  data: EncryptedPassportElement[],
  credentials: EncryptedCredentials
};

type PassportFile = {
  file_id: string,
  file_size: number,
  file_date: number
};

type EncryptedPassportElement = {
  type: 'personal_details'
      | 'passport'
      | 'driving_licence'
      | 'identity_card'
      | 'internal_passport'
      | 'address'
      | 'utility_bill'
      | 'bank_statement'
      | 'rental_agreement'
      | 'passport_registration'
      | 'temporary_registration'
      | 'phone_number'
      | 'email',
  data?: string,
  phone_number?: string,
  email?: string,
  files?: PassportFile[],
  front_side?: PassportFile,
  reverse_side?: PassportFile,
  selfie?: PassportFile,
  translation?: PassportFile[],
  hash?: string
};

type EncryptedCredentials = {
  data: string,
  hash: string,
  secret: string
};

export type MediaGroup = InputMediaPhoto[] | InputMediaVideo[];

export type PreCheckoutQuery = {
  id: string,
  from: User,
  currency: string,
  total_amount: number,
  invoice_payload: string,
  shipping_option_id?: string,
  order_info?: OrderInfo
};

type OrderInfo = {
  name?: string,
  phone_number?: string,
  email?: string
};

export type ReplyMarkup = InlineKeyboardMarkup | ReplyKeyboardMarkup | ReplyKeyboardRemove | ForceReply;

export type SuccessfulPayment = {
  currency: string,
  total_amount: number,
  invoice_payload: string,
  order_info?: OrderInfo,
  telegram_payment_charge_id: string,
  provider_payment_charge_id: string
};

export type InlineQuery = {
  id: string,
  from: User,
  location?: Location,
  query: string,
  offset?: string
};

interface InlineQueryResult {
  type: string;
  id: string;
  input_message_content: InputMessageContent;
  title?: string;
  caption?: string;
  parse_mode?: ParseMode;
  reply_markup?: ReplyMarkup;
}

export interface InlineQueryResultArticle extends InlineQueryResult {
  type: 'article';
  url?: string;
  hide_url?: string;
  description?: string;
  thumb_url?: string;
  thumb_width?: number;
  thumb_height?: number;
}

interface InlineQueryResultPhoto extends InlineQueryResult {
  type: 'photo';
  description?: string;
  photo_url: string;
  thumb_url: string;
  photo_width?: number;
  photo_height?: number;
}

interface InlineQueryResultGif extends InlineQueryResult {
  gif_url: string;
  gif_width?: number;
  gif_height?: number;
  gif_duration?: number;
  thumb_url: string;
}

type InputMessageContent = {
  message_text: string,
  parse_mode?: ParseMode,
  disable_web_page_preview?: boolean
};

type Invoice = {
  title: string,
  description?: string,
  start_parameter: string,
  currency: string,
  total_amount: string,
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

export type MessageParams = {
  caption?: string,
  chat_id?: number,
  remove_keyboard?: boolean,
  reply_to_message_id?: number,
  disable_notification?: boolean
  parse_mode?: ParseMode,
  reply_markup?: string,
  disable_web_page_preview?: boolean
};

export type OtherParams = {
  disableComments?: boolean,
  forcePlaceholder?: boolean,
  native?: boolean,
  language?: string,
  needApprove?: boolean,
  analysis?: boolean,
  admin?: boolean,
  editor?: boolean,
  keyboard?: boolean,
  suggest?: boolean,
  buttons?: InlineKeyboardMarkup,
  forceAttachments?: boolean,
  disableAttachments?: boolean,
  disableButtons?: boolean,
};

type InvoiceParams = {
  title: string,
  description: string,
  payload: string,
  start_parameter: string,
  currency: string,
  prices: string,
  provider_data?: string,
  photo_url?: string,
  photo_size?: number,
  photo_width?: number,
  photo_height?: number,
  need_name?: boolean,
  need_phone_number?: boolean,
  need_email?: boolean,
  need_shipping_address?: boolean,
  send_phone_number_to_provider?: boolean,
  send_email_to_provider?: boolean,
  is_flexible?: boolean,
  disable_notification?: boolean,
  reply_to_message_id?: number,
  reply_markup?: string
};

export type LabeledPrice = {
  label: string,
  amount: number
};

export type AllMessageParams =  MessageParams & RequestParams & OtherParams;

export type TelegramError = {
  ok: false,
  error_code: number,
  description: string,
  parameters?: {
    retry_after?: number
  }
};

export enum ChatAction {
  typing = 'typing',
  uploadPhoto = 'upload_photo',
  uploadVideo = 'upload_video',
  uploadAudio = 'upload_audio',
  uploadDocument = 'upload_document'
}

export type AdminRights = {
  can_change_info?: boolean,
  can_post_messages?: boolean,
  can_edit_messages?: boolean,
  can_delete_messages?: boolean,
  can_invite_users?: boolean,
  can_restrict_members?: boolean,
  can_pin_messages?: boolean,
  can_promote_members?: boolean
};

class Telegram extends NetworkModel {
  public endpoint: string = `${config.get('telegram.url')}${config.get('telegram.token')}`;
  public individualRule: string = config.get('telegram.rules.individualMessage');
  public groupRule: string = config.get('telegram.rules.groupMessage');

  public getMe(): Promise<Message> {
    return this.sendRequest('getMe');
  }

  public async sendMessage(userId: number | string , message: string, params?: AllMessageParams): Promise<Message> {
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
          .then((returnedMessages: Message[]) => returnedMessages[0]);
    }

    debug('Sending message', userId, message, params);

    return this.sendRequest('sendMessage', {
      chat_id: userId,
      text: message,
      ...params
    });
  }

  public forwardMessage(userId: number | string, messageId: number, fromId: number, params?: AllMessageParams): Promise<Message> {
    debug('Forwarding message', userId, messageId, fromId);

    return this.sendRequest('forwardMessage', {
      chat_id: userId,
      from_chat_id: fromId,
      message_id: messageId,
      ...params
    });
  }

  public async sendPhoto(userId: number | string, photo: string | ReadableStream, params?: AllMessageParams): Promise<Message> {
    this.sendChatAction(userId, ChatAction.uploadPhoto);

    return this.sendRequest('sendPhoto', {
      _stream: typeof photo !== 'string',
      chat_id: userId,
      photo,
      ...params
    });
  }

  public async sendAudio(userId: number | string, audio: string, params?: AllMessageParams & {title?: string, performer?: string}): Promise<Message> {
    this.sendChatAction(userId, ChatAction.uploadAudio);

    return this.sendRequest('sendAudio', {
      audio,
      chat_id: userId,
      ...params
    });
  }

  public async sendDocument(userId: number | string, document: string | ReadableStream, params?: AllMessageParams): Promise<Message> {
    this.sendChatAction(userId, ChatAction.uploadDocument);

    return this.sendRequest('sendDocument', {
      _stream: typeof document !== 'string',
      chat_id: userId,
      document,
      ...params
    });
  }

  public async sendVideo(userId: number | string, video: string, params?: AllMessageParams): Promise<Message> {
    this.sendChatAction(userId, ChatAction.uploadVideo);

    return this.sendRequest('sendVideo', {
      chat_id: userId,
      video,
      ...params
    });
  }

  public sendChatAction(userId: number | string, action: ChatAction): Promise<boolean> {
    debug('Sending chat action', userId, action);

    return this.sendRequest('sendChatAction', {
      action,
      chat_id: userId
    });
  }

  public async editMessageText(chatId: number | string, messageId: number, text: string, params?: AllMessageParams): Promise<Message> {
    debug('Editing message text', chatId, messageId, text, params);

    return this.sendRequest('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      ...params
    });
  }

  public async editMessageReplyMarkup(chatId: number | string, messageId: number, ...markup: ReplyMarkup[]): Promise<boolean> {
    debug('Editing message markup', chatId, messageId, markup);

    return this.sendRequest('editMessageReplyMarkup', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: this.prepareReplyMarkup.apply(this, markup)
    })
        .catch((error: Error) => {
          debugError('Editing message markup error', error);

          return false;
        });
  }

  public deleteMessage(chatId: number | string, messageId: number): Promise<boolean> {
    if (!chatId) {
      throw new Error('Chat id is not specified');
    }

    if (!messageId) {
      throw new Error('Message id is not specified');
    }

    return this.sendRequest('deleteMessage', {
      chat_id: chatId,
      message_id: messageId
    });
  }

  public sendSticker(userId: number, stickerId: string, params?: AllMessageParams): Promise<Message> {
    if (!userId) {
      throw new Error('No user specified!');
    }

    if (!stickerId) {
      throw new Error('No sticker specified!');
    }

    debug('Sending sticker', userId, stickerId);

    return this.sendRequest('sendSticker', {
      chat_id: userId,
      sticker: stickerId,
      ...params
    });
  }

  public answerInlineQuery(inlineId: string, results: any[], nextOffset = 0): Promise<boolean> {
    return this.sendRequest('answerInlineQuery', {
      _key: inlineId,
      _rule: config.get('telegram.rules.inlineQuery'),
      cache_time: 0,
      inline_query_id: inlineId,
      next_offset: String(nextOffset),
      results: JSON.stringify(results)
    });
  }

  public sendInvoice(userId: number, invoice: InvoiceParams): Promise<Message> {
    debug('Sending invoice', userId, invoice);

    return this.sendRequest('sendInvoice', {
      chat_id: userId,
      provider_token: config.get('telegram.paymentToken'),
      ...invoice
    });
  }

  public async answerPreCheckoutQuery(preCheckoutQueryId: string, ok: boolean = true, error?: string) {
    if (!preCheckoutQueryId) {
      throw new Error('PreCheckoutQuery id is missing');
    }

    return this.sendRequest('answerPreCheckoutQuery', {
      error_message: error,
      ok,
      pre_checkout_query_id: preCheckoutQueryId
    });
  }

  public promoteChatMember(chatId: number | string, userId: number, rights: AdminRights, params?: AllMessageParams) {
    return this.sendRequest('promoteChatMember', {
      chat_id: chatId,
      user_id: userId,
      ...rights,
      ...params
    });
  }

  public prepareInlineKeyboard(buttons: InlineKeyboardButton[][]): InlineKeyboardMarkup {
    return {inline_keyboard: buttons};
  }

  public prepareReplyKeyboard(buttons: KeyboardButton[][], resize: boolean = false, oneTime: boolean = false): ReplyKeyboardMarkup {
    return {keyboard: buttons, resize_keyboard: resize, one_time_keyboard: oneTime};
  }

  public prepareRemoveKeyboard(): ReplyKeyboardRemove {
    return {remove_keyboard: true};
  }

  public prepareReplyMarkup(...args: ReplyMarkup[]): string {
    return JSON.stringify(args.reduce((acc: ReplyMarkup, arg: ReplyMarkup) => Object.assign(acc, arg), {}));
  }

  public sendMessages(userId: number | string, messages: string[] = [], params?: AllMessageParams): Promise<Message[]> {
    return this.fulfillAll(messages.map((message: string) => this.sendMessage(userId, message, params)));
  }

  public async sendMediaGroup(userId: number | string, mediaGroup: MediaGroup = [], params?: AllMessageParams): Promise<Message> {
    debug('Sending media group', userId, mediaGroup, params);

    return this.sendRequest('sendMediaGroup', {
      chat_id: userId,
      media: JSON.stringify(mediaGroup),
      ...params
    });
  }

  public getWebhookInfo(): Promise<Message> {
    return this.sendRequest('getWebhookInfo');
  }

  public async answerCallbackQuery(queryId: string, payload?: AnswerCallbackQuery): Promise<Message> {
    debug('Answering callback query', queryId, payload);

    if (!queryId) {
      throw new Error('Callback query id is not specified');
    }

    return this.sendRequest('answerCallbackQuery', {
      _key: Number(queryId),
      _rule: config.get('telegram.rules.callbackQuery'),
      callback_query_id: queryId,
      ...payload
    })
      .catch((error: Error) => {
        debugError(error);

        return {};
      });
  }

  protected sendRequest(request: string, params: AllMessageParams | {} = {}, method: Methods = Methods.POST) {
    const axiosConfig: RequestConfig = {
      method,
      url: `${this.endpoint}/${request}`
    };

    const requestParams: AllMessageParams = Object.assign({
      _getRetry: (error: AxiosError): number => error.response.data.parameters.retry_after
    }, params);

    if (!requestParams._key) {
      requestParams._key = String(requestParams.chat_id);
    }

    if (!requestParams._rule) {
      requestParams._rule = Number(requestParams._key) > 0 ? this.individualRule : this.groupRule;
    }

    return this.makeRequest(axiosConfig, requestParams).then((response: any) => response ? response.result : {});
  }
}

export default Telegram;
