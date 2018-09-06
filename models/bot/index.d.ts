import Vk = require('../vk');
import Database = require('../../helpers/mongo');
import Telegram = require('../telegram');

type Callback = (this: void, command: string[], message: Telegram.Message, user: Database.IUser) => Promise<any> | any;

declare class Bot extends Telegram {
    sendMessageToAdmin(text: string): Promise<Telegram.Message>;

    convertAttachment(attachment: Vk.Attachment): Telegram.Attachment;

    convertAttachments(attachments: Vk.Attachment[]): Telegram.Attachment[];

    onCommand(command: string, callback: Callback): void;

    performMessage(message: Telegram.Message, user: Database.IUser): Promise<any[]>;

    performInlineQuery(inlineQuery: Telegram.InlineQuery, user: Database.IUser): Promise<any[]>;

    performCallbackQuery(callbackQuery: Telegram.CallbackQuery, user: Database.IUser): Promise<any[]>;

    performPreCheckoutQuery(preCheckoutQuery: Telegram.PreCheckoutQuery, user: Database.IUser): Promise<any[]>;

    performCommand(command: string[], message: Telegram.Message, user: Database.IUser): Promise<any[]>;

    performUpdate(update: Telegram.Update, user: Database.IUser): Promise<any[]>;
}

export = Bot;
