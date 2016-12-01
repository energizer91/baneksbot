/**
 * Created by Алекс on 29.11.2016.
 */

module.exports = function (configs) {
    return {
        bot: require('./helpers/bot')(configs),
        mongo: require('./helpers/mongo')(configs),
        mysql: require('./helpers/mysql')(configs),
        request: require('./helpers/request')(configs),
        vk: require('./helpers/vk')(configs),
        dict: require('./helpers/dictionary')
    }
};