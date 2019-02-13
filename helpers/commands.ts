import axios from 'axios';
import * as config from 'config';
import * as botApi from '../botApi';
import {UpdaterMessageActions, UpdaterMessageTypes} from "../daemons/types";
import inspect from '../helpers/inspections';
import {StatisticsData} from "../models/statistics";
import {
  AllMessageParams,
  CallbackQuery,
  InlineQueryResultArticle,
  LabeledPrice,
  Message,
  ParseMode
} from "../models/telegram";
import {Comment, MultipleResponse} from "../models/vk";
import * as common from './common';
import debugFactory from './debug';
import {languageExists, translate} from './dictionary';
import {IAnek, IAnekModel, IUser} from './mongo';

const debugError = debugFactory('baneks-node:commands:error', true);

let debugTimer: NodeJS.Timeout;

function generateUserInfo(user: IUser) {
  return '```\n' +
    'User ' + user.user_id + ':\n' +
    'Имя:        ' + (user.first_name || 'Не указано') + '\n' +
    'Фамилия:    ' + (user.last_name || 'Не указано') + '\n' +
    'Ник:        ' + (user.username || 'Не указано') + '\n' +
    'Подписка:   ' + (user.subscribed ? 'Подписан' : 'Не подписан') + '\n' +
    'Фидбэк:     ' + (user.feedback_mode ? 'Включен' : 'Выключен') + '\n' +
    'Админ:      ' + (user.admin ? 'Присвоен' : 'Не присвоен') + '\n' +
    'Редактор:   ' + (user.editor ? 'Присвоен' : 'Не присвоен') + '\n' +
    'Бан:        ' + (user.banned ? 'Забанен' : 'Не забанен') + '\n' +
    'Язык:       ' + (user.language || 'Не выбран') + '\n' +
    'Клавиатура: ' + (user.keyboard ? 'Включена' : 'Выключена') + '\n' +
    'Платформа:  ' + (user.client || 'Не выбрана') + '```';
}

function generateStatistics(interval: string, stats: StatisticsData) {
  return '```\n' +
    'Статистика за ' + interval + ':\n' +
    'Пользователи\n' +
    'Всего:                  ' + stats.users.count + '\n' +
    'Новых:                  ' + stats.users.new + '\n' +
    'Подписанных:            ' + stats.users.subscribed + '\n' +
    'Новых подп.:            ' + stats.users.newly_subscribed + '\n' +
    'Отписанных:             ' + stats.users.unsubscribed + '\n' +
    'Анеки\n' +
    'Всего:                  ' + stats.aneks.count + '\n' +
    'Новых:                  ' + stats.aneks.new + '\n' +
    'Сообщения\n' +
    'Всего:                  ' + stats.messages.received + '```';
}

function generateDebug() {
  return '```\n' +
    'time: ' + new Date() + '\n' +
    'queue length: ' + botApi.bot.queue.totalLength + '\n' +
    '```';
}

const getDonatePrices = (): LabeledPrice[] => ([
  {
    amount: 6000,
    label: 'Основной взнос'
  },
  {
    amount: 15000,
    label: 'Чтоб покушать вкутна'
  },
  {
    amount: 30000,
    label: 'kayf хафка'
  }
]);

async function acceptSuggest(queryData: string[], callbackQuery: CallbackQuery, anonymous: boolean) {
  const suggest = await botApi.database.Suggest.findOneAndUpdate({_id: botApi.database.Suggest.convertId(queryData[1])}, {approved: true});

  await botApi.bot.editMessageReplyMarkup(callbackQuery.from.id, callbackQuery.message.message_id, botApi.bot.prepareInlineKeyboard([]));

  const sendMessage = await botApi.bot.forwardMessageToChannel(suggest, {native: !anonymous});

  await botApi.bot.sendMessage(callbackQuery.message.chat.id, 'Предложение одобрено.');

  const foundUser = await botApi.database.User.findOne({_id: suggest.user});

  if (sendMessage.ok && sendMessage.result) {
    return botApi.bot.sendSuggest(foundUser.user_id, sendMessage.result, {native: true});
  }
}

const shlyapaAnswers = [
  'как раз',
  'тут не гадюшник, вешать негде'
];

const guminoAnswers = [
  'Здесь гоняют бэн',
  'Right in da tuz!',
  'Я слоняю в бегемэ',
  'У нас пропал гусейший сэн!',
  'Мы не гуси, мы не куры, мы - фанаты чляйн культуры',
  'ЖОПА ССЫТ',
  'Гуня. Бэби. Бздёвый ссяк.',
  'Я бурёна',
  'И немножко гумина',
  'Пропал унитэйз. Обращаться к параше.',
  'Я пришел сюда сосать, срать и бить ебальники.',
  'Нунис срет, пердает в дубз\nЧыли гняга хахатуз',
  'Бачевать вдоль тузина',
  'ГАВНА В СУКУ ДАТЬ!!!',
  'Няный блэмс',
  'залезть на башенный крян и делать оттуда понос на кирпичи',
  'Бжук',
  'Ты желаешь джюбджина?',
  'Пейте дети молоко, будете карёвы',
  'У меня встала жопа',
  'Натрахаться на КЛИТЫРЬ!!!!',
  'Баклажанить вдоль салата',
  'СИДИШЬ ЖОПИШЬ СРЭК, ПЕДЕРАСТИРУЯ ГУЗЛОКАЛ \n' +
  '#достаточно\n' +
  '@\n' +
  'ВДРУГ ВЫВАЛИВАЕТСЯ ДВУХМЕТРОВЫЙ СОСЯН\n' +
  '@\n' +
  'КАЗАЛОСЬ БЫ #антибугурт , НО\n' +
  '@\n' +
  'ВНЕЗАПНО НАЧИНАЕТ БЭНИТЬСЯ ДАВНО ЗАБЫТАЯ ДРИСТЁВАЯ БОБУЛЯ\n' +
  '@\n' +
  'УЛЕТАЕШЬ В КОПРОСТРАНСТВО ВСЛЕД ЗА КОРАБЛЕМ ХУЕЖЁПЕР-3',
  'Мы не хиппи, мы не готы, мы - большие бегемоты',
  'Унитазная вода - наша лучшая еда',
  'Должен трахать, но вынужден отсасывать',
  'Кузовок с грибаме'
];

