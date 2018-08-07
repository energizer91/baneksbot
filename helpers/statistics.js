/**
 * Created by Александр on 19.06.2017.
 */

const database = require('./mongo');

module.exports = {
  calculateUserStatistics: function (from, to) {
    const result = {
      count: 0,
      new: 0,
      subscribed: 0,
      newly_subscribed: 0,
      unsubscribed: 0
    };
    const fromDate = new Date(from || 0);
    const toDate = new Date(to || Date.now());
    return database.User.count({}).then(count => {
      result.count = count;

      return database.User.find({subscribed: true}).count();
    }).then(count => {
      result.subscribed = count;

      return database.Log.find({'request.message.text': '/subscribe', date: {$gte: fromDate, $lte: toDate}}).count();
    }).then(count => {
      result.newly_subscribed = count;

      return database.Log.find({'request.message.text': '/unsubscribe', date: {$gte: fromDate, $lte: toDate}}).count();
    }).then(count => {
      result.unsubscribed = count;

      return database.User.find({date: {$gte: fromDate, $lte: toDate}}).count();
    }).then(count => {
      result.new = count;

      return result;
    });
  },
  calculateAneksStatistics: function (from, to) {
    const result = {count: 0, new: 0};
    const fromDate = new Date(from).getTime() / 1000;
    const toDate = new Date(to).getTime() / 1000;

    return database.Anek.count({}).then(count => {
      result.count = count;

      return database.Anek.find({date: {$gte: fromDate, $lte: toDate}}).count();
    }).then(count => {
      result.new = count;

      return result;
    });
  },
  calculateMessagesStatistics: function (from, to) {
    const result = {received: 0};
    const fromDate = new Date(from || 0);
    const toDate = new Date(to || Date.now());

    return database.Log.count({date: {$gte: fromDate, $lte: toDate}}).then(count => {
      result.received = count;

      return result;
    });
  },
  calculateStatistics: function (from, to) {
    const result = {
      users: {},
      aneks: {},
      messages: {},
      date: new Date()
    };

    return database.Statistic.find({}).sort({date: -1}).limit(1).exec().then(statistics => {
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

      return new database.Statistic(result).save().then(() => {
        return result;
      });
    });
  },
  getOverallStatistics: function (from, to) {
    return database.Statistic.find({date: {$gte: from, $lte: to}})
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
};
