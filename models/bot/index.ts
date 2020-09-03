import * as config from 'config';
import {NextFunction, Response} from 'express';
import {cloneDeep} from 'lodash';
import {bot, IBotRequest} from '../../botApi';
import debugFactory from '../../helpers/debug';
import {translate} from '../../helpers/dictionary';
import Menu, {Row} from '../../helpers/menu';
import {IAnek, ISuggest, IUser} from "../../helpers/mongo";

import Telegram, {
  AllMessageParams,
  CallbackQuery,
  ChatAction,
  InlineKeyboardButton,
  InlineQuery,
  InputMediaPhoto,
  MediaGroup,
  Message,
  MessageParams,
  OtherParams,
  Poll,
  PollAnswer as TelegramPollAnswer,
  PreCheckoutQuery,
  SuccessfulPayment,
  Update,
  User,
  UserId
} from '../telegram';
import Vk, {Attachment as VkAttachment, Comment, PollAnswer as VkPollAnswer} from '../vk';

type SuggestMessage = {
  caption: string,
  chat_id: UserId,
  text: string,
  photo?: string,
  video?: string,
  audio?: string,
  video_note?: string,
  document?: string,
  voice?: string,
  reply_markup?: string
};

const debug = debugFactory('baneks-node:bot');

interface IBot extends Telegram {
  on(event: string, callback: (...params: any) => void | Promise<void>): void | Promise<void>;
  on(event: 'update', callback: (update: Update, user: IUser, chat: IUser) => void): void | Promise<void>;
  on(event: 'message' | 'feedback', callback: (message: Message, user: IUser) => void): void | Promise<void>;
  on(event: 'inlineQuery', callback: (inlineQuery: InlineQuery, user: IUser) => void): void | Promise<void>;
  on(event: 'preCheckoutQuery', callback: (preCheckoutQuery: PreCheckoutQuery, user: IUser) => void): void | Promise<void>;
  on(event: 'successfulPayment', callback: (successfulPayment: SuccessfulPayment, user: IUser) => void): void | Promise<void>;
  on(event: 'newChatMembers', callback: (members: User[], message: Message, user: IUser) => void): void | Promise<void>;
  on(event: 'leftChatMember', callback: (member: User, message: Message, user: IUser) => void): void | Promise<void>;
  on(event: 'suggest', callback: (suggest: Message, user: IUser) => void): void | Promise<void>;
  on(event: 'reply', callback: (reply: Message, message: Message, user: IUser) => void): void | Promise<void>;
  on(event: 'poll', callback: (poll: Poll, user: IUser) => void): void | Promise<void>;
  on(event: 'pollAnswer', callback: (pollAnswer: TelegramPollAnswer, user: IUser) => void): void | Promise<void>;
}

class Bot extends Telegram implements IBot {
  private buttons: string[] = [];

  public onCommand(command: string, callback: (command: string[], message: Message, user: IUser) => any | Promise<any>) {
    return this.on('command:' + command, callback);
  }

  public onCallbackQuery(callbackQuery: string, callback: (args: string[], callbackQuery: CallbackQuery, user: IUser) => void) {
    return this.on('callbackQuery:' + callbackQuery, callback);
  }

  public onButton(button: string, callback: (message: Message, user: IUser) => any | Promise<any>) {
    if (this.buttons.indexOf(button) <= 0) {
      this.buttons.push(button);
    }

    return this.on('button:' + button, callback);
  }

  public getUserInfo(user: IUser): string {
    if (!user || !user.user_id) {
      return 'Invalid user';
    }

    if (user.username) {
      return '@' + user.username;
    }

    if (user.first_name && user.last_name) {
      return user.first_name + ' ' + user.last_name + ' (' + user.user_id + ')';
    } else if (user.first_name) {
      return user.first_name + ' (' + user.user_id + ')';
    } else if (user.last_name) {
      return user.last_name + ' (' + user.user_id + ')';
    }

    if (user.title) {
      return user.title;
    }

    return String(user.user_id);
  }