function generateRandomAnswer(answers: string[]) {
  if (!answers || (Array.isArray(answers) && !answers.length)) {
    return '';
  }

  const random = Math.floor(Math.random() * answers.length);

  return answers[random];
}

function transformAneks(aneks: Array<IAnek & {_highlight?: {text: string[]}}>, user: IUser): InlineQueryResultArticle[] {
  return aneks.map((anek, index): InlineQueryResultArticle => {
    let highlightText = anek.text;

    if (anek._highlight && anek._highlight.text && anek._highlight.text.length) {
      highlightText = anek._highlight.text[0];
    }

    const buttons = botApi.bot.getAnekButtons(anek, { disableComments: true, disableAttachments: true });

    return {
      description: highlightText.slice(0, 100),
      id: anek.post_id.toString() + index,
      input_message_content: {
        message_text: anek.text,
        parse_mode: ParseMode.HTML
      },
      reply_markup: botApi.bot.prepareInlineKeyboard(buttons),
      title: translate(user.language, 'anek_number', {number: anek.post_id || index}),
      type: 'article'
    };
  });
}

async function performSuggest(command: string[], message: Message, user: IUser) {
  if (message && message.chat && message.from && (message.chat.id !== message.from.id)) {
    return botApi.bot.sendMessage(message.chat.id, 'Комменты недоступны в группах.');
  }

  if (command[1]) {
    if (command[1] === 'list') {
      const query: {approved: boolean, user?: number} = {
        approved: false
      };

      if (!(user.editor || user.admin)) {
        query.user = user.id;
      }

      const suggests = await botApi.database.Suggest.find(query);

      await botApi.bot.sendMessage(message.chat.id, 'Активные предложки на данный момент: ' + suggests.length);

      return botApi.bot.sendSuggests(message.chat.id, suggests, {
        editor: user.editor || user.admin,
        native: (command[2] && command[2] === 'native'),
        suggest: true
      });
    }
  }

  if (user.suggest_mode) {
    return botApi.bot.sendMessage(message.chat.id, 'Вы и так уже в режиме предложки.');
  }

  const suggestsLength = await botApi.database.Suggest.find({user: user.id, approved: false}).count();

  if (suggestsLength > 5) {
    throw new Error('Слишком много предложений в ожидании.');
  }

  user.suggest_mode = true;

  await user.save();

  return botApi.bot.sendMessage(message.chat.id, 'Режим предложки включен. Вы можете писать сюда' +
    ' любой текст (кроме команд) или присылать любой контент одним сообщением и он будет ' +
    'добавлен в ваш список предложки анонимно.');
}

async function performAnalysis(postId: number, message: Message) {
  const anek = await botApi.database.Anek.findOne({post_id: postId});

  if (!anek) {
    return botApi.bot.sendMessage(message.chat.id, 'Анек не найден');
  }

  const results = await inspect(anek);

  if (results.ok) {
    return botApi.bot.sendMessage(message.chat.id, 'Проверка анека не выявила подозрительных моментов.');
  }

  return botApi.bot.sendMessage(message.chat.id, 'Выявлены следующие проблемы при проверке анека: \n' + results.reason.map((result) => '- ' + result).join('\n'), {
    parse_mode: ParseMode.Markdown,
    reply_to_message_id: message.message_id
  });

}

botApi.bot.onCommand('debug', async (command, message, user) => {
  if (!user.admin) {
    throw new Error('Unauthorized access');
  }

  const params: AllMessageParams = {
    _key: 'debug',
    _rule: 'common',
    parse_mode: ParseMode.Markdown
  };

  if (debugTimer) {
    clearInterval(debugTimer);
  }

  const sentMessage = await botApi.bot.sendMessage(message.from.id, generateDebug(), params);

  const editedMessage = sentMessage.message_id;

  debugTimer = setInterval(async () => {
    try {
      await botApi.bot.editMessageText(message.from.id, editedMessage, generateDebug(), params);
    } catch (e) {
      clearInterval(debugTimer);
    }
  }, 1000);
});
botApi.bot.onCommand('stop_debug', (command, message, user) => {
  if (!user.admin) {
    throw new Error('Unauthorized access');
  }

  clearInterval(debugTimer);

  return botApi.bot.sendMessage(message.from.id, 'дебаг прекращен');
});
botApi.bot.onCommand('disable_update', (command, message, user) => {
  if (!user.admin) {
    throw new Error('Unauthorized access');
  }

  botApi.updater.sendMessage({type: UpdaterMessageTypes.service, action: UpdaterMessageActions.update, value: false});

  return botApi.bot.sendMessage(message.from.id, 'Апдейтер отключен');
});
botApi.bot.onCommand('enable_update', (command, message, user) => {
  if (!user.admin) {
    throw new Error('Unauthorized access');
  }

  botApi.updater.sendMessage({type: UpdaterMessageTypes.service, action: UpdaterMessageActions.update, value: true});

  return botApi.bot.sendMessage(message.from.id, 'Апдейтер включен');
});
botApi.bot.onCommand('redefine_database', async (command, message, user) => {
  if (!user.admin) {
    throw new Error('Unauthorized access');
  }

  await botApi.bot.sendMessage(message.from.id, 'redefine start');
  await botApi.database.Anek.remove({});
  await common.redefineDatabase(0);

  return botApi.bot.sendMessage(message.from.id, 'redefine success');
});
botApi.bot.onCommand('synchronize_database', async (command, message, user) => {
  if (!user.admin) {
    throw new Error('Unauthorized access');
  }

  botApi.updater.sendMessage({type: UpdaterMessageTypes.service, action: UpdaterMessageActions.synchronize, value: true});

  return botApi.bot.sendMessage(message.from.id, 'synchronize start');
});

