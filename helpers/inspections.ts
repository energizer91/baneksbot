import * as botApi from "../botApi";
import Vk from "../models/vk";
import {
  Anek as AnekModel,
  ElasticHit,
  IAnek,
  IElasticSearchResult,
} from "./mongo";

type ValidationResult = {
  ok: boolean;
  reason?: string[];
};

export async function isLong(
  anek: IAnek,
  length: number = 2000,
): Promise<ValidationResult> {
  const ok = anek.text.length <= length;

  return {
    ok,
    reason: !ok && [
      "Длина анека превышает комфортную длину в " + length + " символа(ов)",
    ],
  };
}

export async function isAds(anek: IAnek): Promise<ValidationResult> {
  const ok = !anek.marked_as_ads;

  return {
    ok,
    reason: !ok && ["Анек помечен как реклама"],
  };
}

export async function hasHashTags(anek: IAnek): Promise<ValidationResult> {
  const hashTag = (anek.text || "").match(
    /(?:\s|^)#[A-Za-z0-9а-яА-Я\-\.\_]+(?:\s|$)/g,
  );
  const ok = !hashTag;

  return {
    ok,
    reason: !ok && ["Анек содержит хэштеги: " + hashTag.join(", ")],
  };
}

export async function hasAttachments(anek: IAnek): Promise<ValidationResult> {
  const ok = !anek.attachments.length;

  return {
    ok,
    reason: !ok && ["Анек содержит вложения: " + anek.attachments.length],
  };
}

export async function similar(
  anek: IAnek,
  similarity: number = 0.9,
): Promise<ValidationResult> {
  return new Promise((resolve, reject) => {
    return AnekModel.esSearch(
      {
        query: {
          more_like_this: {
            fields: ["text"],
            like: {
              _id: anek._id,
            },
            min_doc_freq: 1,
            min_term_freq: 1,
            minimum_should_match: Math.round(similarity * 100) + "%",
          },
        },
        size: 3,
      },
      {
        hydrateWithESResults: true,
      },
      (err: Error, result: IElasticSearchResult<ElasticHit>) => {
        if (err) {
          return reject(err);
        }

        if (result && result.hits && result.hits.hits) {
          const results = result.hits.hits.map(
            (hit) =>
              "Совпадение с анеком [" +
              hit.post_id +
              "](" +
              Vk.getAnekLink(hit.post_id) +
              ")",
          );
          const ok = !results.length;

          return resolve({
            ok,
            reason: !ok && results,
          });
        }

        return resolve({
          ok: true,
        });
      },
    );
  });
}

export default async function inspect(anek: IAnek): Promise<ValidationResult> {
  const results = await botApi.bot.fulfillAll([
    isLong(anek),
    hasAttachments(anek),
    isAds(anek),
    hasHashTags(anek),
    similar(anek),
  ]);

  return results.reduce(
    (acc: ValidationResult, current) => ({
      ok: acc.ok && current.ok,
      reason: current.reason ? acc.reason.concat(current.reason) : acc.reason,
    }),
    {
      ok: true,
      reason: [],
    },
  );
}