  public convertTextLinks(text: string = '') {
    const userRegexp = /\[(.+)\|(.+)]/g;

    return text.replace(userRegexp, (match, p1, p2) => `[${p2}](https://vk.com/${p1})`);
  }

  public async sendAttachment(userId: UserId, attachment: VkAttachment, params?: AllMessageParams): Promise<Message> {
    switch (attachment.type) {
      case 'photo':
        const photo = attachment.photo.photo_2560
          || attachment.photo.photo_1280
          || attachment.photo.photo_604
          || attachment.photo.photo_130
          || attachment.photo.photo_75;

        return this.sendPhoto(userId, photo, {caption: attachment.text, ...params});
      case 'video':
        const caption = (attachment.title || '') + '\nhttps://vk.com/video' + attachment.video.owner_id + '_' + attachment.video.id;
        const video = attachment.video.photo_800
          || attachment.video.photo_640
          || attachment.video.photo_320
          || attachment.video.photo_130;

        return this.sendPhoto(userId, video, {caption, ...params});
      case 'doc':
        const document = attachment.doc.url;

        return this.sendDocument(userId, document, {caption: attachment.doc.title, ...params});
      case 'audio':
        const audio = attachment.audio.url;

        return this.sendAudio(userId, audio, {
          performer: attachment.audio.artist,
          title: attachment.audio.title,
          ...params
        });
      case 'poll':
        const poll = 'Опрос: *' + attachment.poll.question + '*\n' + (attachment.poll.answers || [])
          .map((answer: VkPollAnswer, index: number) => (index + 1) + ') ' + answer.text + ': ' + answer.votes + ' голоса (' + answer.rate + '%)')
          .join('\n');

        return this.sendMessageWithChatAction(userId, ChatAction.typing, poll, params);
      case 'link':
        const link = attachment.link.title + '\n' + attachment.link.url;

        return this.sendMessageWithChatAction(userId, ChatAction.typing, link, params);
    }
  }

  public async sendAttachments(userId: UserId, attachments: VkAttachment[] = [], params?: AllMessageParams): Promise<Message | Message[]> {
    const mediaGroup: MediaGroup = attachments
      .filter((attachment: VkAttachment) => attachment.type === 'photo')
      .map((attachment: VkAttachment): InputMediaPhoto => ({
        caption: attachment.text,
        media: attachment.photo.photo_2560
          || attachment.photo.photo_1280
          || attachment.photo.photo_604
          || attachment.photo.photo_130
          || attachment.photo.photo_75,
        type: 'photo'
      }));

    if (mediaGroup.length === attachments.length && (mediaGroup.length >= 2 && mediaGroup.length <= 10)) {
      return this.sendMediaGroup(userId, mediaGroup, params);
    }

    return this.fulfillAll(attachments
      .filter(Boolean)
      .map((attachment: VkAttachment) => this.sendAttachment(userId, attachment, params)));
  }

  public getAnekButtons(anek: IAnek, params: OtherParams = {}): InlineKeyboardButton[][] {
    const buttons: Menu = new Menu();

    const {disableComments, language, forceAttachments, admin, editor, disableAttachments, disableStandardButtons} = params;

    if (!disableStandardButtons) {
      if (anek.from_id && anek.post_id) {
        const commentsRow = buttons.addRow();

        commentsRow.addButton({
          text: translate(language, 'go_to_anek'),
          url: Vk.getAnekLink(anek.post_id, anek.from_id)
        });

        if (!disableComments) {
          commentsRow.addButton({
            callback_data: 'comment ' + anek.post_id,
            text: translate(language, 'comments')
          });
        }
      }

      if (anek.attachments && anek.attachments.length > 0 && !forceAttachments && !disableAttachments) {
        buttons.addRow()
          .addButton(this.createButton(translate(language, 'attachments'), 'attach ' + anek.post_id));
      }
    }

    if (anek.post_id) {
      if (admin || editor) {
        const adminButtons = buttons.addRow();

        if (anek.spam) {
          adminButtons.addButton(this.createButton('✅', 'unspam ' + anek.post_id));
        } else {
          adminButtons.addButton(this.createButton('🚫', 'spam ' + anek.post_id));
        }

        adminButtons.addButton(this.createButton('🔍', 'analysis ' + anek.post_id));
      }
    }

    return buttons;
  }

