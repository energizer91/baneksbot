import { NextFunction, Request, Response } from "express";
import { usersCreatedTotal } from "../../helpers/metrics";
import { IUser, User as UserModel } from "../../helpers/mongo";
import { Chat, User as UserType } from "../telegram";

export interface ITelegramRequest extends Request {
  user: IUser | void;
  chat: IUser | void;
}

class User {
  public update(user: IUser | UserType) {
    return this.updateWith(user);
  }

  public async updateWith(
    user: UserType | Chat | IUser,
    params?: any,
  ): Promise<IUser> {
    if (!user) {
      return;
    }

    try {
      const result: any = await (UserModel as any)
        .findOneAndUpdate(
          // @ts-ignore
          { user_id: user.user_id || user.id },
          params || user,
          {
            new: true,
            rawResult: true,
            setDefaultsOnInsert: true,
            upsert: true,
          },
        )
        .exec();

      const created = Boolean(
        result && result.lastErrorObject && result.lastErrorObject.upserted,
      );

      if (created) {
        const isChat = Boolean(
          // @ts-ignore
          typeof (user as Chat).type === "string",
        );
        usersCreatedTotal.inc({ kind: isChat ? "chat" : "user" });
      }

      return (result && result.value) || (user as IUser);
    } catch (error) {
      console.error(error);

      return user as IUser;
    }
  }

  public middleware = async (
    req: ITelegramRequest,
    res: Response,
    next: NextFunction,
  ) => {
    const update = req.body;
    const message =
      update.message || update.inline_query || update.callback_query;
    const user = message && message.from;
    const chat = message && message.chat;

    const updatedUser = await this.update(user);
    const updatedChat = await this.update(chat);

    req.user = updatedUser;
    req.chat = updatedChat;

    return next();
  };
}

export default User;
