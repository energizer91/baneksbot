import NetworkModel = require('../network');

type PollAnswer = {
    id: number,
    text: string,
    votes: number,
    rate: number
}

type Poll = {
    id: number,
    owner_id: number,
    created: number,
    question: string,
    votes: number,
    answers: PollAnswer[],
    anonymous: number
}

type PhotoSize = {
    type: string,
    url: string,
    width: number,
    height: number
}

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
}

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
}

type Video = {
    id: number,
    title?: string,
    photo_800?: string,
    photo_640?: string,
    photo_320?: string,
    photo_130?: string,
    text: string
}

type Document = {
    url: string,
    title: string
}

declare namespace Vk {
    type Anek = {
        post_id: number,
        from_id: number,
        text: string,
        attachments: Attachment[],
        copy_history: Anek[],
        marked_as_ads: boolean
    }

    type Attachment = {
        type: string,
        photo?: Photo,
        audio?: Audio,
        video?: Video,
        doc?: Document,
        poll?: Poll
    }

    type Comment = {
        id: number,
        from_id: number,
        date: number,
        text: string,
        reply_to_user: number,
        reply_to_comment: number,
        attachments: Attachment[]
    }
}

type MultipleResponse<T> = {
    count: number,
    items: T
}

declare class Vk extends NetworkModel {
    getPostById(postId: string, params?: object): Promise<Vk.Anek>;

    getComments(params: object): Promise<MultipleResponse<Comment[]>>;

    getAllComments(postId: string): Promise<MultipleResponse<Comment[]>[]>;
}

export as namespace VkModel;

export = Vk;