  public createApproveButtons(approveId: string, pros: number = 0, cons: number = 0): InlineKeyboardButton[] {
    return new Row()
      .addButton(this.createButton('👍 ' + pros, 'a_a ' + approveId))
      .addButton(this.createButton('👎 ' + cons, 'a_d ' + approveId));
  }

  public prepareApproveInlineKeyboard(approveId: string, anek: IAnek, user: IUser | null, pros = 0, cons = 0) {
    return this.prepareInlineKeyboard(this.getAnekButtons(anek, {editor: user ? user.editor : false, disableStandardButtons: true}).concat([
      this.createApproveButtons(approveId, pros, cons)
    ]));
  }

  public async sendAnek(userId: UserId, anek: IAnek, params: AllMessageParams = {}): Promise<Message> {
    const immutableAnek = anek.toObject ? anek.toObject() : cloneDeep(anek);

    const buttons: InlineKeyboardButton[][] = this.getAnekButtons(immutableAnek, params);

    if (immutableAnek.copy_history && immutableAnek.copy_history.length && immutableAnek.post_id) {
      const insideMessage = immutableAnek.copy_history[0];

      insideMessage.post_id = immutableAnek.post_id;
      insideMessage.from_id = immutableAnek.from_id;
      insideMessage.text = immutableAnek.text + (immutableAnek.text.length ? '\n' : '') + insideMessage.text;

      if (immutableAnek.attachments && immutableAnek.attachments.length) {
        if (!insideMessage.attachments || !insideMessage.attachments.length) {
          insideMessage.attachments = [];
        }

        insideMessage.attachments = insideMessage.attachments.concat(immutableAnek.attachments);
      }

      return this.sendAnek(userId, insideMessage, params);
    }

    if (immutableAnek.attachments && immutableAnek.attachments.length > 0 && !params.forceAttachments && !params.disableAttachments) {
      immutableAnek.text += '\n(Вложений: ' + immutableAnek.attachments.length + ')';
    }

    const replyMarkup: string = this.prepareReplyMarkup(this.prepareInlineKeyboard(buttons));

    return this.sendMessage(userId, this.convertTextLinks(immutableAnek.text), {
      reply_markup: replyMarkup,
      ...params
    })
      .then((message: any) => {
        if (immutableAnek.attachments && params.forceAttachments) {
          this.sendAttachments(userId, immutableAnek.attachments, {
            forcePlaceholder: !immutableAnek.text,
            reply_markup: replyMarkup,
            ...params
          });
        }

        return message;
      });
  }

  public async sendAneks(userId: UserId, aneks: IAnek[], params: AllMessageParams = {}) {
    return this.fulfillAll(aneks.map((anek) => this.sendAnek(userId, anek, params)));
  }

  public async sendComment(userId: UserId, comment: Comment, params: MessageParams): Promise<Message> {
    return this.sendMessage(userId, this.convertTextLinks(comment.text), params)
      .then((message: any) => {
        if (comment.attachments && comment.attachments.length) {
          return this.sendAttachments(userId, comment.attachments, {forceAttachments: true});
        }

        return message;
      });
  }

  public async sendComments(userId: UserId, comments: Comment[] = [], params: AllMessageParams): Promise<Message[]> {
    return this.fulfillAll(comments.map((comment) => this.sendComment(userId, comment, params)));
  }

