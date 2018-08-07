// @flow
export type User = {
  id: number,
  is_bot: boolean,
  first_name?: string,
  last_name?: string,
  username?: string,
  language_code?: string
}

declare type Chat = {
  id: number,
  type: string,
  title?: string,
  username?: string,
  first_name?: string,
  last_name?: string,
  all_members_are_administrators?: boolean,
  language_code?: string
}

declare type OrderInfo = {
  name?: string,
  phone_number?: string,
  email?: string
}

export type PreCheckoutQuery = {
  id: string,
  from: User,
  currency: string,
  total_amount: number,
  invoice_payload: string,
  shipping_option_id?: string,
  order_info?: OrderInfo
}

declare type InlineKeyboardButton = {
  text: string,
  url?: string,
  callback_data?: string,
  switch_inline_query?: string,
  switch_inline_query_current_chat?: string,
  pay?: string
}

declare type InlineKeyboardMarkup = InlineKeyboardButton[][];

declare type SuccessfulPayment = {
  currency: string,
  total_amount: number,
  invoice_payload: string,
  order_info?: OrderInfo,
  telegram_payment_charge_id: string,
  provider_payment_charge_id: string
}

export type Message = {
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

export type InlineQuery = {
  id: string,
  from: User,
  query: string,
  offset: string
}

export type CallbackQuery = {
  id: string,
  from: User,
  message?: Message,
  inline_message_id?: string,
  chat_instance: string,
  data: string
}

declare type Invoice = {
  title: string,
  description: string,
  payload: string
}

declare type AnswerCallbackQuery = {
  text: string,
  show_alert: boolean,
  url: string
}

export type Update = {
  update_id: number,
  message?: Message,
  edited_message?: Message,
  channel_post?: Message,
  edited_channel_post?: Message,
  inline_query?: InlineQuery,
  callback_query?: CallbackQuery,
  pre_checkout_query?: PreCheckoutQuery
}

declare type MessageParams = {
  buttons?: InlineKeyboardMarkup,
  disableComments?: boolean,
  forceAttachments?: boolean,
  admin?: boolean,
  editor?: boolean,
  suggest?: boolean,
  disableComments?: boolean
}

declare type Photo = {
  type: 'photo',
  photo: string,
  caption: string,
  parse_mode: 'markdown' | 'html'
}

declare type Audio = {
  type: 'audio',
  audio: string,
  caption: string
}

export type Attachment = Photo | Audio

declare export default class Telegram {
  prepareButtons(message: Message, params?: MessageParams): InlineKeyboardMarkup;
  sendMessage(userId: number, message: Message | string, params?: MessageParams): Promise<Message>;
  sendMessages(userId: number, message: Message[] | string[], params?: MessageParams): Promise<Message>;
  forwardMessage(userId: number, message: Message | string, params?: MessageParams): Promise<Message>;
  forwardMessages(userId: number, messages: Message[] | string[], params?: MessageParams): Promise<Message>;
  sendAttachment(userId: number, attachment: Attachment, params?: MessageParams): Promise<Message>;
  sendSticker(userId: number, stickerId: string): Promise<Message>;
  sendInvoice(userId: number, invoice: Invoice): Promise<Message>;
  sendMessageToAdmin(text: string): Promise<Message>;
  answerCallbackQuery(userId: number, payload?: AnswerCallbackQuery): boolean;
  middleware(req: {body: ?Update}, res: {}, next: Function): void;
}