botApi.bot.onCommand('user', async (command, message, user) => {
  if (command[1] === 'count') {
    const count = await botApi.database.User.count(null);

    return botApi.bot.sendMessage(message.chat.id, translate(user.language, 'current_user_count', {count}));
  }

  if (command[1] === 'subscribed') {
    const count = await botApi.database.User.find({subscribed: true}).count();

    return botApi.bot.sendMessage(message.chat.id, translate(user.language, 'current_subscribed_user_count', {count}));
  }

  if (command[1] === 'id') {
    if (command[2]) {
      const foundUser = await botApi.database.User.findOne({user_id: command[2]});

      return botApi.bot.sendMessage(message.chat.id, generateUserInfo(foundUser), {parse_mode: ParseMode.Markdown});
    }

    return botApi.bot.sendMessage(message.chat.id, translate(user.language, 'current_user_id', {user_id: message.from.id}));
  }

  return botApi.bot.sendMessage(message.chat.id, generateUserInfo(user), {parse_mode: ParseMode.Markdown});
});

botApi.bot.onCommand('anek', async (command, message, user) => {
  if (command[1] === 'count') {
    const count = await botApi.database.Anek.count(null);

    return botApi.bot.sendMessage(message.chat.id, translate(user.language, 'total_aneks_count', {aneks_count: count}));
  } else if (command[1] && (!isNaN(Number(command[1])))) {
    const foundAnek = await botApi.database.Anek.findOne().skip(Number(command[1]) - 1).exec();

    return botApi.bot.sendAnek(message.chat.id, foundAnek, {language: user.language, forceAttachments: user.force_attachments});
  }

  const anek = await botApi.database.Anek.random();

  return botApi.bot.sendAnek(message.chat.id, anek, {
    admin: user.admin && (message.chat.id === message.from.id),
    language: user.language
  });
});

botApi.bot.onCommand('xax', async (command, message, user) => {
  const max = command[1] || 300;
  const min = command[2] || 10;
  const aneksLength = await botApi.database.Anek
    .find({ $where: `this.text.length <= ${max} && this.text.length >= ${min}` })
    .count();
  const anek: IAnek = await (botApi.database.Anek as IAnekModel)
    .findOne({ $where: `this.text.length <= ${max} && this.text.length >= ${min}` })
    .skip(Math.floor(Math.random() * aneksLength));

  return botApi.bot.sendAnek(message.chat.id, anek, {
    admin: user.admin && (message.chat.id === message.from.id),
    forceAttachments: user.force_attachments,
    language: user.language
  });
});

botApi.bot.onCommand('inspect', async (command, message, user) => {
  if (!user.admin) {
    throw new Error('Unauthorized access');
  }

  if (!command[1]) {
    return botApi.bot.sendMessage(message.chat.id, 'Укажите post_id анека');
  }

  return performAnalysis(Number(command[1]), message);
});

botApi.bot.onCommand('webhook_info', async (command, message, user) => {
  if (!user.admin) {
    throw new Error('Unauthorized access');
  }

  const info = await botApi.bot.getWebhookInfo();

  return botApi.bot.sendMessage(message.from.id, JSON.stringify(info));
});

botApi.bot.onCommand('me', async (command, message, user) => {
  if (!user.admin) {
    throw new Error('Unauthorized access');
  }

  const info = await botApi.bot.getMe();

  return botApi.bot.sendMessage(message.from.id, JSON.stringify(info));
});

botApi.bot.onCommand('spam', async (command, message, user) => {
  if (!user.admin) {
    throw new Error('Unauthorized access');
  }

  if (command.length <= 1) {
    const aneks = await botApi.database.Anek.find({spam: true});

    const spamList = aneks.map((anek: IAnek) => {
      return anek.post_id;
    });

    if (!spamList.length) {
      return botApi.bot.sendMessage(message.chat.id, 'Спам лист пуст.');
    }

    return botApi.bot.sendMessage(message.chat.id, 'Анеки в спам листе:\n' + spamList.join('\n'));
  }

  await botApi.database.Anek.findOneAndUpdate({post_id: command[1]}, {spam: true});

  return botApi.bot.sendMessage(message.chat.id, 'Анек занесен в спам лист.');
});
botApi.bot.onCommand('unspam', async (command, message, user) => {
  if (!user.admin) {
    throw new Error('Unauthorized access');
  }

  if (command.length <= 1) {
    return botApi.bot.sendMessage(message.chat.id, 'Укажите id анека из спам листа /spam');
  }

  await botApi.database.Anek.findOneAndUpdate({post_id: command[1]}, {spam: false});

  return botApi.bot.sendMessage(message.chat.id, 'Анек изъят из спам листа.');
});

botApi.bot.onCommand('get_me', async (command, message, user) => {
  if (!user.admin) {
    throw new Error('Unauthorized access');
  }

  const me = await botApi.bot.getMe();

  return botApi.bot.sendMessage(message.chat.id, JSON.stringify(me));
});

