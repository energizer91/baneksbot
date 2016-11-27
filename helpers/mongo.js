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
        attachments: Array,
        date: Number,
        from_id: Number,
        //counter: Number,
        post_id: {type: Number, index: true},
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
        subscribed: Boolean,
        client: String
    });

anekSchema.statics.random = function() {
    var self = this;
    return self.count().then(function (count) {
        var rand = Math.floor(Math.random() * count);
        return self.findOne().skip(rand).exec();
    });
};

mongoose.connect('mongodb://' + config.server + '/' + config.database);

module.exports = {
    Anek: mongoose.model('Anek', anekSchema),
    Comment: mongoose.model('Comment', commentSchema),
    User: mongoose.model('User', userSchema)
};