import * as mongoose from 'mongoose';
import {Stream} from "stream";

declare namespace Database {
    interface IUser extends mongoose.Document {
        username: string,
        first_name: string,
        last_name: string,
        title: string,
        user_id: number,
        subscribed: boolean,
        deleted_subscribe: boolean,
        feedback_mode: boolean,
        force_attachments: boolean,
        suggest_mode: boolean,
        admin: boolean,
        editor: boolean,
        keyboard: boolean,
        banned: boolean,
        language: string,
        client: string,
        pin: string,
        date: mongoose.Schema.Types.Date
    }

    interface IAnek extends mongoose.Document {
        attachments: any[],
        copy_history: any[],
        date: number,
        create_date: mongoose.Schema.Types.Date,
        from_id: number,
        post_id: number,
        owner_id: number,
        signer_id: number,
        is_pinned: boolean,
        likes: number,
        post_type: string,
        reposts: number,
        spam: boolean,
        text: string,

    }

    interface ISuggest extends mongoose.Document {
        user: mongoose.Schema.Types.ObjectId,
        date: mongoose.Schema.Types.Date,
        message_id: number,
        chat: {
            id: number
        },
        text: string,
        audio: {
            file_id: string,
            duration: number,
            performer: string,
            title: string,
            mime_type: string,
            file_size: number
        },
        document: {
            file_id: string,
            file_name: string,
            title: string,
            mime_type: string,
            file_size: number
        },
        photo: {
            file_id: string,
            width: number,
            height: number,
            file_size: number
        }[],
        voice: {
            file_id: string,
            duration: number,
            mime_type: string,
            file_size: number
        },
        video_note: {
            file_id: string,
            length: number,
            duration: number,
            file_size: number
        },
        caption: string,
        approved: boolean,
        public: boolean
    }
}

interface ILog extends mongoose.Document {
    date: mongoose.Schema.Types.Date,
    request: {},
    response: {},
    error: {}
}

interface IAnekModel extends mongoose.Model<Database.IAnek> {
    random(): Promise<Database.IAnek>;
    synchronize(): Stream;
}

interface ISuggestModel extends mongoose.Model<Database.ISuggest> {
    convertId(id: string): mongoose.Schema.Types.ObjectId
}

declare interface Database {
    User: mongoose.Model<Database.IUser>;
    Log: mongoose.Model<ILog>;
    Suggest: ISuggestModel;
    Anek: IAnekModel;
}

export as namespace DatabaseModel;

export = Database;
