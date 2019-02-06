/// <reference types="node" />

declare module 'mongoosastic' {
  import * as mongoose from "mongoose";

  export type PluginOptions = {
    hosts?: string[],
    hydrate?: boolean,
    hydrateOptions?: {
      select?: string
    }
  };

  export type SearchQuery = {
    from: number,
    query: {
      match: {
        text: string
      }
    },
    size: number
  };

  export type SearchParams = {
    highlight: {
      fields: {
        text: {}
      },
      post_tags: string[],
      pre_tags: string[]
    }
  };

  export interface IElasticSearchResult<T> {
    hits: {
      hits: Array<T & {_highlight: string}>
    };
  }

  export type SearchCallback = (err: Error, result: IElasticSearchResult<any>) => void;

  export default function Mongoosastic(schema: mongoose.Schema, pluginOpts: PluginOptions): void;
}
