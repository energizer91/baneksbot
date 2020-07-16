import {NextFunction, Request, Response} from 'express';
import {IUser, User as UserModel} from '../../helpers/mongo';
import {Chat, User as UserType} from '../telegram';

export interface ITelegramRequest extends Request {
  user: IUser | void;
  chat: IUser | void;
}

class User {
  public update(user: IUser | UserType) {
    return this.updateWith(user);
  }

  public async updateWith(user: UserType | Chat | IUser, params?: any): Promise<IUser | void> {
    if (!user) {
      return;
    }

    return UserModel.findOneAndUpdate(
      // @ts-ignore
      {user_id: user.user_id || user.id},
      params || user,
      {new: true, upsert: true, setDefaultsOnInsert: true}
    )
      .catch((error: Error) => {
        console.error(error);

        return user as IUser;
      });
  }

  public middleware = async (req: ITelegramRequest, res: Response, next: NextFunction) => {
    const update = req.body;
    const message = update.message || update.inline_query || update.callback_query;
    const user = message.from;
    const chat = message.chat;

    const updatedUser = await this.update(user);
    const updatedChat = await this.update(chat);

    req.user = updatedUser;
    req.chat = updatedChat;

    return next();
  }
}

export default User;
