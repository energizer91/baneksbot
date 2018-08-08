class User {
  constructor (database) {
    this.database = database;
    this.middleware = this.middleware.bind(this);
  }

  update (user) {
    return this.updateWith(user);
  }

  updateWith (user, params = {}) {
    if (!user) {
      return {};
    }

    return this.database.User.findOneAndUpdate(
      {user_id: user.user_id || user.id},
      params || user,
      {new: true, upsert: true, setDefaultsOnInsert: true}
    )
      .catch(error => {
        console.error(error);

        return user;
      })
  }

  middleware (req, res, next) {
    const update = req.body;
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
