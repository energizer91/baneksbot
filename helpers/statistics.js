/**
 * Created by Александр on 19.06.2017.
 */

module.exports = {
  calculateUserStatistics: function (db, from, to) {
    const result = {
      count: 0,
      new: 0,
      subscribed: 0,
      newly_subscribed: 0,
      unsubscribed: 0
    };
    const fromDate = new Date(from || 0);
    const toDate = new Date(to || Date.now());
    return db.User.count({}).then(count => {
      result.count = count;

      return db.User.find({subscribed: true}).count();
    }).then(count => {
      result.subscribed = count;

      return db.Log.find({'request.message.text': '/subscribe', date: {$gte: fromDate, $lte: toDate}}).count();
    }).then(count => {
      result.newly_subscribed = count;

      return db.Log.find({'request.message.text': '/unsubscribe', date: {$gte: fromDate, $lte: toDate}}).count();
    }).then(count => {
      result.unsubscribed = count;

      return db.User.find({date: {$gte: fromDate, $lte: toDate}}).count();
    }).then(count => {
      result.new = count;

      return result;
    });
  },
  calculateAneksStatistics: function (db, from, to) {
    const result = {count: 0, new: 0};
    const fromDate = new Date(from).getTime() / 1000;
    const toDate = new Date(to).getTime() / 1000;

    return db.Anek.count({}).then(count => {
      result.count = count;

      return db.Anek.find({date: {$gte: fromDate, $lte: toDate}}).count();
    }).then(count => {
      result.new = count;

      return result;
    });
  },
  calculateMessagesStatistics: function (db, from, to) {
    const result = {received: 0};
    const fromDate = new Date(from || 0);
    const toDate = new Date(to || Date.now());

    return db.Log.count({date: {$gte: fromDate, $lte: toDate}}).then(count => {
      result.received = count;

      return result;
    });
  },
  calculateStatistics: function (db, from, to) {
    const result = {
      users: {},
      aneks: {},
      messages: {},
      date: new Date()
    };

    return db.Statistic.find({}).sort({date: -1}).limit(1).exec().then(statistics => {
      if (!(statistics && statistics.length)) {
        from = 0;
      } else {
        from = statistics[0].date;
      }

      if (!to) {
        to = new Date();
      }

      return this.calculateUserStatistics(db, from, to);
    }).then(users => {
      result.users = users;

      return this.calculateAneksStatistics(db, from, to);
    }).then(aneks => {
      result.aneks = aneks;

      return this.calculateMessagesStatistics(db, from, to);
    }).then(messages => {
      result.messages = messages;

      return new db.Statistic(result).save().then(() => {
        return result;
      });
    });
  },
  getOverallStatistics: function (db, from, to) {
    return db.Statistic.find({date: {$gte: from, $lte: to}})
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
