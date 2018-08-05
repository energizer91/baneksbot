class User {
  constructor(database) {
    this.database = database;
    this.userMiddleware = this.userMiddleware.bind(this);
  }

  /**
   * Updates user
   * @param {Telegram.User | Telegram.Chat} [user]
   * @returns {Promise<Telegram.User> | void}
   */
  update(user) {
    if (!user) {
      return Promise.resolve();
    }

    return this.database.User.findOneAndUpdate({user_id: user.id}, user, {new: true, upsert: true, setDefaultsOnInsert: true})
      .catch(error => {
        console.error(error);

        return user;
      });
  }

  userMiddleware(req, res, next) {
    const {update} = req;
    const message = update.message || update.inline_query || update.callback_query;
    const user = message.from;

    return this.update(user)
      .then(user => {
        req.user = user;

        return next();
      });
  }
}

module.exports = User;