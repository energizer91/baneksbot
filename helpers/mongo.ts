/**
 * Created by xgmv84 on 11/26/2016.
 */

import * as config from 'config';
import * as mongoose from 'mongoose';
import {Stream} from "stream";

import debugFactory from './debug';

// There are no typings for mongoose
// tslint:disable-next-line
const mongoosastic = require('mongoosastic');

const debug = debugFactory('baneks-node:mongo');
const error = debugFactory('baneks-node:mongo:error', true);

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

export interface IUser extends mongoose.Document {
  username: string;
  first_name: string;
  last_name: string;
  title: string;
  user_id: number;
  subscribed: boolean;
  deleted_subscribe: boolean;
  feedback_mode: boolean;
  force_attachments: boolean;
  suggest_mode: boolean;
  admin: boolean;
  editor: boolean;
  keyboard: boolean;
  banned: boolean;
  language: string;
  client: string;
  pin: string;
  date: mongoose.Schema.Types.Date;
}

export interface IAnek extends mongoose.Document {
  attachments: any[];
  copy_history: any[];
  date: number;
  from_id: number;
  post_id: number;
  owner_id: number;
  signer_id: number;
  is_pinned: boolean;
  likes: number;
  post_type: string;
  reposts: number;
  spam: boolean;
  text: string;
  approved: boolean;
  approveTimeout: mongoose.Schema.Types.Date;
}

export interface ISuggest extends mongoose.Document {
  user: mongoose.Schema.Types.ObjectId;
  date: mongoose.Schema.Types.Date;
  message_id: number;
  chat: {
    id: number
  };
  text: string;
  audio: {
    file_id: string,
    duration: number,
    performer: string,
    title: string,
    mime_type: string,
    file_size: number
  };
  document: {
    file_id: string,
    file_name: string,
    title: string,
    mime_type: string,
    file_size: number
  };
  photo: Array<{
    file_id: string,
    width: number,
    height: number,
    file_size: number
  }>;
  voice: {
    file_id: string,
    duration: number,
    mime_type: string,
    file_size: number
  };
  video_note: {
    file_id: string,
    length: number,
    duration: number,
    file_size: number
  };
  caption: string;
  approved: boolean;
  public: boolean;
}

interface ILog extends mongoose.Document {
  date: mongoose.Schema.Types.Date;
  request: {};
  response: {};
  error: {};
}

export interface IStatistics extends mongoose.Document {
  aneks: {
    count: number,
    new: number
  };
  date: Date;
  messages: {
    popularCommand: string,
    received: number
  };
  users: {
    count: number,
    new: number,
    newly_subscribed: number,
    subscribed: number,
    unsubscribed: number
  };
}

export interface IAnekModel extends mongoose.Model<IAnek> {
  random(): Promise<IAnek>;
  synchronize(): Stream;
  esSearch(query: SearchQuery, params: SearchParams, callback: SearchCallback): void;
}

interface ISuggestModel extends mongoose.Model<ISuggest> {
  convertId(id: string): mongoose.Schema.Types.ObjectId;
}

export type Database = {
  User: mongoose.Model<IUser>,
  Log: mongoose.Model<ILog>,
  Suggest: ISuggestModel,
  Statistic: mongoose.Model<IStatistics>,
  Anek: IAnekModel
};

// @ts-ignore
mongoose.Promise = Promise;

const db = mongoose.connection;

db.on('error', error);

db.once('open', () => {
  debug('MongoDB connection successful');
});