  public async sendSuggest(userId: UserId, suggest: ISuggest, params?: AllMessageParams): Promise<Message> {
    const menu: Menu = new Menu();

    const sendMessage: SuggestMessage = {
      caption: suggest.caption,
      chat_id: userId,
      text: suggest.text
    };
    let commandType = '';

    if (params.native) {
      let chatId = userId;

      if (suggest && suggest.chat && suggest.chat.id) {
        chatId = suggest.chat.id;
      }

      return this.forwardMessage(userId, suggest.message_id, chatId);
    }

    if (params.suggest) {
      const row = menu.addRow();

      if (params.editor) {
        if (suggest.public) {
          row.addButton(this.createButton('+', 's_a ' + suggest._id));
        }

        row.addButton(this.createButton('Анон', 's_aa ' + suggest._id));
        row.addButton(this.createButton('-', 's_d ' + suggest._id));
      } else {
        row.addButton(this.createButton('Удалить', 's_d ' + suggest._id));
      }
    }

    if (menu.length) {
      sendMessage.reply_markup = this.prepareReplyMarkup(this.prepareInlineKeyboard(menu));
    }

    if (suggest.audio && suggest.audio.file_id) {
      commandType = 'sendAudio';
      sendMessage.audio = suggest.audio.file_id;
    } else if (suggest.voice && suggest.voice.file_id) {
      commandType = 'sendVoice';
      sendMessage.voice = suggest.voice.file_id;
    } else if (suggest.video_note && suggest.video_note.file_id) {
      commandType = 'sendVideoNote';
      sendMessage.video_note = suggest.video_note.file_id;
    } else if (suggest.document && suggest.document.file_id) {
      commandType = 'sendDocument';
      sendMessage.document = suggest.document.file_id;
    } else if (suggest.photo && suggest.photo.length > 0) {
      commandType = 'sendPhoto';
      sendMessage.photo = suggest.photo[suggest.photo.length - 1].file_id;
    } else {
      commandType = 'sendMessage';
      sendMessage.text = sendMessage.text || 'Пустое сообщение';
    }

    return this.sendRequest(commandType, sendMessage);
  }

  public async sendSuggests(userId: UserId, suggests: ISuggest[], params: AllMessageParams): Promise<Message[]> {
    return this.fulfillAll(suggests.map((suggest: ISuggest) => this.sendSuggest(userId, suggest, params)));
  }

  public async sendMediaGroup(userId: UserId, mediaGroup: MediaGroup = [], params?: AllMessageParams): Promise<Message> {
    if (params.forcePlaceholder) {
      await this.sendMessage(userId, 'Вложений: ' + mediaGroup.length, params);
    }

    this.sendChatAction(userId, ChatAction.uploadPhoto);

    return super.sendMediaGroup(userId, mediaGroup, params);
  }

  public async sendApproveAneks(users: IUser[], anek: IAnek, approveId: string): Promise<Message[]> {
    return this.fulfillAll(users.map((user) => this.sendAnek(user.user_id, anek, {
      reply_markup: bot.prepareReplyMarkup(bot.prepareApproveInlineKeyboard(approveId, anek, user))
    })));
  }

  public forwardMessageToChannel(message: ISuggest, params: AllMessageParams) {
    if (!config.get('telegram.baneksChannel')) {
      return;
    }
    return this.sendSuggest(config.get('telegram.baneksChannel'), message, params);
  }

  public sendMessageToAdmin(text: string) {
    return this.sendMessage(config.get('telegram.adminChat'), text);
  }

  /**
   * Simple check to verify that we are in private messages. Returns false if bot was called from groups
   * @param {Message} message Incoming message
   * @returns {boolean} whether we are in PM or in chat
   */
  public isSameChat(message: Message): boolean {
    return message && message.chat && message.from && message.chat.id === message.from.id;
  }

  public isGroup(message: Message): boolean {
    return !this.isSameChat(message);
  }

  public performInlineQuery(inlineQuery: InlineQuery, user: IUser) {
    debug('Performing inline query from ' + this.getUserInfo(user));
    return this.emit('inlineQuery', inlineQuery, user);
  }

  public performCallbackQuery(callbackQuery: CallbackQuery, user: IUser) {
    debug('Performing callback query from ' + this.getUserInfo(user));
    const {data = ''} = callbackQuery;
    const queryData = data.split(' ');

    return this.emit('callbackQuery:' + queryData[0], queryData, callbackQuery, user);
  }

  public performMessage(message: Message, user: IUser) {
    debug('Performing message from ' + this.getUserInfo(user));
    return this.emit('message', message, user);
  }

  public performCommand(command: string[], message: Message, user: IUser) {
    debug('Performing command from ' + this.getUserInfo(user));
    return this.emit('command:' + command[0].slice(1), command, message, user);
  }

