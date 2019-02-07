import * as config from 'config';
import {NextFunction, Response} from 'express';
import {cloneDeep} from 'lodash';
import {IBotRequest} from '../../botApi';
import debugFactory from '../../helpers/debug';
import {translate} from '../../helpers/dictionary';
import {IAnek, ISuggest, IUser} from "../../helpers/mongo";
import {Callback} from '../events';
import Telegram, {
  AllMessageParams,
  Attachment as TelegramAttachment,
  CallbackQuery,
  InlineKeyboardMarkup,
  InlineQuery,
  Message,
  MessageParams,
  PreCheckoutQuery,
  SuccessfulPayment,
  Update,
  User
} from '../telegram';
import {
  Anek,
  Attachment as VkAttachment,
  Comment,
  PollAnswer
} from '../vk';

type SuggestMessage = {
  caption: string,
  chat_id: number,
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

class Bot extends Telegram {
  public onCommand(command: string, callback: Callback) {
    this.on('command:' + command, callback);
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

  public convertAttachment(attachment: VkAttachment): TelegramAttachment {
    switch (attachment.type) {
      case 'photo':
        return {
          caption: attachment.text,
          photo: attachment.photo.photo_2560
              || attachment.photo.photo_1280
              || attachment.photo.photo_604
              || attachment.photo.photo_130
              || attachment.photo.photo_75,
          type: 'photo'
        };
      case 'video':
        return {
          caption: (attachment.title || '') + '\nhttps://vk.com/video' + attachment.video.owner_id + '_' + attachment.video.id,
          photo: attachment.video.photo_800
              || attachment.video.photo_640
              || attachment.video.photo_320
              || attachment.video.photo_130,
          type: 'video'
        };
      case 'doc':
        return {
          caption: attachment.doc.title,
          document: attachment.doc.url,
          type: 'document'
        };
      case 'audio':
        return {
          audio: attachment.audio.url,
          title: attachment.audio.artist + ' - ' + attachment.audio.title,
          type: 'audio'
        };
      case 'poll':
        return {
          text: 'Опрос: *' + attachment.poll.question + '*\n' + (attachment.poll.answers || [])
            .map((answer: PollAnswer, index: number) => (index + 1) + ') ' + answer.text + ': ' + answer.votes + ' голоса (' + answer.rate + '%)')
            .join('\n'),
          type: 'poll'
        };
      case 'link':
        return {
          text: attachment.link.title + '\n' + attachment.link.url,
          type: 'link'
        };
    }
  }

  public convertAttachments(attachments: VkAttachment[] = []): TelegramAttachment[] {
    return attachments
      .filter((attachment: VkAttachment | void) => attachment)
      .map((attachment: VkAttachment) => this.convertAttachment(attachment));
  }

  public getAnekButtons(anek: IAnek, params: MessageParams): InlineKeyboardMarkup {
    const buttons = [];

    const {disableComments, language, forceAttachments, admin, disableAttachments} = params;

    if (anek.from_id && anek.post_id) {
      buttons.push([]);
      buttons[buttons.length - 1].push({
        text: translate(language, 'go_to_anek'),
        url: 'https://vk.com/wall' + anek.from_id + '_' + anek.post_id
      });

      if (!disableComments) {
        buttons[buttons.length - 1].push({
          callback_data: 'comment ' + anek.post_id,
          text: translate(language, 'comments')
        });
      }
    }

    if (anek.attachments && anek.attachments.length > 0 && !forceAttachments) {
      if (!disableAttachments) {
        buttons.push([]);
        buttons[buttons.length - 1].push({
          callback_data: 'attach ' + anek.post_id,
          text: translate(language, 'attachments')
        });

        anek.text += '\n(Вложений: ' + anek.attachments.length + ')';
      }
    }

    if (anek.post_id) {
      if (admin && anek.spam) {
        buttons.push([]);
        buttons[buttons.length - 1].push({
          callback_data: 'unspam ' + anek.post_id,
          text: 'Ne spam'
        });
      } else if (admin && !anek.spam) {
        buttons.push([]);
        buttons[buttons.length - 1].push({
          callback_data: 'spam ' + anek.post_id,
          text: 'Spam'
        });
      }
    }

    return buttons;
  }

  public async sendAnek(userId: number, anek: IAnek | Anek, params: MessageParams = {}): Promise<Message | Message[] | void> {
    if (!anek) {
      return;
    }

    const immutableAnek: IAnek = cloneDeep((anek as IAnek).toObject ? (anek as IAnek).toObject() : anek);

    const buttons: InlineKeyboardMarkup = this.getAnekButtons(immutableAnek, params);

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

    const replyMarkup = this.prepareInlineKeyboard(buttons);

    return this.sendMessage(userId, this.convertTextLinks(immutableAnek.text), {
      reply_markup: replyMarkup,
      ...params
    })
      .then((message: any) => {
        if (immutableAnek.attachments && params.forceAttachments) {
          const attachments = this.convertAttachments(immutableAnek.attachments);

          return this.sendAttachments(userId, attachments, {
            forcePlaceholder: !immutableAnek.text,
            reply_markup: replyMarkup,
            ...params
          });
        }

        return message;
      });
  }

  public sendComment(userId: number, comment: Comment, params: MessageParams) {
    const attachments = this.convertAttachments(comment.attachments || []);

    return this.sendMessage(userId, this.convertTextLinks(comment.text), params)
      .then((message: any) => {
        if (attachments.length) {
          return this.sendAttachments(userId, attachments, {forceAttachments: true});
        }

        return message;
      });
  }

  public sendComments(userId: number, comments: Comment[] = [], params: AllMessageParams) {
    return this.fulfillAll(comments.map((comment) => this.sendComment(userId, comment, params)));
  }

  public sendSuggest(userId: number, suggest: ISuggest, params: MessageParams) {
    const buttons: InlineKeyboardMarkup = [];

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
      buttons.push([]);
      if (params.editor) {
        if (suggest.public) {
          buttons[buttons.length - 1].push({
            callback_data: 's_a ' + suggest._id,
            text: '+'
          });
        }
        buttons[buttons.length - 1].push({
          callback_data: 's_aa ' + suggest._id,
          text: 'Анон'
        });
        buttons[buttons.length - 1].push({
          callback_data: 's_d ' + suggest._id,
          text: '-'
        });
      } else {
        buttons[buttons.length - 1].push({
          callback_data: 's_d ' + suggest._id,
          text: 'Удалить'
        });
      }
    }

    if (buttons.length) {
      sendMessage.reply_markup = this.prepareInlineKeyboard(buttons);
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

  public sendSuggests(userId: number, suggests: ISuggest[], params: MessageParams) {
    return this.fulfillAll(suggests.map((suggest: ISuggest) => this.sendSuggest(userId, suggest, params)));
  }

  public forwardMessageToChannel(message: ISuggest, params: MessageParams) {
    if (!config.get('telegram.baneksChannel')) {
      return;
    }
    return this.sendSuggest(config.get('telegram.baneksChannel'), message, params);
  }

  public sendMessageToAdmin(text: string) {
    return this.sendMessage(config.get('telegram.adminChat'), text);
  }

  public performInlineQuery(inlineQuery: InlineQuery, user: IUser) {
    debug('Performing inline query from ' + this.getUserInfo(user));
    return this.emit('inlineQuery', inlineQuery, user);
  }

  public performCallbackQuery(callbackQuery: CallbackQuery, user: IUser) {
    debug('Performing callback query from ' + this.getUserInfo(user));
    return this.emit('callbackQuery', callbackQuery, user);
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

  public performNewChatMember(member: User, user: IUser) {
    return this.emit('newChatMember', member, user);
  }

  public performLeftChatMember(member: User, user: IUser) {
    return this.emit('leftChatMember', member, user);
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

  public performUpdate(update: Update, user: IUser) {
    if (!update) {
      throw new Error('No webhook data specified');
    }

    const {message} = update;

    if (message) {
      if (message.successful_payment) {
        return this.performSuccessfulPayment(message.successful_payment, user);
      }

      if (message.new_chat_member) {
        return this.performNewChatMember(message.new_chat_member, user);
      }

      if (message.left_chat_member) {
        return this.performLeftChatMember(message.left_chat_member, user);
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
              return this.performCommand([botName[0], ...command.slice(1)], update.message, user);
            }
          }
        }

        if (user.feedback_mode && !user.banned) {
          return this.performFeedback(message, user);
        }

        return this.performMessage(update.message, user);
      }

      throw new Error('Unknown message');
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

    return Promise.resolve([]);
  }

  public middleware = (req: IBotRequest, res: Response, next: NextFunction) => {
    const update = req.body;

    if (!update) {
      next(new Error('No webhook data specified'));

      return;
    }

    const {user} = req;

    this.emit('update', update, user);

    req.update = update;

    this.performUpdate(update, user)
      .then((results) => {
        req.results = results;

        next();
      })
      .catch(next);
  }
}

export default Bot;