botApi.bot.onCommand('start', async (command, message, user) => {
  if (command[1] && command[1] === 'donate') {
    return botApi.bot.sendInvoice(message.from.id, {
      currency: 'RUB',
      description: 'А то совсем нечего кушать',
      payload: command[1],
      prices: JSON.stringify(getDonatePrices()),
      start_parameter: 'ololo',
      title: 'Донат на развитие бота'
    });
  }

  if (command[1] && languageExists(command[1])) {
    user.language = command[1];
  }

  await user.save();

  return botApi.bot.sendMessage(message.chat.id, translate(user.language, 'start'));
});

botApi.bot.onCommand('help', async (command, message, user) => {
  return botApi.bot.sendMessage(message.chat.id, translate(user.language, 'start'));
});

botApi.bot.onCommand('force_attachments', async (command, message, user) => {
  const forceAttachments = !user.force_attachments;

  user.force_attachments = forceAttachments;

  await user.save();

  return botApi.bot.sendMessage(message.chat.id, 'Автовложения ' + (forceAttachments ? 'включены' : 'отключены' + '.'));
});
botApi.bot.onCommand('keyboard', async (command, message, user) => {
  if (message.chat.id !== message.from.id) {
    return botApi.bot.sendMessage(message.chat.id, 'Запрещено использовать клавиатуры в группах.');
  }

  const keyboardToggle = !user.keyboard;

  user.keyboard = keyboardToggle;

  await user.save();

  const params: AllMessageParams = {};

  if (keyboardToggle) {
    params.reply_markup = botApi.bot.prepareReplyMarkup(botApi.bot.prepareReplyKeyboard([
        [
          {text: '😃'},
          {text: '❌'}
        ]
    ], true));
  } else {
    params.reply_markup = botApi.bot.prepareReplyMarkup(botApi.bot.prepareRemoveKeyboard());
  }

  return botApi.bot.sendMessage(message.chat.id, 'Клавиатура ' + (keyboardToggle ? 'включена' : 'отключена' + '.'), params);
});
botApi.bot.onCommand('english', async (command, message, user) => {
  user.language = 'english';

  await user.save();

  return botApi.bot.sendMessage(message.chat.id, translate(user.language, 'language_change'));
});
botApi.bot.onCommand('russian', async (command, message, user) => {
  user.language = 'russian';

  await user.save();

  return botApi.bot.sendMessage(message.chat.id, translate(user.language, 'language_change'));
});

botApi.bot.onCommand('broadcast', async (command, message, user) => {
  if (!user.admin) {
    throw new Error('Unauthorized access');
  }

  if (command.length <= 1) {
    return botApi.bot.sendMessage(message.chat.id, translate(user.language, 'broadcast_text_missing'));
  }

  command.splice(0, 1);

  const users = await botApi.database.User.find({subscribed: true});

  await botApi.bot.fulfillAll(users.map((foundUser: IUser) => {
    return botApi.bot.sendMessage(foundUser.user_id, command.join(' '));
  }, botApi.bot));

  return botApi.bot.sendMessage(message.chat.id, 'Рассылка окончена.');
});

botApi.bot.onCommand('test_broadcast', async (command, message, user) => {
  if (!user.admin && !user.editor) {
    throw new Error('Unauthorized access');
  }

  let anek: IAnek;

  if (command[1]) {
    anek = await botApi.database.Anek.findOne({post_id: command[1]}).sort({date: -1}).exec();
  } else {
    anek = await botApi.database.Anek.findOne({}).sort({date: -1}).exec();
  }

  if (!anek) {
    return;
  }

  anek.approved = false;
  anek.approveTimeout = new Date(Date.now() + Number(config.get('vk.approveTimeout')) * 1000);

  await anek.save();

  return botApi.bot.sendAnek(config.get('telegram.editorialChannel'), anek, {
    reply_markup: botApi.bot.prepareReplyMarkup(botApi.bot.prepareInlineKeyboard(botApi.bot.getAnekButtons(anek, {admin: user.admin, editor: user.editor}).concat([
      botApi.bot.createApproveButtons(anek.post_id, 0, 0)
    ])))
  });
});

botApi.bot.onCommand('stat', async (command, message, user) => {
  if (!user.admin) {
    throw new Error('Unauthorized access');
  }

  let startDate;
  let startTitle;
  const now = new Date();

  switch (command[1]) {
    case 'day':
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startTitle = 'день';
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth());
      startTitle = 'месяц';
      break;
    case 'week':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getDay() || 7) + 1);
      startTitle = 'неделю';
      break;
    case 'year':
      startDate = new Date(now.getFullYear());
      startTitle = 'всё время';
      break;
  }

  const results = await botApi.statistics.getOverallStatistics(
    startDate,
    now
  ) as StatisticsData;

  return botApi.bot.sendMessage(message.chat.id, generateStatistics(startTitle, results), {
    disableButtons: true,
    parse_mode: ParseMode.Markdown
  });
});

