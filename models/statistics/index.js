class Statistics {
  constructor (database) {
    this.database = database;
  }

  calculateUserStatistics (from, to) {
    const result = {
      count: 0,
      new: 0,
      subscribed: 0,
      newly_subscribed: 0,
      unsubscribed: 0
    };
    const fromDate = new Date(from || 0);
    const toDate = new Date(to || Date.now());
    return this.database.User.count({}).then(count => {
      result.count = count;

      return this.database.User.find({subscribed: true}).count();
    }).then(count => {
      result.subscribed = count;

      return this.database.Log.find({'request.message.text': '/subscribe', date: {$gte: fromDate, $lte: toDate}}).count();
    }).then(count => {
      result.newly_subscribed = count;

      return this.database.Log.find({'request.message.text': '/unsubscribe', date: {$gte: fromDate, $lte: toDate}}).count();
    }).then(count => {
      result.unsubscribed = count;

      return this.database.User.find({date: {$gte: fromDate, $lte: toDate}}).count();
    }).then(count => {
      result.new = count;

      return result;
    });
  }

  calculateAneksStatistics (from, to) {
    const result = {count: 0, new: 0};
    const fromDate = new Date(from).getTime() / 1000;
    const toDate = new Date(to).getTime() / 1000;

    return this.database.Anek.count({}).then(count => {
      result.count = count;

      return this.database.Anek.find({date: {$gte: fromDate, $lte: toDate}}).count();
    }).then(count => {
      result.new = count;

      return result;
    });
  }

  calculateMessagesStatistics (from, to) {
    const result = {received: 0};
    const fromDate = new Date(from || 0);
    const toDate = new Date(to || Date.now());

    return this.database.Log.count({date: {$gte: fromDate, $lte: toDate}}).then(count => {
      result.received = count;

      return result;
    });
  }

  calculateStatistics (from, to) {
    const result = {
      users: {},
      aneks: {},
      messages: {},
      date: new Date()
    };

    return this.database.Statistic.find({}).sort({date: -1}).limit(1).exec().then(statistics => {
      if (!(statistics && statistics.length)) {
        from = 0;
      } else {
        from = statistics[0].date;
      }

      if (!to) {
        to = new Date();
      }

      return this.calculateUserStatistics(from, to);
    }).then(users => {
      result.users = users;

      return this.calculateAneksStatistics(from, to);
    }).then(aneks => {
      result.aneks = aneks;

      return this.calculateMessagesStatistics(from, to);
    }).then(messages => {
      result.messages = messages;

      return new this.database.Statistic(result).save().then(() => {
        return result;
      });
    });
  }

  getOverallStatistics (from, to) {
    return this.database.Statistic.find({date: {$gte: from, $lte: to}})
      .then(result => result.reduce((p, c) => {
        p.users.count = c.users.count;
        p.users.new += c.users.new;
        p.users.subscribed = c.users.subscribed;
        p.users.newly_subscribed += c.users.newly_subscribed;
        p.users.unsubscribed += c.users.unsubscribed;

        p.aneks.count = c.aneks.count;
        p.aneks.new += c.aneks.new;

        p.messages.received += c.messages.received;

        return p;
      },
      {
        users: {
          count: 0,
          new: 0,
          subscribed: 0,
          newly_subscribed: 0,
          unsubscribed: 0
        },
        aneks: {
          count: 0,
          new: 0
        },
        messages: {
          received: 0
        }
      }));
  }
}

module.exports = Statistics;
