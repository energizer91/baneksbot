import Database = require('../../helpers/mongo');
import Telegram = require('../telegram');

declare class User {
    update(user: Telegram): Promise<Database.IUser>;

    middleware(req: { update: Telegram.Update }, res: {}, next: Function): void;
}

export = User;