  public performPreCheckoutQuery(preCheckoutQuery: PreCheckoutQuery, user: IUser) {
    debug('Performing pre checkout query from ' + this.getUserInfo(user));
    return this.emit('preCheckoutQuery', preCheckoutQuery, user);
  }

  public performSuccessfulPayment(successfulPayment: SuccessfulPayment, user: IUser) {
    debug('Performing successful payment from ' + this.getUserInfo(user));
    return this.emit('successfulPayment', successfulPayment, user);
  }

  public performPoll(poll: Poll, user: IUser) {
    return this.emit('poll', poll, user);
  }

  public performPollAnswer(pollAnswer: TelegramPollAnswer, user: IUser) {
    return this.emit('pollAnswer', pollAnswer, user);
  }

  public performNewChatMembers(members: User[], message: Message, user: IUser) {
    return this.emit('newChatMembers', members, message, user);
  }

  public performLeftChatMember(member: User, message: Message, user: IUser) {
    return this.emit('leftChatMember', member, message, user);
  }

  public performSuggest(suggest: Message, user: IUser) {
    return this.emit('suggest', suggest, user);
  }

  public performReply(reply: Message, message: Message, user: IUser) {
    return this.emit('reply', reply, message, user);
  }

  public performFeedback(message: Message, user: IUser) {
    return this.emit('feedback', message, user);
  }

  public performButton(button: string, message: Message, user: IUser) {
    debug('Performing button ' + button + ' from ' + this.getUserInfo(user));
    return this.emit('button:' + button, message, user);
  }

  public async performUpdate(update: Update, user: IUser, chat: IUser) {
    const {message} = update;

    if (message) {
      if (message.successful_payment) {
        return this.performSuccessfulPayment(message.successful_payment, user);
      }

      if (message.new_chat_members) {
        return this.performNewChatMembers(message.new_chat_members, message, user);
      }

      if (message.left_chat_member) {
        return this.performLeftChatMember(message.left_chat_member, message, user);
      }

      if (user.suggest_mode && !user.banned) {
        return this.performSuggest(message, user);
      }

      if (message.reply_to_message) {
        return this.performReply(message.reply_to_message, message, user);
      }

      if (message.text) {
        const {text} = message;

        if (text && text.startsWith('/')) {
          const command = text.split(' ');
          const firstPart = command[0];

          if (firstPart) {
            const botName = firstPart.split('@');

            if (botName.length === 1 || (botName.length === 2 && botName[1] === config.get('telegram.botName'))) {
              if (this.isGroup(message) && chat.disable_commands && !user.admin) {
                return [];
              }

              return this.performCommand([botName[0], ...command.slice(1)], update.message, user);
            }
          }
        }

        if (message.text.length > 0) {
          const button = message.text.slice(0, 2);

          if (this.buttons.indexOf(button) >= 0) {
            return this.performButton(button, message, user);
          }
        }

        if (user.feedback_mode && !user.banned && this.isSameChat(message)) {
          return this.performFeedback(message, user);
        }

        return this.performMessage(update.message, user);
      }

      throw new Error('Unknown message: ' + JSON.stringify(update));
    }

    if (update.inline_query) {
      return this.performInlineQuery(update.inline_query, user);
    }

    if (update.callback_query) {
      return this.performCallbackQuery(update.callback_query, user);
    }

    if (update.pre_checkout_query) {
      return this.performPreCheckoutQuery(update.pre_checkout_query, user);
    }

    if (update.poll) {
      return this.performPoll(update.poll, user);
    }

    if (update.poll_answer) {
      return this.performPollAnswer(update.poll_answer, user);
    }

    return [];
  }

  public middleware = async (req: IBotRequest, res: Response, next: NextFunction) => {
    const update = req.body;

    if (!update) {
      next(new Error('No webhook data specified'));

      return;
    }

    const {user, chat} = req;

    this.emit('update', update, user);

    req.update = update;

    try {
      const results = await this.performUpdate(update, user, chat);

      req.results = results || [];

      next();
    } catch (error) {
      next(error);
    }
  }
}

export default Bot;