botApi.bot.onCommand('filin', (command, message, user) => botApi.bot.sendMessage(message.chat.id, translate(user.language, 'filin')));
botApi.bot.onCommand('bret', (command, message) => botApi.bot.sendMessage(message.chat.id, 'Удолил'));
botApi.bot.onCommand('madway', (command, message) => botApi.bot.sendMessage(message.chat.id, '@Lyasya кикай'));
botApi.bot.onCommand('do_rock', (command, message) => botApi.bot.sendMessage(message.chat.id, 'денис'));
botApi.bot.onCommand('petux', (command, message) => botApi.bot.sendMessage(message.chat.id, 'ti'));
botApi.bot.onCommand('pin', (command, message) => botApi.bot.sendMessage(message.chat.id, 'я не ем усы'));
botApi.bot.onCommand('svetlana', (command, message) => botApi.bot.sendMessage(message.chat.id, 'цем в лобик'));
botApi.bot.onCommand('bareyko', (command, message) => botApi.bot.sendSticker(message.chat.id, 'CAADAgADXAYAAq8ktwaLUk5_6-Z06gI'));
botApi.bot.onCommand('krevet', (command, message, user) => botApi.bot.sendMessage(message.chat.id, translate(user.language, 'krevet')));
botApi.bot.onCommand('shlyapa', (command, message) => botApi.bot.sendMessage(message.chat.id, generateRandomAnswer(shlyapaAnswers)));
botApi.bot.onCommand('gumino', (command, message) => botApi.bot.sendMessage(message.chat.id, generateRandomAnswer(guminoAnswers)));
botApi.bot.onCommand('detcom', (command, message) => botApi.bot.sendMessage(message.chat.id, 'ПОШЁЛ _НА ХУЙ_ *ХОХОЛ*', {parse_mode: ParseMode.Markdown}));
botApi.bot.onCommand('forward', (command, message) => botApi.bot.forwardMessage(message.chat.id, message.message_id, message.chat.id));

botApi.bot.onCommand('attach', async (command, message, user) => {
  const anek = await botApi.database.Anek.findOne({ attachments: { $size: Number(command[1]) || 1 } }).skip(Number(command[2] || 0)).exec();

  return botApi.bot.sendAnek(message.chat.id, anek, {forceAttachments: user.force_attachments});
});

botApi.bot.onCommand('anek_by_id', async (command, message, user) => {
  const anek = await botApi.database.Anek.findOne({post_id: command[1]});

  return botApi.bot.sendAnek(message.chat.id, anek, {language: user.language, forceAttachments: user.force_attachments});
});

botApi.bot.onCommand('find_user', async (command, message) => {
  const foundUser = await botApi.database.User.findOne({username: command[1]});

  return botApi.bot.sendMessage(message.chat.id, generateUserInfo(foundUser), {
    parse_mode: ParseMode.Markdown
  });
});

botApi.bot.onCommand('chat', (command, message) => {
  const baneksLink = config.get('telegram.baneksLink');

  if (command[1] === 'id') {
    return botApi.bot.sendMessage(message.chat.id, 'id текущего чата: ' + message.chat.id);
  }

  if (!baneksLink) {
    return botApi.bot.sendMessage(message.chat.id, 'денис дурак');
  }

  return botApi.bot.sendMessage(message.chat.id, 'Здесь весело: ' + baneksLink);
});

botApi.bot.onCommand('suggest', performSuggest);
botApi.bot.onCommand('comment', performSuggest);
botApi.bot.onCommand('comment_list', (command, message, user) => performSuggest(['/comment', 'list'], message, user));

botApi.bot.onCommand('top_day', async (command, message, user) => {
  const count = Math.max(Math.min(Number(command[1]) || 1, 20), 1);
  const aneks = await botApi.database.Anek
    .find({})
    .where({date: {$gte: Math.floor(new Date().getTime() / 1000) - 24 * 60 * 60}})
    .sort({likes: -1})
    .limit(count)
    .exec();

  await botApi.bot.sendMessage(message.chat.id, translate(user.language, 'top_day', {count}));

  return botApi.bot.fulfillAll(aneks.map((anek) => botApi.bot.sendAnek(message.chat.id, anek, {forceAttachments: user.force_attachments})));
});
botApi.bot.onCommand('top_week', async (command, message, user) => {
  const count = Math.max(Math.min(Number(command[1]) || 3, 20), 1);
  const aneks = await botApi.database.Anek
    .find({})
    .where({date: {$gte: Math.floor(new Date().getTime() / 1000) - 24 * 60 * 60 * 7}})
    .sort({likes: -1})
    .limit(count)
    .exec();

  await botApi.bot.sendMessage(message.chat.id, translate(user.language, 'top_week', {count}));

  return botApi.bot.fulfillAll(aneks.map((anek) => botApi.bot.sendAnek(message.chat.id, anek, {forceAttachments: user.force_attachments})));
});
botApi.bot.onCommand('top_month', async (command, message, user) => {
  const count = Math.max(Math.min(Number(command[1]) || 5, 20), 1);
  const aneks = await botApi.database.Anek
    .find({})
    .where({date: {$gte: Math.floor(new Date().getTime() / 1000) - 24 * 60 * 60 * 30}})
    .sort({likes: -1})
    .limit(count)
    .exec();

  await botApi.bot.sendMessage(message.chat.id, translate(user.language, 'top_month', {count}));

  return botApi.bot.fulfillAll(aneks.map((anek) => botApi.bot.sendAnek(message.chat.id, anek, {forceAttachments: user.force_attachments})));
});
botApi.bot.onCommand('top_year', async (command, message, user) => {
  const count = Math.max(Math.min(Number(command[1]) || 10, 20), 1);
  const aneks = await botApi.database.Anek
    .find({})
    .where({date: {$gte: Math.floor(new Date().getTime() / 1000) - 24 * 60 * 60 * 365}})
    .sort({likes: -1})
    .limit(count)
    .exec();

  await botApi.bot.sendMessage(message.chat.id, translate(user.language, 'top_year', {count}));

  return botApi.bot.fulfillAll(aneks.map((anek) => botApi.bot.sendAnek(message.chat.id, anek, {forceAttachments: user.force_attachments})));
});
botApi.bot.onCommand('top_ever', async (command, message, user) => {
  const count = Math.max(Math.min(Number(command[1]) || 10, 20), 1);
  const aneks = await botApi.database.Anek
    .find({})
    .sort({likes: -1})
    .limit(count)
    .exec();

  await botApi.bot.sendMessage(message.chat.id, translate(user.language, 'top_ever', {count}));

  return botApi.bot.fulfillAll(aneks.map((anek) => botApi.bot.sendAnek(message.chat.id, anek, {forceAttachments: user.force_attachments})));
});

