import {RequestParams} from "../network";

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

type Audio = {
  type: 'audio',
  audio: string,
  caption: string
}

declare class Telegram {
  sendMessage(userId: number, message: string, params?: AllMessageParams): Promise<Telegram.Message>;

  sendMessages(userId: number, messages: string[], params?: AllMessageParams): Promise<Telegram.Message[]>;

  forwardMessage(userId: number, messageId: number, fromId: number, params?: AllMessageParams): Promise<Telegram.Message>;

  forwardMessages(userId: number, messages: Telegram.Message[] | string[], params?: AllMessageParams): Promise<Telegram.Message>;

  sendAttachment(userId: number, attachment: Telegram.Attachment, params?: AllMessageParams): Promise<Telegram.Message>;

  sendAttachments(userId: number, attachments: Telegram.Attachment[], params?: AllMessageParams): Promise<Telegram.Message[]>;

  sendSticker(userId: number, stickerId: string): Promise<Telegram.Message>;

  sendInvoice(userId: number, invoice: Telegram.Invoice): Promise<Telegram.Message>;

  answerCallbackQuery(userId: number, payload?: Telegram.AnswerCallbackQuery): boolean;

  middleware(req: { body: Telegram.Update }, res: {}, next: Function): void;
}

declare namespace Telegram {
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
    left_chat_member?: User
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

  type Attachment = Photo | Audio | Video
}

type AllMessageParams = Telegram.MessageParams & RequestParams;

export = Telegram;
