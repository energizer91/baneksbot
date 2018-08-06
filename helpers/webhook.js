module.exports = function (configs, botApi) {
  const commands = require('./commands')(configs, botApi);
  const common = require('./common')(configs);

  /**
   *
   * @param {InlineQuery} query
   * @param params
   * @returns {Promise}
   */
  function performInline (query, params) {
    let results = [];
    let aneksCount = 5;
    let searchAction;

    if (!params) {
      params = {};
    }
    if (!query.query) {
      searchAction = botApi.mongo.Anek.find({text: {$ne: ''}})
        .sort({date: -1})
        .skip(query.offset || 0)
        .limit(aneksCount)
        .exec();
    } else {
      searchAction = common.performSearch(query.query, aneksCount, query.offset || 0, botApi.mongo);
    }
    return searchAction.then(function (aneks) {
      results = aneks.map(function (anek) {
        let highlightText = anek.text;

        if (anek._highlight && anek._highlight.text && anek._highlight.text.length) {
          highlightText = anek._highlight.text[0];
        }

        return {
          type: 'article',
          id: anek.post_id.toString(),
          title: botApi.dict.translate(params.language, 'anek_number', {number: anek.post_id || 0}),
          input_message_content: {
            message_text: anek.text,
            parse_mode: 'HTML'
          },
          description: highlightText.slice(0, 100)
        };
      });

      return botApi.telegram.sendInline(query.id, results, query.offset + aneksCount);
    }).catch(function () {
      return botApi.bot.sendInline(query.id, results, query.offset + aneksCount);
    });
  }

  function acceptSuggest (queryData, data, params, anonymous) {
    return botApi.mongo.Suggest.findOneAndUpdate({_id: botApi.mongo.Suggest.convertId(queryData[1])}, {approved: true}).then(function (suggest) {
      return botApi.bot.answerCallbackQuery(data.callback_query.id)
        .then(botApi.bot.editMessageButtons.bind(botApi.bot, data.callback_query.message, []))
        .then(botApi.bot.forwardMessageToChannel.bind(botApi.bot, suggest, {native: anonymous}))
        .then(function (sendMessage) {
          return botApi.bot.sendMessage(data.callback_query.message.chat.id, 'Предложение одобрено.').then(function () {
            return botApi.mongo.User.findOne({_id: suggest.user}).then(function (foundUser) {
              if (sendMessage.ok && sendMessage.result) {
                return botApi.bot.forwardMessage(foundUser.user_id, sendMessage.result, {native: true});
              }
            });
          });
        });
    });
  }

  function performCallbackQuery (queryData, data, params) {
    if (!params) {
      params = {};
    }
    switch (queryData[0]) {
      case 'comment':
        let aneks = [];
        return getAllComments(queryData[1]).then(function (comments) {
          comments.forEach(function (comment) {
            aneks = aneks.concat(comment.response.items);
          });
          aneks = aneks.sort(function (a, b) {
            return b.likes.count - a.likes.count;
          }).slice(0, 3).map(function (comment, index) {
            comment.text = botApi.dict.translate(params.language, 'th_place', {nth: (index + 1)}) + comment.text;
            if (data && data.callback_query && data.callback_query.message && data.callback_query.message.message_id) {
              comment.reply_to_message_id = data.callback_query.message.message_id;
            }
            return comment;
          });

          params.disableButtons = true;
          params.forceAttachments = true;

          return botApi.bot.answerCallbackQuery(data.callback_query.id)
            .then(function () {
              return botApi.bot.sendMessages(data.callback_query.message.chat.id, aneks, params);
            });
        });
      case 'attach':
        return botApi.vk.getPostById(queryData[1]).then(function (posts) {
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

          return botApi.bot.answerCallbackQuery(data.callback_query.id)
            .then(function () {
              return botApi.bot.sendAttachments(data.callback_query.message.chat.id, post.attachments.map(function (attachment) {
                if (data && data.callback_query && data.callback_query.message && data.callback_query.message.message_id) {
                  attachment.reply_to_message_id = data.callback_query.message.message_id;
                }
                return attachment;
              }));
            });
        });
      case 'spam':
        return botApi.mongo.Anek.findOneAndUpdate({post_id: queryData[1]}, {spam: true}).then(function () {
          return botApi.bot.answerCallbackQuery(data.callback_query.id).then(function () {
            return botApi.bot.sendMessage(data.callback_query.message.chat.id, 'Анек помечен как спам.');
          });
        });
      case 'unspam':
        return botApi.mongo.Anek.findOneAndUpdate({post_id: queryData[1]}, {spam: false}).then(function () {
          return botApi.bot.answerCallbackQuery(data.callback_query.id).then(function () {
            return botApi.bot.sendMessage(data.callback_query.message.chat.id, 'Анек помечен как нормальный.');
          });
        });
      case 's_a':
        return acceptSuggest(queryData, data, params, true);
      case 's_aa':
        return acceptSuggest(queryData, data, params, false);
      case 's_d':
        return botApi.mongo.Suggest.findOneAndRemove({_id: botApi.mongo.Suggest.convertId(queryData[1])})
          .then(botApi.bot.answerCallbackQuery.bind(botApi.bot, data.callback_query.id))
          .then(botApi.bot.editMessageButtons.bind(botApi.bot, data.callback_query.message, []));
      case 's_da':
        return botApi.mongo.Suggest.findOneAndUpdate({_id: botApi.mongo.Suggest.convertId(queryData[1])}, {public: true}).then(function () {
          return botApi.bot.answerCallbackQuery(data.callback_query.id)
            .then(botApi.bot.editMessageButtons.bind(botApi.bot, data.callback_query.message, []))
            .then(botApi.bot.sendMessage.bind(botApi.bot, data.callback_query.message.chat.id, 'Предложение будет опубликовано неанонимно.'));
        });
      case 'a_a':
        return botApi.mongo.Anek.findOneAndUpdate({_id: botApi.mongo.Anek.convertId(queryData[1])}, {});
    }

    throw new Error('Unknown callback query ' + queryData);
  }

  /**
   * Performs webhook from ingoing message
   * @param {Update} data Telegram update data
   * @param response
   * @returns {Promise<any>}
   */
  function performWebHook (data, response) {
    return new Promise(function (resolve, reject) {
      response.status(200);
      response.json({status: 'OK'});

      if (!data) {
        return reject(new Error('No webhook data specified'));
      }

      if (data.hasOwnProperty('pre_checkout_query')) {
        return resolve({});
      }

      let userObject = data.message || data.inline_query || data.callback_query;

      common.updateUser((userObject || {}).from, botApi.mongo, function (err, user) {
        if (err) {
          console.error(err);
          return resolve({});
        }
        return resolve(user);
      });
    }).then(function (user) {
      if (data.hasOwnProperty('pre_checkout_query')) {
        console.log('Performing pre checkout query from ' + botApi.bot.getUserInfo(user));
        return botApi.bot.answerPreCheckoutQuery(data.pre_checkout_query.id, true);
      } else if (data.hasOwnProperty('callback_query')) {
        console.log('Performing callback query from ' + botApi.bot.getUserInfo(user));

        const queryData = data.callback_query.data.split(' ');

        return performCallbackQuery(queryData, data, {language: user.language});
      } else if (data.hasOwnProperty('inline_query')) {
        console.log('Performing inline query from ' + botApi.bot.getUserInfo(user));
        return performInline(data.inline_query, {language: user.language});
      } else if (data.message) {
        console.log('Performing message from ' + botApi.bot.getUserInfo(user));

        const message = data.message;

        if (message.successful_payment) {
          return botApi.bot.sendMessageToAdmin('Вам задонатили ' + (message.successful_payment.total_amount / 100) + message.successful_payment.currency).then(function () {
            return botApi.bot.sendMessage(message.from.id, 'Большое спасибо за донат!');
          });
        } else if (message.new_chat_member) {
          return botApi.bot.sendMessage(message.chat.id, 'Эгегей, ёбанный в рот!');
        } else if (message.left_chat_member) {
          return botApi.bot.sendMessage(message.chat.id, 'Мы не будем сильно скучать.');
        } else if (user.suggest_mode && !user.banned) {
          const suggest = message;

          suggest.user = user;

          return new botApi.mongo.Suggest(suggest).save().then(function (newSuggest) {
            user.suggest_mode = false;
            return botApi.mongo.User.findOneAndUpdate({user_id: user.user_id}, user).then(function () {
              return botApi.bot.sendMessage(user.user_id, {text: 'Предложка успешно добавлена.'}, {
                buttons: [
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
                ]
              });
            });
          });
        } else if (message.reply_to_message && message.reply_to_message.forward_from) {
          return botApi.mongo.User.findOne({user_id: message.reply_to_message.forward_from.id}).then(function (feedbackUser) {
            if (feedbackUser.feedback_mode) {
              return commands.performCommand(['/feedback', message.reply_to_message.forward_from.id, message.text], message, user);
            }

            throw new Error('Unknown reply action');
          });
        } else if (message.text) {
          const command = (message.text || '').split(' ');

          if (command[0].indexOf('@') >= 0) {
            command[0] = command[0].split('@')[0];
          }

          if (commands.commands[command[0]]) {
            return commands.performCommand(command, message, user);
          } else {
            if (user.feedback_mode && !user.banned) {
              return botApi.bot.forwardMessage(configs.bot.adminChat, message, {native: true});
            }

            console.error('Unknown command', data);

            throw new Error('Command not found: ' + command.join(' '));
          }
        }
      }

      console.error('unhandled message', data);

      throw new Error('No message specified');
    }).then(function (response) {
      return common.writeLog(data, botApi.mongo, response).then(function () {
        return response;
      });
    }).catch(function (error) {
      console.error(error);
      return common.writeLog(data, botApi.mongo, {}, error).then(function () {
        return error;
      });
    });
  }

  function getAllComments (postId) {
    return botApi.vk.getCommentsCount(postId).then(function (counter) {
      const requests = [];
      let current = counter;
      let goal = 0;
      let step = 100;

      while (current > goal) {
        if (current - step < goal) {
          step = current - goal;
        }

        current -= step;

        requests.push(botApi.vk.getComments({post_id: postId, offset: current, count: step}));
      }

      return botApi.request.fulfillAll(requests);
    });
  }

  return performWebHook;
};