botApi.bot.onCommand('donate', (command, message) => botApi.bot.sendInvoice(message.from.id, {
  currency: 'RUB',
  description: 'А то совсем нечего кушать',
  payload: 'lololo',
  prices: JSON.stringify(getDonatePrices()),
  start_parameter: 'donate',
  title: 'Донат на развитие бота'
}));

botApi.bot.onCommand('subscribe', async (command, message) => {
  let user: IUser | void;

  if (command[1] && command[1] === 'chat' && message.from.id !== message.chat.id) {
    user = await botApi.user.updateWith(message.chat);
  } else {
    user = await botApi.database.User.findOne({user_id: message.from.id});
  }

  if (user) {
    if (!user.subscribed) {
      await botApi.user.updateWith(user, {subscribed: true});
      return botApi.bot.sendMessage(user.user_id, translate(user.language, 'subscribe_success', {first_name: user.first_name || user.title}));
    } else {
      return botApi.bot.sendMessage(user.user_id, translate(user.language, 'subscribe_fail'));
    }
  }
});
botApi.bot.onCommand('unsubscribe', async (command, message) => {
  let user;

  if (command[1] && command[1] === 'chat' && message.from.id !== message.chat.id) {
    user = await botApi.user.updateWith(message.chat);
  } else {
    user = await botApi.database.User.findOne({user_id: message.from.id});
  }

  if (user) {
    if (user.subscribed) {
      await botApi.user.updateWith(user, {subscribed: false});
      return botApi.bot.sendMessage(user.user_id, translate(user.language, 'unsubscribe_success', {first_name: user.first_name}));
    } else {
      return botApi.bot.sendMessage(user.user_id, translate(user.language, 'unsubscribe_fail'));
    }
  }
});

botApi.bot.onCommand('feedback', async (command, message, user) => {
  if (command[1] && user.admin) {
    command.splice(0, 1);

    const userId = command.splice(0, 1)[0];

    return botApi.bot.sendMessage(Number(userId), 'Сообщение от службы поддержки: ' + command.join(' '));
  }

  if (user.feedback_mode) {
    return botApi.bot.sendMessage(message.chat.id, 'Вы и так уже в режиме обратной связи.');
  }

  user.feedback_mode = true;

  await user.save();

  return botApi.bot.sendMessage(message.chat.id, 'Режим обратной связи включен. Вы можете писать сюда' +
    ' любой текст (кроме команд) и он будет автоматически переведен в команду поддержки. Для остановки' +
    ' режима поддержки отправьте /unfeedback');
});
botApi.bot.onCommand('unfeedback', async (command, message, user) => {
  if (command[1] && user.admin) {
    const userId = command[1];

    await botApi.database.User.findOneAndUpdate({user_id: userId}, {feedback_mode: false});

    return botApi.bot.sendMessage(message.chat.id, 'Режим службы поддержки для пользователя ' + userId + ' отключен.');
  }

  if (!user.feedback_mode) {
    return botApi.bot.sendMessage(message.chat.id, 'Режим обратной связи и так отключен.');
  }

  user.feedback_mode = false;

  await user.save();

  return botApi.bot.sendMessage(message.chat.id, 'Режим обратной связи отключен.');
});

botApi.bot.onCommand('grant', async (command, message, user) => {
  if (!user.admin) {
    throw new Error('Unauthorized access');
  }

  if (command.length <= 1) {
    return botApi.bot.sendMessage(message.chat.id, 'Введите id пользователя.');
  }

  if (message.from.id === config.get('telegram.editorialChannel')) {
    const newAdmin = await botApi.database.User.findOne({user_id: command[1]}).exec();

    if (!newAdmin) {
      throw new Error('User not found');
    }

    const newStatus = !newAdmin.editor;

    newAdmin.editor = newStatus;

    await newAdmin.save();

    await botApi.bot.promoteChatMember(config.get('telegram.editorialChannel'), newAdmin.user_id, {
      can_delete_messages: newStatus,
      can_edit_messages: newStatus,
      can_invite_users: newStatus,
      can_pin_messages: newStatus,
      can_post_messages: newStatus
    });

    await botApi.bot.deleteMessage(config.get('telegram.editorialChannel'), message.message_id);

    if (!newStatus) {
      return botApi.bot.sendMessage(message.from.id, `Привилегии пользователя ${botApi.bot.getUserInfo(newAdmin)} отозваны.`);
    }

    return botApi.bot.sendMessage(message.from.id, `Привилегии пользователю ${botApi.bot.getUserInfo(newAdmin)} присвоены.`);
  }

  const privileges: {admin?: boolean, editor?: boolean} = {};

  switch (command[2]) {
    case 'admin':
      privileges.admin = true;
      break;
    case 'editor':
      privileges.editor = true;
      break;
    default:
      privileges.admin = false;
      privileges.editor = false;
      break;
  }

  await botApi.database.User.findOneAndUpdate({user_id: Number(command[1])}, privileges);
  await botApi.bot.sendMessage(Number(command[1]), 'Вам были выданы привилегии администратора пользователем ' + botApi.bot.getUserInfo(user));

  return botApi.bot.sendMessage(message.chat.id, 'Привилегии присвоены.');
});

