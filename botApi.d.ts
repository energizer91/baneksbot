// @flow
import Bot = require("./models/bot");
import Vk = require('./models/vk');
import User = require('./models/user');
import Statistics = require('./models/statistics');
import Database = require('./helpers/mongo');

declare type BotApi = {
    connect(app: {}): void,
    updater: {
        connected: boolean,
        connect(): void,
        sendMessage(message: {}): void,
    },
    bot: Bot,
    database: Database,
    user: User,
    statistics: Statistics,
    vk: Vk
};

export = BotApi;
