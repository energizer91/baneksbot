/**
 * Created by xgmv84 on 11/26/2016.
 */

module.exports = function (configs) {
    var mongoose = require('mongoose'),
        mongoosastic = require('mongoosastic'),
        config = configs.mongo,
        db = mongoose.connection;

    mongoose.Promise = require('q').Promise;

    db.on('error', console.error);

    db.once('open', function () {
        console.log('MongoDB connection successful');
    });

    var anekSchema = mongoose.Schema({
            attachments: Array,
            copy_history: Array,
            date: Number,
            create_date: {type: Date, default: Date.now},
            from_id: Number,
            post_id: Number,
            owner_id: Number,
            signer_id: Number,
            is_pinned: Boolean,
            likes: Number,
            post_type: String,
            reposts: Number,
            spam: {type: Boolean, default: false},
            text: {type: String, es_indexed: true}
        }),
        commentSchema = mongoose.Schema({
            comment_id: Number,
            from_id: Number,
            date: Number,
            text: String,
            likes: Number
        }),
        userSchema = mongoose.Schema({
            username: String,
            first_name: String,
            last_name: String,
            user_id: Number,
            subscribed: {type: Boolean, default: false},
            deleted_subscribe: {type: Boolean, default: false},
            feedback_mode: {type: Boolean, default: false},
            suggest_mode: {type: Boolean, default: false},
            admin: {type: Boolean, default: false},
            editor: {type: Boolean, default: false},
            keyboard: {type: Boolean, default: false},
            banned: {type: Boolean, default: false},
            language: {type: String, default: 'russian'},
            client: {type: String, default: 'web'},
            pin: {type: String, select: false},
            date: {type: Date, default: Date.now}
        }),
        suggestSchema = mongoose.Schema({
            user: {type: mongoose.Schema.Types.ObjectId, ref: userSchema},
            date: {type: Date, default: Date.now},
            message_id: Number,
            chat: {
                id: Number
            },
            text: String,
            audio: {
                file_id: String,
                duration: Number,
                performer: String,
                title: String,
                mime_type: String,
                file_size: Number
            },
            document: {
                file_id: String,
                file_name: String,
                title: String,
                mime_type: String,
                file_size: Number
            },
            photo: [{
                file_id: String,
                width: Number,
                height: Number,
                file_size: Number
            }],
            voice: {
                file_id: String,
                duration: Number,
                mime_type: String,
                file_size: Number
            },
            video_note: {
                file_id: String,
                length: Number,
                duration: Number,
                file_size: Number
            },
            caption: String,
            approved: {type: Boolean, default: false},
            public: {type: Boolean, default: false}
        }),
        logSchema = mongoose.Schema({
            date: {
                type: Date,
                expires: 60 * 60 * 24 * 7,
                default: Date.now
            },
            request: Object,
            response: Object,
            error: Object
        }),
        statisticsSchema = mongoose.Schema({
            users: {
                count: Number,
                new: Number,
                subscribed: Number,
                newly_subscribed: Number,
                unsubscribed: Number
            },
            aneks: {
                count: Number,
                new: Number
            },
            messages: {
                received: Number,
                popularCommand: String
            },
            date: Date
        });

    anekSchema.statics.random = function() {
        var self = this;
        return self.count().then(function (count) {
            var rand = Math.floor(Math.random() * count);
            return self.findOne().skip(rand).exec();
        });
    };

    suggestSchema.statics.convertId = function (id) {
        if (id) {
            return mongoose.Types.ObjectId(id);
        }
    };

    anekSchema.statics.convertIds = function (ids) {
        if (Array.isArray(ids)) {
            return ids.map(function (id) {
                return mongoose.Types.ObjectId(id._id);
            })
        }

        return [];
    };

    mongoose.connect('mongodb://' + config.server + '/' + config.database);

    if (config.searchEngine === 'elastic') {
        anekSchema.plugin(mongoosastic, {
            hosts: config.elasticHosts
        });
    } else if (config.searchEngine === 'native') {
        anekSchema.index({text: "text"}, {weights: {content: 10, keywords: 5}, name: "text_text", default_language: "russian"});
    }


    return {
        Anek: mongoose.model('Anek', anekSchema),
        Comment: mongoose.model('Comment', commentSchema),
        User: mongoose.model('User', userSchema),
        Suggest: mongoose.model('Suggest', suggestSchema),
        Log: mongoose.model('Log', logSchema),
        Statistic: mongoose.model('Statistic', statisticsSchema)
    };
};