botApi.bot.onCommand('birthday', (command, message) => botApi.bot.sendPhoto(message.chat.id, 'AgADAgADMagxGy3cYUribqypKXY_gAXZDw4ABKi3xzmLAAHaqMQjAQABAg'));

botApi.bot.onCommand('ban', async (command, message: Message, user) => {
  if (command[1] && user.admin) {
    command.splice(0, 1);

    const userId = command[1];

    await botApi.database.User.findOneAndUpdate({user_id: userId}, {banned: true});

    return botApi.bot.sendMessage(message.chat.id, 'Пользователь ' + userId + ' забанен.');
  }
});
botApi.bot.onCommand('unban', async (command, message, user) => {
  if (command[1] && user.admin) {
    command.splice(0, 1);

    const userId = command[1];

    await botApi.database.User.findOneAndUpdate({user_id: userId}, {banned: false});

    return botApi.bot.sendMessage(message.chat.id, 'Пользователь ' + userId + ' разбанен.');
  }
});

botApi.bot.onCommand('find', async (command, message, user) => {
  command.splice(0, 1);

  const searchPhrase = command.join(' ');

  if (!searchPhrase.length) {
    return botApi.bot.sendMessage(message.chat.id, translate(user.language, 'search_query_empty'));
  }

  if (searchPhrase.length < 4) {
    return botApi.bot.sendMessage(message.chat.id, translate(user.language, 'search_query_short'));
  }

  const aneks = await common.performSearch(searchPhrase, 0, 1);

  if (!aneks.length) {
    return botApi.bot.sendMessage(message.chat.id, translate(user.language, 'search_query_not_found'));
  }

  return botApi.bot.sendAnek(message.chat.id, aneks[0], {language: user.language, forceAttachments: user.force_attachments});
});

botApi.bot.on('suggest', async (suggest, user) => {
  const newSuggest = await new botApi.database.Suggest({...suggest, user}).save();
  const buttons = [
    [
      {
        callback_data: 's_da ' + newSuggest._id,
        text: 'Подписаться'
      },
      {
        callback_data: 's_d ' + newSuggest._id,
        text: 'Удалить'
      }
    ]
  ];

  await botApi.user.updateWith(user, {suggest_mode: false});

  return botApi.bot.sendMessage(user.user_id, 'Предложка успешно добавлена.', {
    reply_markup: botApi.bot.prepareReplyMarkup(botApi.bot.prepareInlineKeyboard(buttons))
  });
});

botApi.bot.onCommand('photo', async (command, message) => {
  const photo = await axios({method: 'get', url: 'https://picsum.photos/200/300?random', responseType: 'stream'})
     .then((response) => response.data);

  return botApi.bot.sendPhoto(message.chat.id, photo);
});

