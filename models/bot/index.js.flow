// @flow
import type Telegram, {Update, User, Message, InlineQuery, CallbackQuery, PreCheckoutQuery, Attachment as TelegramAttachment} from '../telegram';
import type Vk, {Attachment as VkAttachment} from '../vk';

type Callback = (command: string[], message: Message, user: User) => void

declare export default class Bot {
  telegram: Telegram;
  vk: Vk;
  convertAttachment(attachment: VkAttachment): TelegramAttachment;
  convertAttachments(attachments: VkAttachment[]): TelegramAttachment[];
  onCommand(command: string, callback: Callback): void;
  performMessage(message: Message, user: User): void;
  performInlineQuery(inlineQuery: InlineQuery, user: User): void;
  performCallbackQuery(callbackQuery: CallbackQuery, user: User): void;
  performPreCheckoutQuery(preCheckoutQuery: PreCheckoutQuery, user: User): void;
  performCommand(command: string[], message: Message, user: User): void;
  performUpdate(update: Update, user: User): void;
}
