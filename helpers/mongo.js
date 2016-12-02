/**
 * Created by xgmv84 on 11/26/2016.
 */

module.exports = function (configs) {
    var mongoose = require('mongoose'),
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
            from_id: Number,
            post_id: Number,
            owner_id: Number,
            signer_id: Number,
            is_pinned: Boolean,
            likes: Number,
            post_type: String,
            reposts: Number,
            text: String
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
            admin: {type: Boolean, default: false},
            language: {type: String, default: 'russian'},
            client: {type: String, default: 'web'}
        }),
        logSchema = mongoose.Schema({
            date: Number,
            request: Object,
            response: Object,
            error: Object
        });

    anekSchema.statics.random = function() {
        var self = this;
        return self.count().then(function (count) {
            var rand = Math.floor(Math.random() * count);
            return self.findOne().skip(rand).exec();
        });
    };

    mongoose.connect('mongodb://' + config.server + '/' + config.database);

    anekSchema.index({text: "text"}, {weights: {content: 10, keywords: 5}, name: "text_text", default_language: "russian"});


    return {
        Anek: mongoose.model('Anek', anekSchema),
        Comment: mongoose.model('Comment', commentSchema),
        User: mongoose.model('User', userSchema),
        Log: mongoose.model('Log', logSchema)
    };
};