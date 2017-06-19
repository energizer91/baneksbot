/**
 * Created by Александр on 19.06.2017.
 */

module.exports = function (configs) {
    const requestHelper = require('./request')(configs);

    return {
        calculateStatistics: function (db, date) {
            let result = {
                count: 0,
                new: 0,
                subscribed: 0,
                unsubscribed: 0
            };
            return db.User.count({}).then(count => {
                result.count = count;

                return db.Log.find({'request.message.text': '/subscribe', date: {$gte: new Date(date)}}).count();
            }).then(count => {
                result.subscribed = count;

                return db.Log.find({'request.message.text': '/unsubscribe', date: {$gte: new Date(date)}}).count();
            }).then(count => {
                result.unsubscribed = count;

                return db.User.find({date: {$gte: new Date(date)}}).count();
            }).then(count => {
                result.new = count;

                return result;
            });
        }
    };
};