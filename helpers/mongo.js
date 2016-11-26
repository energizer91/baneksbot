/**
 * Created by xgmv84 on 11/26/2016.
 */
var mongoose = require('mongoose'),
    config = require('../config/mongodb.json'),
    db = mongoose.connection;

mongoose.Promise = require('q').Promise;

db.on('error', console.error);

db.once('open', function () {
    console.log('MongoDB connection successful');
});

var anekSchema = mongoose.Schema({
        //attachments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Attachment'}],
        //comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Comment'}],
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
    attachmentSchema = mongoose.Schema({
        type: String,
        attachment_id: Number,
        date: Number,
        url: String,
        owner_id: String
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
        user_id: Number
    });

mongoose.connect('mongodb://' + config.server + '/' + config.database);

module.exports = {
    Anek: mongoose.model('Anek', anekSchema),
    Attachment: mongoose.model('Attachment', attachmentSchema),
    Comment: mongoose.model('Comment', commentSchema),
    User: mongoose.model('User', userSchema)
};