const anekSchema = new mongoose.Schema({
  approveTimeout: {type: Date, default: () => new Date(Date.now() + Number(config.get('vk.approveTimeout')) * 1000)},
  approved: {type: Boolean, default: true},
  attachments: Array,
  copy_history: Array,
  date: Number,
  from_id: Number,
  is_pinned: Boolean,
  likes: Number,
  owner_id: Number,
  post_id: Number,
  post_type: String,
  reposts: Number,
  signer_id: Number,
  spam: {type: Boolean, default: false},
  text: {type: String, es_indexed: true}
});
const commentSchema = new mongoose.Schema({
  comment_id: Number,
  date: Number,
  from_id: Number,
  likes: Number,
  text: String
});
const userSchema = new mongoose.Schema({
  admin: {type: Boolean, default: false},
  banned: {type: Boolean, default: false},
  client: {type: String, default: 'web'},
  date: {type: Date, default: Date.now},
  deleted_subscribe: {type: Boolean, default: false},
  editor: {type: Boolean, default: false},
  feedback_mode: {type: Boolean, default: false},
  first_name: String,
  force_attachments: {type: Boolean, default: false},
  keyboard: {type: Boolean, default: false},
  language: {type: String, default: 'russian'},
  last_name: String,
  pin: {type: String, select: false},
  subscribed: {type: Boolean, default: false},
  suggest_mode: {type: Boolean, default: false},
  title: String,
  user_id: Number,
  username: String
});
const suggestSchema = new mongoose.Schema({
  approved: {type: Boolean, default: false},
  audio: {
    duration: Number,
    file_id: String,
    file_size: Number,
    mime_type: String,
    performer: String,
    title: String
  },
  caption: String,
  chat: {
    id: Number
  },
  date: {type: Date, default: Date.now},
  document: {
    file_id: String,
    file_name: String,
    file_size: Number,
    mime_type: String,
    title: String
  },
  message_id: Number,
  photo: [{
    file_id: String,
    file_size: Number,
    height: Number,
    width: Number
  }],
  public: {type: Boolean, default: false},
  text: String,
  user: {type: mongoose.Schema.Types.ObjectId, ref: userSchema},
  video_note: {
    duration: Number,
    file_id: String,
    file_size: Number,
    length: Number
  },
  voice: {
    duration: Number,
    file_id: String,
    file_size: Number,
    mime_type: String
  }
});
const groupAdminSchema = new mongoose.Schema({
  all_members_are_administrators: Boolean,
  description: String,
  group_id: Number,
  invite_link: String,
  title: String,
  votes: [{
    agreeVotes: Number,
    disagreeVotes: Number,
    requiredVotes: Number,
    title: String,
    type: String,
    untilVote: Number,
    voteIssuer: Number,
    voteTarget: Number,
    voteTime: Number
  }]
});
const logSchema = new mongoose.Schema({
  date: {
    default: Date.now,
    expires: 60 * 60 * 24 * 7,
    type: Date
  },
  error: Object,
  request: Object,
  response: Object
});
const statisticsSchema = new mongoose.Schema({
  aneks: {
    count: Number,
    new: Number
  },
  date: {
    default: Date.now,
    expires: 60 * 60 * 24 * 365,
    type: Date
  },
  messages: {
    popularCommand: String,
    received: Number
  },
  users: {
    count: Number,
    new: Number,
    newly_subscribed: Number,
    subscribed: Number,
    unsubscribed: Number
  }
});

anekSchema.statics.random = function() {
  const request = {
    $or: [
      {spam: {$ne: true}},
      {spam: {$exists: false}},
      {attachments: {$exists: false}},
      {attachments: {$size: 0}}
    ]
  };
  return this.find(request).count().then((count: number) => {
    const rand = Math.floor(Math.random() * count);

    return this.findOne(request).skip(rand).exec();
  });
};

anekSchema.statics.convertId = (id: string) => {
  if (id) {
    return mongoose.Types.ObjectId(id);
  }
};

suggestSchema.statics.convertId = (id: string) => {
  if (id) {
    return mongoose.Types.ObjectId(id);
  }
};

anekSchema.statics.convertIds = (ids: mongoose.Document[]) => {
  if (Array.isArray(ids)) {
    return ids.map((id: mongoose.Document) => {
      return mongoose.Types.ObjectId(id._id);
    });
  }

  return [];
};

if (db.readyState === 0) {
  mongoose.connect('mongodb://' + config.get('mongodb.server') + '/' + config.get('mongodb.database'));
}

if (config.get('mongodb.searchEngine') === 'elastic') {
  anekSchema.plugin(mongoosastic, {
    hosts: config.get('mongodb.elasticHosts') as string[],
    hydrate: true,
    hydrateOptions: {
      select: 'text post_id from_id likes'
    }
  });
} else if (config.get('mongodb.searchEngine') === 'native') {
  anekSchema.index({text: 'text'}, {
    default_language: 'russian',
    name: 'text_text',
    weights: {content: 10, keywords: 5}
  });
}

export const Anek = mongoose.model('Anek', anekSchema) as IAnekModel;
export const Comment = mongoose.model('Comment', commentSchema);
export const GroupAdmin = mongoose.model('GroupAdmin', groupAdminSchema);
export const Log = mongoose.model('Log', logSchema);
export const Statistic = mongoose.model('Statistic', statisticsSchema);
export const Suggest = mongoose.model('Suggest', suggestSchema) as ISuggestModel;
export const User = mongoose.model('User', userSchema) as mongoose.Model<IUser>;
