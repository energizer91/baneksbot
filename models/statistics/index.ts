import {Database} from '../../helpers/mongo';

class Statistics {
  private database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  public async calculateUserStatistics(from: Date, to: Date) {
    const fromDate = new Date(from || 0);
    const toDate = new Date(to || Date.now());

    return {
      count: await this.database.User.count({}),
      new: await this.database.User.find({date: {$gte: fromDate, $lte: toDate}}).count(),
      newly_subscribed: await this.database.Log.find({'request.message.text': '/subscribe', "date": {$gte: fromDate, $lte: toDate}}).count(),
      subscribed: await this.database.User.find({subscribed: true}).count(),
      unsubscribed: await this.database.Log.find({'request.message.text': '/unsubscribe', "date": {$gte: fromDate, $lte: toDate}}).count()
    };
  }

  public async calculateAneksStatistics(from: Date, to: Date) {
    const fromDate = new Date(from).getTime() / 1000;
    const toDate = new Date(to).getTime() / 1000;

    return {
      count: await this.database.Anek.count({}),
      new: await this.database.Anek.find({date: {$gte: fromDate, $lte: toDate}}).count()
    };
  }

  public async calculateMessagesStatistics(from: Date, to: Date) {
    const fromDate = new Date(from || 0);
    const toDate = new Date(to || Date.now());

    return {
      received: await this.database.Log.count({date: {$gte: fromDate, $lte: toDate}})
    };
  }

  public calculateStatistics(from: Date, to: Date) {
    const result = {
      aneks: {},
      date: new Date(),
      messages: {},
      users: {}
    };

    return this.database.Statistic.find({}).sort({date: -1}).limit(1).exec().then((statistics) => {
      if (!(statistics && statistics.length)) {
        from = new Date(0);
      } else {
        from = statistics[0].date;
      }

      if (!to) {
        to = new Date();
      }

      return this.calculateUserStatistics(from, to);
    }).then((users) => {
      result.users = users;

      return this.calculateAneksStatistics(from, to);
    }).then((aneks) => {
      result.aneks = aneks;

      return this.calculateMessagesStatistics(from, to);
    }).then((messages) => {
      result.messages = messages;

      return new this.database.Statistic(result).save().then(() => {
        return result;
      });
    });
  }

  public getOverallStatistics(from: Date, to: Date) {
    return this.database.Statistic.find({date: {$gte: from, $lte: to}})
      .then((result) => result.reduce((p, c) => {
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
        aneks: {
          count: 0,
          new: 0
        },
        messages: {
          received: 0
        },
        users: {
          count: 0,
          new: 0,
          newly_subscribed: 0,
          subscribed: 0,
          unsubscribed: 0
        }
      }));
  }
}

export default Statistics;
