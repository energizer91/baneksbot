/**
 * Created by energizer on 30.06.17.
 */

import * as config from "config";
import * as botApi from "../botApi";
import { AllMessageParams, TelegramErrorResponse } from "../models/telegram";
import { Anek, MultipleResponse } from "../models/vk";
import {
  Anek as AnekModel,
  ElasticHit,
  IAnek,
  IElasticSearchResult,
  IUser,
  User,
} from "./mongo";

export type PreparedAnek = {
  post_id: number;
  likes: number;
  reposts: number;
};

export const processAnek = (anek: Anek): PreparedAnek => {
  const { id, ...rest } = anek;

  return {
    ...rest,
    likes: anek.likes.count,
    post_id: anek.id,
    reposts: anek.reposts.count,
  };
};

export function searchAneks(
  searchPhrase: string,
  skip: number = 0,
  limit: number,
) {
  return AnekModel.find({ $text: { $search: searchPhrase } })
    .limit(limit)
    .skip(skip)
    .exec();
}

export function searchAneksElastic(
  searchPhrase: string,
  skip: number = 0,
  limit: number,
) {
  return new Promise((resolve, reject) => {
    return AnekModel.esSearch(
      {
        from: skip,
        query: {
          match: {
            text: searchPhrase,
          },
        },
        size: limit,
      },
      {},
      (err: Error, result: IElasticSearchResult<ElasticHit>) => {
        if (err) {
          return reject(err);
        }

        if (result && result.hits && result.hits.hits) {
          return resolve(result.hits.hits);
        }

        return resolve([]);
      },
    );
  });
}

export function performSearch(
  searchPhrase: string,
  skip: number,
  limit: number,
) {
  if (config.get<string>("mongodb.searchEngine") === "elastic") {
    return this.searchAneksElastic(searchPhrase, skip, limit);
  }

  return this.searchAneks(searchPhrase, skip, limit);
}

export async function getAneksUpdate(
  skip: number = 0,
  limit: number = 100,
  aneks: Anek[] = [],
): Promise<Anek[]> {
  const lastDBAnek = await AnekModel.findOne().sort({ date: -1 }).exec();
  const lastDBAnekDate = lastDBAnek ? lastDBAnek.date : 0;
  const vkAneks = await botApi.vk.getPosts(skip, limit);

  if (vkAneks.items[0] && vkAneks.items[0].is_pinned) {
    vkAneks.items.splice(0, 1);
  }

  // if there is no more new aneks
  if (!vkAneks.items.length) {
    // if recursion results are not empty
    if (aneks.length) {
      // insert recursion result and return them
      return aneks;
    }
  }

  // we have new aneks in response
  for (const vkAnek of vkAneks.items) {
    // check that we have newer than we have in db
    if (vkAnek.date > lastDBAnekDate) {
      // if we have, add it to bulk
      aneks.unshift(vkAnek);
    } else {
      // we found one which is older than db anek. so start adding it to db
      return aneks;
    }
  }

  // return recursion if all aneks in response are new
  return getAneksUpdate(skip + limit, limit, aneks);
}

export function getLastAneks(count: number = 100) {
  return botApi.vk.getPosts(0, count).then((response) => {
    return response.items.map((anek) => {
      return AnekModel.findOneAndUpdate(
        { post_id: anek.post_id },
        {
          comments: anek.comments,
          likes: anek.likes.count,
          reposts: anek.reposts.count,
        },
      );
    });
  });
}

export async function getAllAneks(start: number = 0) {
  const counter = await botApi.vk.getPostsCount();
  const requests = [];
  let current = counter.count - start;
  const goal = counter.hasPinned ? 1 : 0;
  let step = 100;

  while (current > goal) {
    if (current - step < goal) {
      step = current - goal;
    }

    current -= step;

    requests.push(botApi.vk.getPosts(current, step));
  }

  return botApi.bot.fulfillAll(requests);
}

export async function redefineDatabase(count: number) {
  const responses = await this.getAllAneks(count);

  const aneks = responses
    .reduce(
      (acc: Anek[], response: MultipleResponse<Anek>) =>
        acc.concat(response.items.reverse()),
      [],
    )
    .map(processAnek);

  if (aneks.length) {
    return AnekModel.insertMany(aneks)
      .catch((): [] => [])
      .then(() => aneks);
  }

  return [];
}

export async function updateAneks() {
  const responses = await this.getAllAneks();
  const bulk = AnekModel.collection.initializeOrderedBulkOp();

  responses.forEach((response: MultipleResponse<Anek>) => {
    response.items.forEach((anek) => {
      bulk.find({ post_id: anek.post_id }).update({
        $set: {
          comments: anek.comments,
          likes: anek.likes.count,
          reposts: anek.reposts.count,
        },
      });
    });
  });

  return bulk.execute();
}

export function filterAnek(anek: IAnek): boolean {
  const donate = (anek.text || "").indexOf("#донат") >= 0;
  const ads = anek.marked_as_ads;
  const empty = !anek.text || !anek.text.length;
  const long = anek.text && anek.text.length >= 2000;

  return !donate && !ads && !empty && !long;
}

export async function broadcastAneks(
  users: IUser[],
  aneks: IAnek[],
  params?: AllMessageParams,
): Promise<void> {
  const errorMessages: Set<number> = new Set();

  if (!users.length || !aneks.length) {
    return;
  }

  Promise.all(
    aneks.map((anek) =>
      botApi.bot.fulfillAll(
        users.map((user) =>
          botApi.bot
            .sendAnek(user.user_id, anek, {
              ...params,
              forceAttachments: user.force_attachments,
            })
            .catch((error: TelegramErrorResponse) => {
              if (
                (!error.ok && error.error_code === 403) ||
                error.description === "Bad Request: chat not found" ||
                error.description ===
                  "Bad Request: group chat was migrated to a supergroup chat" ||
                error.description === "Bad Request: chat_id is empty"
              ) {
                errorMessages.add(Number(user.user_id));

                return null;
              }

              return botApi.bot.sendMessageToAdmin(
                "Sending message error: " +
                  JSON.stringify(error) +
                  JSON.stringify(anek),
              );
            }),
        ),
      ),
    ),
  ).then(() => {
    const usersArray: number[] = Array.from(errorMessages);

    if (usersArray.length) {
      const text =
        usersArray.length +
        " message(s) has been sent with errors due to access errors. Unsubscribing them: \n" +
        usersArray.join(", ");
      const bulk = User.collection.initializeOrderedBulkOp();

      bulk
        .find({ user_id: { $in: usersArray } })
        .update({ $set: { subscribed: false, deleted_subscribe: true } });
      botApi.bot.sendMessageToAdmin(text);

      return bulk.execute();
    }
  });
}
