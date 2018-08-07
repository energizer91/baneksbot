const config = require('config');
const common = require('./common');
const dict = require('./dictionary');
const botApi = require('../botApi');

function generateUserInfo (user) {
  return '```\n' +
    'User ' + user.user_id + ':\n' +
    'Имя:        ' + (user.first_name || 'Не указано') + '\n' +
    'Фамилия:    ' + (user.last_name || 'Не указано') + '\n' +
    'Ник:        ' + (user.username || 'Не указано') + '\n' +
    'Подписка:   ' + (user.subscribed ? 'Подписан' : 'Не подписан') + '\n' +
    'Фидбэк:     ' + (user.feedback_mode ? 'Включен' : 'Выключен') + '\n' +
    'Админ:      ' + (user.admin ? 'Присвоен' : 'Не присвоен') + '\n' +
    'Бан:        ' + (user.banned ? 'Забанен' : 'Не забанен') + '\n' +
    'Язык:       ' + (user.language || 'Не выбран') + '\n' +
    'Клавиатура: ' + (user.keyboard ? 'Включена' : 'Выключена') + '\n' +
    'Платформа:  ' + (user.client || 'Не выбрана') + '```';
}

function generateStatistics (interval, stats) {
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

async function acceptSuggest (queryData, callbackQuery, params, anonymous) {
  const suggest = await botApi.database.Suggest.findOneAndUpdate({_id: botApi.mongo.Suggest.convertId(queryData[1])}, {approved: true});

  await botApi.telegram.editMessageButtons(callbackQuery.message, []);

  const sendMessage = await botApi.telegram.forwardMessageToChannel(suggest, {native: anonymous});

  await botApi.telegram.sendMessage(callbackQuery.message.chat.id, 'Предложение одобрено.');

  const foundUser = botApi.database.User.findOne({_id: suggest.user});

  if (sendMessage.ok && sendMessage.result) {
    return botApi.telegram.forwardMessage(foundUser.user_id, sendMessage.result, {native: true});
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

function generateRandomAnswer (answers) {
  if (!answers || (Array.isArray(answers) && !answers.length)) {
    return '';
  }

  const random = Math.floor(Math.random() * answers.length);

  return answers[random];
}

function performSuggest (command, message, user) {
  if (message && message.chat && message.from && (message.chat.id !== message.from.id)) {
    return botApi.telegram.sendMessage(message.chat.id, 'Комменты недоступны в группах.');
  }
  if (command[1]) {
    if (command[1] === 'list') {
      const query = {
        approved: false
      };

      if (!(user.editor || user.admin)) {
        query.user = user.id;
      }

      return botApi.database.Suggest.find(query).then(function (suggests) {
        return botApi.telegram.sendMessage(message.chat.id, 'Активные предложки на данный момент: ' + suggests.length).then(function () {
          return botApi.telegram.forwardMessages(message.chat.id, suggests, {
            editor: user.editor || user.admin,
            suggest: true,
            native: (command[2] && command[2] === 'native')
          });
        });
      });
    }
  } else if (user.suggest_mode) {
    return botApi.telegram.sendMessage(message.chat.id, 'Вы и так уже в режиме предложки.');
  } else {
    return botApi.database.Suggest.find({user: user.id, approved: false}).count().then(function (suggestsLength) {
      if (suggestsLength > 5) {
        throw new Error('Слишком много предложений в ожидании.');
      }

      user.suggest_mode = true;

      return botApi.database.User.findOneAndUpdate({user_id: user.user_id}, user).then(function () {
        return botApi.telegram.sendMessage(message.chat.id, 'Режим предложки включен. Вы можете писать сюда' +
          ' любой текст (кроме команд) или присылать любой контент одним сообщением и он будет ' +
          'добавлен в ваш список предложки анонимно.');
      });
    }).catch(function (error) {
      return botApi.telegram.sendMessage(user.user_id, 'Произошла ошибка: ' + error.message);
    });
  }
}

botApi.bot.onCommand('user', async (command, message, user) => {
  if (command[1] === 'count') {
    const count = await botApi.database.User.count();

    return botApi.telegram.sendMessage(message.chat.id, dict.translate(user.language, 'current_user_count', {count}));
  } else if (command[1] === 'subscribed') {
    const count = await botApi.database.User.find({subscribed: true}).count();

    return botApi.telegram.sendMessage(message.chat.id, dict.translate(user.language, 'current_subscribed_user_count', {count}));
  } else if (command[1] === 'id') {
    if (command[2]) {
      const foundUser = await botApi.database.User.findOne({user_id: command[2]});

      return botApi.telegram.sendMessage(message.chat.id, generateUserInfo(foundUser), {parse_mode: 'Markdown'});
    }

    return botApi.telegram.sendMessage(message.chat.id, dict.translate(user.language, 'current_user_id', {user_id: message.from.id}));
  }

  return botApi.telegram.sendMessage(message.chat.id, generateUserInfo(user), {parse_mode: 'Markdown'});
});

botApi.bot.onCommand('anek', async (command, message, user) => {
  if (command[1] === 'count') {
    const count = await botApi.database.Anek.count();

    return botApi.bot.sendAnek(message.chat.id, dict.translate(user.language, 'total_aneks_count', {aneks_count: count}), {language: user.language});
  } else if (command[1] === 'id') {
    return botApi.bot.sendAnek(message.chat.id, dict.translate({language: user.language}, 'current_chat_id', {chat_id: message.chat.id}), {language: user.language});
  } else if (command[1] && (!isNaN(Number(command[1])))) {
    const anek = await botApi.database.Anek.findOne().skip(parseInt(command[1]) - 1).exec();

    return botApi.bot.sendAnek(message.chat.id, anek, {language: user.language});
  }

  const anek = await botApi.database.Anek.random();

  return botApi.bot.sendAnek(message.chat.id, anek, {
    language: user.language,
    admin: user.admin && (message.chat.id === message.from.id)
  });
});

botApi.bot.onCommand('spam', async (command, message, user) => {
  if (!user.admin) {
    throw new Error('Unauthorized access');
  }

  if (command.length <= 1) {
    const aneks = await botApi.database.Anek.find({spam: true});

    const spamList = aneks.map(anek => {
      return anek.post_id;
    });

    if (!spamList.length) {
      return botApi.telegram.sendMessage(message.chat.id, 'Спам лист пуст.');
    }

    return botApi.telegram.sendMessage(message.chat.id, 'Анеки в спам листе:\n' + spamList.join('\n'));
  }

  await botApi.database.Anek.findOneAndUpdate({post_id: command[1]}, {spam: true});

  return botApi.telegram.sendMessage(message.chat.id, 'Анек занесен в спам лист.');
});
botApi.bot.onCommand('unspam', async (command, message, user) => {
  if (!user.admin) {
    throw new Error('Unauthorized access');
  }

  if (command.length <= 1) {
    return botApi.telegram.sendMessage(message.chat.id, 'Укажите id анека из спам листа /spam');
  }

  await botApi.database.Anek.findOneAndUpdate({post_id: command[1]}, {spam: false});

  return botApi.telegram.sendMessage(message.chat.id, 'Анек изъят из спам листа.');
});

botApi.bot.onCommand('get_me', async (command, message, user) => {
  if (!user.admin) {
    throw new Error('Unauthorized access');
  }

  const me = await botApi.telegram.getMe();

  return botApi.telegram.sendMessage(message.chat.id, JSON.stringify(me));
});

botApi.bot.onCommand('start', async (command, message, user) => {
  if (command[1] && command[1] === 'donate') {
    return botApi.telegram.sendInvoice(message.from.id, {
      title: 'Донат на развитие бота',
      description: 'А то совсем нечего кушать',
      payload: command[1]
    });
  }

  if (command[1] && dict.languageExists(command[1])) {
    user.language = command[1];
  }

  await botApi.database.User.findOneAndUpdate({user_id: user.user_id}, user);

  return botApi.telegram.sendMessage(message.chat.id, dict.translate(user.language, 'start'));
});

botApi.bot.onCommand('help', async (command, message, user) => {
  return botApi.telegram.sendMessage(message.chat.id, dict.translate(user.language, 'start'));
});

botApi.bot.onCommand('keyboard', async (command, message, user) => {
  if (message.chat.id !== message.from.id) {
    return botApi.telegram.sendMessage(message.chat.id, 'Запрещено использовать клавиатуры в группах.');
  }

  const keyboardToggle = !user.keyboard;

  await botApi.database.User.findOneAndUpdate({user_id: message.chat.id}, {keyboard: keyboardToggle});

  const params = {};
  if (keyboardToggle) {
    params.keyboard = true;
  } else {
    params.remove_keyboard = true;
  }
  return botApi.telegram.sendMessage(message.chat.id, 'Клавиатура ' + (keyboardToggle ? 'включена' : 'отключена' + '.'), params);
});
botApi.bot.onCommand('english', async (command, message, user) => {
  user.language = 'english';

  await botApi.database.User.findOneAndUpdate({user_id: user.user_id}, user);

  return botApi.telegram.sendMessage(message.chat.id, dict.translate(user.language, 'language_change'));
});
botApi.bot.onCommand('russian', async (command, message, user) => {
  user.language = 'russian';

  await botApi.database.User.findOneAndUpdate({user_id: user.user_id}, user);

  return botApi.telegram.sendMessage(message.chat.id, dict.translate(user.language, 'language_change'));
});

botApi.bot.onCommand('broadcast', async (command, message, user) => {
  if (!user.admin) {
    throw new Error('Unauthorized access');
  }

  if (command.length <= 1) {
    return botApi.telegram.sendMessage(message.chat.id, dict.translate(user.language, 'broadcast_text_missing'));
  }

  command.splice(0, 1);

  const users = botApi.database.User.find({subscribed: true});

  await botApi.request.fulfillAll(users.map(function (user) {
    return this.sendMessage(user.user_id, command.join(' '));
  }, botApi.bot));

  return botApi.telegram.sendMessage(message.chat.id, 'Рассылка окончена.');
});

botApi.bot.onCommand('stat', async (command, message, user) => {
  if (!user.admin) {
    throw new Error('Unauthorized access');
  }

  let startDate;
  let startTitle;
  let now = new Date();

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
    botApi.database,
    startDate,
    now
  );

  return botApi.telegram.sendMessage(message.chat.id, generateStatistics(startTitle, results), {
    disableButtons: true,
    parse_mode: 'Markdown'
  });
});

botApi.bot.onCommand('filin', (command, message, user) => botApi.telegram.sendMessage(message.chat.id, dict.translate(user.language, 'filin')));
botApi.bot.onCommand('bret', (command, message) => botApi.telegram.sendMessage(message.chat.id, 'Удолил'));
botApi.bot.onCommand('madway', (command, message) => botApi.telegram.sendMessage(message.chat.id, '@Lyasya кикай'));
botApi.bot.onCommand('do_rock', (command, message) => botApi.telegram.sendMessage(message.chat.id, 'денис'));
botApi.bot.onCommand('petux', (command, message) => botApi.telegram.sendMessage(message.chat.id, 'ti'));
botApi.bot.onCommand('pin', (command, message) => botApi.telegram.sendMessage(message.chat.id, 'я не ем усы'));
botApi.bot.onCommand('svetlana', (command, message) => botApi.telegram.sendMessage(message.chat.id, 'цем в лобик'));
botApi.bot.onCommand('bareyko', (command, message) => botApi.telegram.sendSticker(message.chat.id, 'CAADAgADXAYAAq8ktwaLUk5_6-Z06gI'));
botApi.bot.onCommand('krevet', (command, message, user) => botApi.telegram.sendMessage(message.chat.id, dict.translate(user.language, 'krevet')));
botApi.bot.onCommand('shlyapa', (command, message) => botApi.telegram.sendMessage(message.chat.id, generateRandomAnswer(shlyapaAnswers)));
botApi.bot.onCommand('gumino', (command, message) => botApi.telegram.sendMessage(message.chat.id, generateRandomAnswer(guminoAnswers)));
botApi.bot.onCommand('detcom', (command, message) => botApi.telegram.sendMessage(message.chat.id, 'ПОШЁЛ _НА ХУЙ_ *ХОХОЛ*', {parse_mode: 'Markdown'}));

botApi.bot.onCommand('anek_by_id', async (command, message, user) => {
  const anek = await botApi.database.Anek.findOne({post_id: command[1]});

  return botApi.bot.sendAnek(message.chat.id, anek, {language: user.language});
});

botApi.bot.onCommand('find_user', async (command, message) => {
  const foundUser = await botApi.database.User.findOne({username: command[1]});

  return botApi.telegram.sendMessage(message.chat.id, generateUserInfo(foundUser), {
    parse_mode: 'Markdown'
  });
});

botApi.bot.onCommand('chat', (command, message) => {
  const baneksLink = config.get('telegram.baneksLink');

  if (!baneksLink) {
    return botApi.telegram.sendMessage(message.chat.id, 'денис дурак');
  }

  return botApi.telegram.sendMessage(message.chat.id, 'Здесь весело: ' + baneksLink);
});

botApi.bot.onCommand('suggest', performSuggest);
botApi.bot.onCommand('comment', performSuggest);
botApi.bot.onCommand('comment_list', (command, message, user) => performSuggest(['/command', 'list'], message, user));

botApi.bot.onCommand('top_day', async (command, message, user) => {
  const count = Math.max(Math.min(parseInt(command[1]) || 1, 20), 1);
  const aneks = await botApi.database.Anek
    .find({})
    .where({date: {$gte: Math.floor(new Date().getTime() / 1000) - 24 * 60 * 60}})
    .sort({likes: -1})
    .limit(count)
    .exec();

  return botApi.telegram.sendMessages(message.chat.id, [dict.translate(user.language, 'top_daily', {count: count})].concat(aneks), {language: user.language});
});
botApi.bot.onCommand('top_week', async (command, message, user) => {
  const count = Math.max(Math.min(parseInt(command[1]) || 3, 20), 1);
  const aneks = await botApi.database.Anek
    .find({})
    .where({date: {$gte: Math.floor(new Date().getTime() / 1000) - 24 * 60 * 60 * 7}})
    .sort({likes: -1})
    .limit(count)
    .exec();

  return botApi.telegram.sendMessages(message.chat.id, [dict.translate(user.language, 'top_weekly', {count: count})].concat(aneks), {language: user.language});
});
botApi.bot.onCommand('top_month', async (command, message, user) => {
  const count = Math.max(Math.min(parseInt(command[1]) || 5, 20), 1);
  const aneks = await botApi.database.Anek
    .find({})
    .where({date: {$gte: Math.floor(new Date().getTime() / 1000) - 24 * 60 * 60 * 30}})
    .sort({likes: -1})
    .limit(count)
    .exec();

  return botApi.telegram.sendMessages(message.chat.id, [dict.translate(user.language, 'top_monthly', {count: count})].concat(aneks), {language: user.language});
});
botApi.bot.onCommand('top_month', async (command, message, user) => {
  const count = Math.max(Math.min(parseInt(command[1]) || 10, 20), 1);
  const aneks = await botApi.database.Anek
    .find({})
    .sort({likes: -1})
    .limit(count)
    .exec();

  return botApi.telegram.sendMessages(message.chat.id, [dict.translate(user.language, 'top_ever', {count: count})].concat(aneks), {language: user.language});
});

botApi.bot.onCommand('donate', (command, message) => botApi.telegram.sendInvoice(message.from.id, {
  title: 'Донат на развитие бота',
  description: 'А то совсем нечего кушать',
  payload: 'lololo',
  prices: JSON.stringify([
    {label: 'Основной взнос', amount: 6000}
  ])
}));

botApi.bot.onCommand('subscribe', async (command, message) => {
  let user;

  if (command[1] && command[1] === 'chat' && message.from.id !== message.chat.id) {
    user = await botApi.user.updateWith(message.chat.id, {});
  } else {
    user = await botApi.database.User.findOne({user_id: message.from.id});
  }

  if (user) {
    if (!user.subscribed) {
      await botApi.user.updateWith(user, {subscribed: true});
      return botApi.telegram.sendMessage(user.user_id, dict.translate(user.language, 'subscribe_success', {first_name: user.first_name}));
    } else {
      return botApi.telegram.sendMessage(user.user_id, dict.translate(user.language, 'subscribe_fail'));
    }
  }
});
botApi.bot.onCommand('unsubscribe', async (command, message) => {
  let user;

  if (command[1] && command[1] === 'chat' && message.from.id !== message.chat.id) {
    user = await botApi.user.updateWith(message.chat.id, {});
  } else {
    user = await botApi.database.User.findOne({user_id: message.from.id});
  }

  if (user) {
    if (user.subscribed) {
      await botApi.user.updateWith(user, {subscribed: false});
      return botApi.telegram.sendMessage(user.user_id, dict.translate(user.language, 'unsubscribe_success', {first_name: user.first_name}));
    } else {
      return botApi.telegram.sendMessage(user.user_id, dict.translate(user.language, 'unsubscribe_fail'));
    }
  }
});

botApi.bot.onCommand('feedback', async (command, message, user) => {
  if (command[1] && user.admin) {
    command.splice(0, 1);

    const userId = command.splice(0, 1)[0];

    return botApi.telegram.sendMessage(userId, 'Сообщение от службы поддержки: ' + command.join(' '));
  } else if (user.feedback_mode) {
    return botApi.telegram.sendMessage(message.chat.id, 'Вы и так уже в режиме обратной связи.');
  }

  await botApi.user.updateWith(user, {feedback_mode: true});

  return botApi.telegram.sendMessage(message.chat.id, 'Режим обратной связи включен. Вы можете писать сюда' +
    ' любой текст (кроме команд) и он будет автоматически переведен в команду поддержки. Для остановки' +
    ' режима поддержки отправьте /unfeedback');
});
botApi.bot.onCommand('unfeedback', async (command, message, user) => {
  if (command[1] && user.admin) {
    command.splice(0, 1);

    const userId = command.splice(0, 1)[0];

    await botApi.database.User.findOneAndUpdate({user_id: userId}, {feedback_mode: false});

    return botApi.telegram.sendMessage(message.chat.id, 'Режим службы поддержки для пользователя ' + userId + ' отключен.');
  } else if (!user.feedback_mode) {
    return botApi.telegram.sendMessage(message.chat.id, 'Режим обратной связи и так отключен.');
  }

  await botApi.user.updateWith(user, {feedback_mode: false});

  return botApi.telegram.sendMessage(message.chat.id, 'Режим обратной связи отключен.');
});

botApi.bot.onCommand('grant', async (command, message, user) => {
  if (!user.admin) {
    throw new Error('Unauthorized access');
  }

  if (command.length <= 1) {
    return botApi.telegram.sendMessage(message.chat.id, 'Введите id пользователя.');
  }

  const privileges = {};

  if (command[2]) {
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
  }

  await botApi.database.User.findOneAndUpdate({user_id: parseInt(command[1])}, privileges);
  await botApi.telegram.sendMessage(parseInt(command[1]), 'Вам были выданы привилегии администратора пользователем ' + user.first_name + '(' + user.username + ')');

  return botApi.telegram.sendMessage(message.chat.id, 'Привилегии присвоены.');
});

botApi.bot.onCommand('birthday', (command, message) => botApi.telegram.sendRequest('sendPhoto', {
  chat_id: message.chat.id,
  photo: 'AgADAgADMagxGy3cYUribqypKXY_gAXZDw4ABKi3xzmLAAHaqMQjAQABAg'
}));

botApi.bot.onCommand('ban', async (command, message, user) => {
  if (command[1] && user.admin) {
    command.splice(0, 1);

    const userId = command.splice(0, 1)[0];

    await botApi.database.User.findOneAndUpdate({user_id: userId}, {banned: true});

    return botApi.telegram.sendMessage(message.chat.id, 'Пользователь ' + userId + ' забанен.');
  }
});
botApi.bot.onCommand('unban', async (command, message, user) => {
  if (command[1] && user.admin) {
    command.splice(0, 1);

    const userId = command.splice(0, 1)[0];

    await botApi.database.User.findOneAndUpdate({user_id: userId}, {banned: false});

    return botApi.telegram.sendMessage(message.chat.id, 'Пользователь ' + userId + ' разбанен.');
  }
});

botApi.bot.onCommand('find', async (command, message, user) => {
  command.splice(0, 1);

  const searchPhrase = command.join(' ');

  if (!searchPhrase.length) {
    if (searchPhrase.length < 4 && searchPhrase.length > 0) {
      return botApi.telegram.sendMessage(message.chat.id, dict.translate(user.language, 'search_query_short'));
    }
    return botApi.telegram.sendMessage(message.chat.id, dict.translate(user.language, 'search_query_empty'));
  }

  try {
    const aneks = await common.performSearch(searchPhrase, 1, 0, botApi.database);

    return botApi.bot.sendAnek(message.chat.id, aneks[0], {language: user.language});
  } catch (e) {
    console.error(e);

    return botApi.telegram.sendMessage(message.chat.id, dict.translate(user.language, 'search_query_not_found'));
  }
});

botApi.bot.onCommand('synchronize', async (command, message, user) => {
  if (!user.admin) {
    throw new Error('Unauthorized access');
  }

  return new Promise(function (resolve, reject) {
    const stream = botApi.database.Anek.synchronize();
    let count = 0;

    stream.on('data', function () {
      count++;
    });
    stream.on('close', function () {
      return resolve(count);
    });
    stream.on('error', function (err) {
      return reject(err);
    });
  }).then(function (count) {
    return botApi.telegram.sendMessage(message.chat.id, 'Successfully indexed ' + count + ' records');
  }).catch(function (error) {
    return botApi.telegram.sendMessage(message.chat.id, 'An error occured: ' + error.message);
  });
});

botApi.bot.on('suggest', async (suggest, user) => {
  const newSuggest = await botApi.database.Suggest(suggest).save();
  const buttons = [
    [
      {
        text: 'Подписаться',
        callback_data: 's_da ' + newSuggest._id
      },
      {
        text: 'Удалить',
        callback_data: 's_d ' + newSuggest._id
      }
    ]
  ];

  suggest.user = user;
  await botApi.user.updateWith(user, {suggest_mode: false});

  return botApi.telegram.sendMessage(user.user_id, {text: 'Предложка успешно добавлена.'}, {
    reply_markup: botApi.telegram.prepareInlineKeyboard(buttons)
  });
});

botApi.bot.on('callbackQuery', async (callbackQuery, user) => {
  const {data = ''} = callbackQuery;
  const queryData = data.split(' ');
  const params = {reply_to_message_id: callbackQuery.message.message_id};

  await botApi.telegram.answerCallbackQuery(callbackQuery.id);

  switch (queryData[0]) {
    case 'comment':
      const comments = await botApi.vk.getAllComments(queryData[1]);

      return comments
        .reduce((acc, anek) => acc.concat(anek.response.items), [])
        .sort((a, b) => b.likes.count - a.likes.count)
        .slice(0, 3)
        .map((comment, index) => ({...comment, text: dict.translate(user.language, 'th_place', {nth: (index + 1)}) + comment.text}))
        .map(comment => botApi.bot.sendComment(callbackQuery.message.chat.id, comment, params));
    case 'attach':
      const posts = await botApi.vk.getPostById(queryData[1]);
      let post = posts.response[0];

      if (!post) {
        throw new Error('Post not found');
      }

      if (!post.attachments && !post.copy_history) {
        throw new Error('Attachments not found');
      }

      while (!post.attachments && post.copy_history) {
        post = post.copy_history[0];
      }

      const attachments = botApi.bot.convertAttachments(post.attachments);

      return botApi.telegram.sendAttachments(callbackQuery.message.chat.id, attachments, params);
    case 'spam':
      await botApi.database.Anek.findOneAndUpdate({post_id: queryData[1]}, {spam: true});

      return botApi.telegram.sendMessage(callbackQuery.message.chat.id, 'Анек помечен как спам.');
    case 'unspam':
      await botApi.database.Anek.findOneAndUpdate({post_id: queryData[1]}, {spam: false});

      return botApi.telegram.sendMessage(callbackQuery.message.chat.id, 'Анек помечен как нормальный.');
    case 's_a':
      return acceptSuggest(queryData, callbackQuery, params, true);
    case 's_aa':
      return acceptSuggest(queryData, callbackQuery, params, false);
    case 's_d':
      await botApi.database.Suggest.findOneAndRemove({_id: botApi.database.Suggest.convertId(queryData[1])});

      return botApi.telegram.editMessageButtons(callbackQuery.message, []);
    case 's_da':
      await botApi.database.Suggest.findOneAndUpdate({_id: botApi.database.Suggest.convertId(queryData[1])}, {public: true});
      await botApi.telegram.editMessageButtons(callbackQuery.message, []);

      return botApi.telegram.sendMessage(callbackQuery.message.chat.id, 'Предложение будет опубликовано неанонимно.');
    case 'a_a':
      return botApi.database.Anek.findOneAndUpdate({_id: botApi.database.Anek.convertId(queryData[1])}, {});
  }

  throw new Error('Unknown callback query ' + queryData);
});

botApi.bot.on('inlineQuery', (inlineQuery, user) => {
  const aneksCount = 5;
  let results = [];
  let searchAction;

  if (inlineQuery.query) {
    searchAction = botApi.database.Anek.find({text: {$ne: ''}})
      .sort({date: -1})
      .skip(inlineQuery.offset || 0)
      .limit(aneksCount)
      .exec();
  } else {
    searchAction = common.performSearch(inlineQuery.query, aneksCount, inlineQuery.offset || 0);
  }

  return searchAction
    .then(aneks => {
      results = aneks.map(anek => {
        let highlightText = anek.text;

        if (anek._highlight && anek._highlight.text && anek._highlight.text.length) {
          highlightText = anek._highlight.text[0];
        }

        return {
          type: 'article',
          id: anek.post_id.toString(),
          title: botApi.dict.translate(user.language, 'anek_number', {number: anek.post_id || 0}),
          input_message_content: {
            message_text: anek.text,
            parse_mode: 'HTML'
          },
          description: highlightText.slice(0, 100)
        };
      });

      return botApi.telegram.sendInline(inlineQuery.id, results, inlineQuery.offset + aneksCount);
    })
    .catch(error => {
      console.error('inline querry error', error);

      return botApi.telegram.sendInline(inlineQuery.id, results, inlineQuery.offset + aneksCount);
    })
});
