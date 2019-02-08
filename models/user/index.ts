import {NextFunction, Request, Response} from 'express';
import {IUser, User as UserModel} from '../../helpers/mongo';
import {Chat, User as UserType} from '../telegram';

class User {
  public update(user: IUser | UserType) {
    return this.updateWith(user);
  }

  public async updateWith(user: UserType | Chat | IUser, params?: any): Promise<IUser | void> {
    if (!user) {
      return;
    }

    return UserModel.findOneAndUpdate(
      // @ts-ignoressd
      {user_id: user.user_id || user.id},
      params || user,
      {new: true, upsert: true, setDefaultsOnInsert: true}
    )
      .catch((error: Error) => {
        console.error(error);

        return user as IUser;
      });
  }

  public middleware = (req: Request & {user: IUser}, res: Response, next: NextFunction) => {
    const update = req.body;
    const message = update.message || update.inline_query || update.callback_query;
    const user = message.from;

    return this.update(user)
      .then((updatedUser: IUser) => {
        req.user = updatedUser;

        return next();
      });
  }
}

export default User;
