/**
 * Created by Александр on 19.06.2017.
 */

module.exports = function (configs) {
    var requestHelper = require('./request')(configs);

    return {
        calculateStatistics: function (db, date) {
            var result = {
                count: 0,
                new: 0,
                subscribed: 0,
                unsubscribed: 0
            };
            return db.User.count({}).then(count => {
                result.count = count;

                console.log('users count', count);

                return db.Log.find({'request.message.text': '/subscribe', date: {$gte: new Date(date)}}).count();
            }).then(count => {
                result.subscribed = count;

                console.log('subscribed count', count);

                return db.Log.find({'request.message.text': '/unsubscribe', date: {$gte: new Date(date)}}).count();
            }).then(count => {
                result.unsubscribed = count;

                console.log('unsubscribed count', count);

                return db.User.find({date: {$gte: new Date(date)}}).count();
            }).then(count => {
                result.new = count;

                console.log('new count', count);

                return result;
            });
        }
    };
};