botApi.bot.on('callbackQuery', async (callbackQuery, user) => {
  const {data = ''} = callbackQuery;
  const queryData = data.split(' ');
  const params: AllMessageParams = {
    reply_to_message_id: callbackQuery.message && callbackQuery.message.message_id
  };

  switch (queryData[0]) {
    case 'comment':
      await botApi.bot.answerCallbackQuery(callbackQuery.id, { text: 'Выбираю лучшие 3 переделки...' });

      const commentsResponse = await botApi.vk.getAllComments(Number(queryData[1]));
      const comments = commentsResponse
        .reduce((acc: Comment[], comment: MultipleResponse<Comment>) => acc.concat(comment.items), [])
        .sort((a: Comment, b: Comment) => b.likes.count - a.likes.count)
        .slice(0, 3)
        .map((comment, index) => ({...comment, text: translate(user.language, 'th_place', {nth: (index + 1)}) + comment.text}));

      return botApi.bot.sendComments(callbackQuery.message.chat.id, comments, {...params, parse_mode: ParseMode.Markdown, disable_web_page_preview: true});
    case 'attach':
      await botApi.bot.answerCallbackQuery(callbackQuery.id, { text: 'Получаю вложения...' });

      let post = await botApi.vk.getPostById(Number(queryData[1]));

      if (!post) {
        throw new Error('Post not found');
      }

      if (!post.attachments && !post.copy_history) {
        throw new Error('Attachments not found');
      }

      while (!post.attachments && post.copy_history) {
        post = post.copy_history[0];
      }

      return botApi.bot.sendAttachments(callbackQuery.message.chat.id, post.attachments, params);
    case 'a_a':
      if (!user.admin && !user.editor) {
        return;
      }

      const anek: IAnek = await botApi.database.Anek.findOne({post_id: queryData[1]});

      if (anek && !anek.approved) {
        const alreadyPros = anek.pros.id(user.id);
        const alreadyCons = anek.cons.id(user.id);

        if (alreadyCons) {
          await alreadyCons.remove();

          anek.pros.push(user);
        } else if (alreadyPros) {
          await alreadyPros.remove();
        } else {
          anek.pros.push(user);
        }

        await anek.save();

        await botApi.bot.editMessageReplyMarkup(
          callbackQuery.message.chat.id,
          callbackQuery.message.message_id,
          botApi.bot.prepareInlineKeyboard(botApi.bot.getAnekButtons(anek, {admin: user.admin, editor: user.editor}).concat([
            botApi.bot.createApproveButtons(anek.post_id, anek.pros.length, anek.cons.length)
          ]))
        );

        await botApi.bot.answerCallbackQuery(callbackQuery.id, {text: 'Выбор сделан'});
      }

      return botApi.bot.answerCallbackQuery(callbackQuery.id, {text: 'Сообщение не найдено или уже было опубликовано'});
    case 'a_d':
      if (!user.admin && !user.editor) {
        return;
      }

      const unapprovedAnek: IAnek = await botApi.database.Anek.findOne({post_id: queryData[1]});

      if (unapprovedAnek && !unapprovedAnek.approved) {
        const alreadyPros = unapprovedAnek.pros.id(user._id);
        const alreadyCons = unapprovedAnek.cons.id(user._id);

        if (alreadyPros) {
          await alreadyPros.remove();

          unapprovedAnek.cons.push(user);
        } else if (alreadyCons) {
          await alreadyCons.remove();
        } else {
          unapprovedAnek.cons.push(user);
        }

        await unapprovedAnek.save();

        await botApi.bot.editMessageReplyMarkup(
          callbackQuery.message.chat.id,
          callbackQuery.message.message_id,
          botApi.bot.prepareInlineKeyboard(botApi.bot.getAnekButtons(unapprovedAnek, {admin: user.admin, editor: user.editor}).concat([
            botApi.bot.createApproveButtons(unapprovedAnek.post_id, unapprovedAnek.pros.length, unapprovedAnek.cons.length)
          ]))
        );

        await botApi.bot.answerCallbackQuery(callbackQuery.id, {text: 'Выбор сделан'});
      }

      return botApi.bot.answerCallbackQuery(callbackQuery.id, {text: 'Сообщение не найдено или уже было опубликовано'});
    case 'spam':
      if (!user.admin && !user.editor) {
        return;
      }

      await botApi.database.Anek.findOneAndUpdate({post_id: queryData[1]}, {spam: true, approved: true, approver: user});
      await botApi.bot.answerCallbackQuery(callbackQuery.id, {text: 'Анек помечен как спам.'});

      return botApi.bot.deleteMessage(callbackQuery.message.chat.id, callbackQuery.message.message_id);
    case 'analysis':
      if (!user.admin && !user.editor) {
        return;
      }

      if (!queryData[1]) {
        return;
      }

      await botApi.bot.answerCallbackQuery(callbackQuery.id, {text: 'Выполняется анализ...'});

      return performAnalysis(Number(queryData[1]), callbackQuery.message);
    case 'unspam':
      if (!user.admin && !user.editor) {
        return;
      }

      await botApi.database.Anek.findOneAndUpdate({post_id: queryData[1]}, {spam: false, approver: user});
      await botApi.bot.answerCallbackQuery(callbackQuery.id);

      return botApi.bot.sendMessage(callbackQuery.message.chat.id, 'Анек помечен как нормальный.');
    case 's_a':
      await botApi.bot.answerCallbackQuery(callbackQuery.id, { text: 'Предложение одобрено' });

      return acceptSuggest(queryData, callbackQuery, false);
    case 's_aa':
      await botApi.bot.answerCallbackQuery(callbackQuery.id, { text: 'Предложение одобрено анонимно' });

      return acceptSuggest(queryData, callbackQuery, true);
    case 's_d':
      await botApi.database.Suggest.findOneAndRemove({_id: botApi.database.Suggest.convertId(queryData[1])});
      await botApi.bot.answerCallbackQuery(callbackQuery.id, { text: 'Предложение удалено' });

      return botApi.bot.deleteMessage(callbackQuery.from.id, callbackQuery.message.message_id);
    case 's_da':
      await botApi.database.Suggest.findOneAndUpdate({_id: botApi.database.Suggest.convertId(queryData[1])}, {public: true});
      await botApi.bot.answerCallbackQuery(callbackQuery.id, { text: 'Предложение будет опубликовано неанонимно.', show_alert: true });

      return botApi.bot.editMessageReplyMarkup(callbackQuery.from.id, callbackQuery.message.message_id, botApi.bot.prepareInlineKeyboard([]));
  }

  throw new Error('Unknown callback query ' + queryData);
});

botApi.bot.on('inlineQuery', async (inlineQuery, user) => {
  const skip = Number(inlineQuery.offset || 0);
  const limit = 5;
  let aneks = [];

  if (!inlineQuery.query) {
    aneks = await botApi.database.Anek.find({text: {$ne: ''}})
      .sort({date: -1})
      .skip(skip)
      .limit(limit)
      .exec();
  } else {
    aneks = await common.performSearch(inlineQuery.query, skip, limit);
  }

  const results = transformAneks(aneks, user);

  return botApi.bot.answerInlineQuery(inlineQuery.id, results, skip + limit);
});

botApi.bot.on('preCheckoutQuery', (preCheckoutQuery) => {
  return botApi.bot.answerPreCheckoutQuery(preCheckoutQuery.id);
});

botApi.bot.on('reply', async (reply, message, user) => {
  if (user.admin && reply.forward_from) {
    const replyUser = await botApi.database.User.findOne({ user_id: reply.forward_from.id });

    if (!replyUser) {
      throw new Error('Reply user not found');
    }

    if (message.text === '/user') {
      return botApi.bot.sendMessage(message.chat.id, generateUserInfo(replyUser), {parse_mode: ParseMode.Markdown});
    }

    if (!replyUser.feedback_mode) {
      throw new Error('Reply user is not in feedback mode');
    }

    return botApi.bot.sendMessage(reply.forward_from.id, 'Сообщение от службы поддержки: ' + message.text);
  }
});

botApi.bot.on('feedback', (message: Message) => {
  return botApi.bot.forwardMessage(config.get('telegram.adminChat'), message.message_id, message.chat.id);
});

botApi.bot.onButton('😃', (message, user) => botApi.bot.performCommand(['/anek'], message, user));
botApi.bot.onButton('❌', (message, user) => botApi.bot.performCommand(['/keyboard'], message, user));
