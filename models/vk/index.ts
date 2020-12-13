import * as config from 'config';
import {NextFunction, Request, Response} from "express";
import debugFactory from '../../helpers/debug';
import NetworkModel, {Methods, RequestConfig, RequestParams} from '../network';

const debug = debugFactory('baneks-node:vk');

type AnekWithPostponeId = Anek & {
  postponed_id: number
};

export interface BaseCallback {
  type: string;
  group_id: number;
  object: any;
}

export interface ConfirmationCallback extends BaseCallback {
  type: "confirmation";
}

export interface WallPostNewCallback extends BaseCallback {
  type: "wall_post_new";
  object: AnekWithPostponeId;
}

export type Callback = ConfirmationCallback | WallPostNewCallback;

export type PollAnswer = {
  id: number,
  text: string,
  votes: number,
  rate: number
};

type Poll = {
  id: number,
  owner_id: number,
  created: number,
  question: string,
  votes: number,
  answers: PollAnswer[],
  anonymous: number
};

export type Link = {
  title: string,
  url: string
};

export type Note = {
  id: number,
  owner_id: number,
  title: string,
  text: string,
  date: number
};

export type PhotosList = string[];

type PhotoSize = {
  type: string,
  url: string,
  width: number,
  height: number
};

type Photo = {
  id: number,
  album_id: number,
  owner_id: number,
  user_id: number,
  text: string,
  date: number,
  sizes: PhotoSize[],
  width: number,
  height: number,
  photo_75: string,
  photo_130: string,
  photo_604: string,
  photo_1280: string,
  photo_2560: string
};

type Audio = {
  id: number,
  owner_id: number,
  artist: string,
  title: string,
  duration: number,
  url: string,
  lyrics_id: number,
  album_id: number,
  genre_id: number,
  date: number,
  no_search: number,
  is_hq: number
};

type Video = {
  id: number,
  title?: string,
  photo_800?: string,
  photo_640?: string,
  photo_320?: string,
  photo_130?: string,
  owner_id: number,
  text: string
};

type Document = {
  url: string,
  title: string
};

export type Anek = {
  id: number,
  date: number,
  post_id: number,
  from_id: number,
  text: string,
  attachments: Attachment[],
  copy_history: Anek[],
  marked_as_ads: boolean,
  is_pinned: boolean,
  likes: {
    count: number
  },
  reposts: {
    count: number
  },
  comments: {
    count: number
  }
};

export type Attachment = {
  type: string,
  photo?: Photo,
  audio?: Audio,
  video?: Video,
  doc?: Document,
  poll?: Poll,
  link?: Link,
  text?: string,
  title?: string,
  note?: Note,
  photos_list?: PhotosList
};

export type Comment = {
  id: number,
  from_id: number,
  date: number,
  text: string,
  reply_to_user: number,
  reply_to_comment: number,
  likes: {
    count: number
  },
  comments: {
    count: number
  },
  attachments: Attachment[]
};

export type MultipleResponse<T> = {
  count: number,
  items: T[]
};

type VkError = {
  error_code: number,
  error_msg: string
};

interface IVkResponse<T> {
  response?: T;
  error?: VkError;
}

type AllRequestParams = {
  owner_id?: number,
  post_id?: number,
  posts?: string,
  offset?: number,
  count?: number,
  need_likes?: number
};

class Vk extends NetworkModel {
  public static getVkLink() {
    return 'https://vk.com';
  }

  public static getAnekLink(postId: number, fromId: number = config.get('vk.group_id')) {
    return Vk.getVkLink() + '/wall' + fromId + '_' + postId;
  }

  public static getPhotoUrl(photo: Photo): string {
    return photo.photo_2560 || photo.photo_1280 || photo.photo_604 || photo.photo_130 || photo.photo_75;
  }

  public static getVideoImageUrl(video: Video): string {
    return video.photo_800 || video.photo_640 || video.photo_320 || video.photo_130;
  }

  public endpoint: string = config.get('vk.url');
  public groupId: number = config.get('vk.group_id');

  public executeCommand<R>(command: string, params: RequestParams & AllRequestParams, method: Methods = Methods.GET): Promise<R> {
    const axiosConfig: RequestConfig = {
      method,
      url: this.endpoint + command
    };

    const requestParams = Object.assign({
      _getBackoff: () => 300,
      _rule: 'vk',
      access_token: config.get('vk.access_token'),
      v: config.get('vk.api_version')
    }, params);

    return this.makeRequest(axiosConfig, requestParams)
      .then((data: IVkResponse<R>): R => {
        if (data.error) {
          throw new Error(data.error.error_msg || 'Unknown error');
        }

        return data.response;
      });
  }

  public async getPostById(postId: number): Promise<Anek | void> {
    debug('Making VK request wall.getById', postId);

    const posts = await this.executeCommand<Anek[]>('wall.getById', {
      _key: String(this.groupId),
      posts: this.groupId + '_' + postId
    });

    if (posts.length && posts[0]) {
      return posts[0];
    }
  }

  public getPosts(offset?: number, count?: number): Promise<MultipleResponse<Anek>> {
    debug('Making VK request wall.get', offset, count);

    return this.executeCommand<MultipleResponse<Anek>>('wall.get', {
      _key: String(this.groupId),
      count,
      offset,
      owner_id: this.groupId
    });
  }

  public async getCommentsCount(postId: number): Promise<number> {
    const comments = await this.getComments(postId, 0, 1);

    return comments.count || 0;
  }

  public async getPostsCount(): Promise<{ count: number, hasPinned: boolean }> {
    const response = await this.getPosts(0, 1);
    const count = response.count || 0;
    const hasPinned = response.items ? response.items[0].is_pinned : false;

    return {
      count,
      hasPinned
    };
  }

  public async getComments(postId: number, offset: number = 0, count: number = 100): Promise<MultipleResponse<Comment>> {
    if (!postId) {
      throw new Error('Post ID is not defined');
    }

    debug('Making VK request wall.getComments', postId, offset, count);

    return this.executeCommand('wall.getComments', {
      _key: String(this.groupId),
      count,
      need_likes: 1,
      offset,
      owner_id: this.groupId,
      post_id: postId
    });
  }

  public getAllComments(postId: number): Promise<Array<MultipleResponse<Comment>>> {
    return this.getCommentsCount(postId)
      .then((counter: number) => {
        const requests = [];
        let current = counter;
        const goal = 0;
        let step = 100;

        while (current > goal) {
          if (current - step < goal) {
            step = current - goal;
          }

          current -= step;

          requests.push(this.getComments(postId, current, step));
        }

        return this.fulfillAll(requests);
      });
  }

  public async performWallPost(post: AnekWithPostponeId) {
    debug("Performing new wall post", post.post_id);
    this.emit("anek", post);
  }

  public async performCallback(callback: Callback) {
    const {type} = callback;

    switch (type) {
      case "wall_post_new":
        return this.performWallPost(callback.object);
    }
  }

  public middleware = async (req: Request, res: Response, next: NextFunction) => {
    const callback: Callback = req.body;

    if (!callback) {
      next(new Error('No webhook callback specified'));

      return;
    }

    if (callback.type === "confirmation") {
      debug("Sending confirmation to vk callback API");

      res.send(config.get('vk.confirmation'));

      return;
    }

    this.emit('callback', callback);

    try {
      await this.performCallback(callback);

      res.send("ok");

      return;
    } catch (error) {
      next(error);
    }
  }
}

export default Vk;
