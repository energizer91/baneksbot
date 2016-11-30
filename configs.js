/**
 * Created by Алекс on 29.11.2016.
 */

module.exports = {
    mongo: require('./config/mongodb'),
    mysql: require('./config/mysql'),
    bot: require('./config/telegram'),
    vk: require('./config/vk')
};