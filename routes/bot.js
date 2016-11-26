/**
 * Created by Александр on 13.12.2015.
 */
module.exports = function (express, mongo) {
    var router = express.Router(),
        vkApi = require('../helpers/vk'),
        botApi = require('../helpers/bot');

    router.get('/', function(req, res) {
        return res.send('hello fot Telegram bot api');
        //res.render('index', { title: 'Express' });
    });

    router.get('/getMe', function(req, res, next) {
        return botApi.getMe().then(function (response) {
            return res.send(JSON.stringify(response));
        }).catch(next);
        //res.render('index', { title: 'Express' });
    });

    router.get('/toAdmin', function(req, res, next) {
        return botApi.sendMessageToAdmin(req.query.text || '').then(function (response) {
            return res.send(JSON.stringify(response));
        }).catch(next);
        //res.render('index', { title: 'Express' });
    });

    router.route('/webhook')
        .post(function (req, res, next) {
            return botApi.performWebHook(req.body).then(function (response) {
                return res.json(response);
            });
        })
        .get(function (req, res, next) {
            res.send('just a simple hook for telegram bot');
        })
        .put(function (req, res, next) {
            res.send('just a simple PUT hook for telegram bot');
        });

    router.get('/bot', function (req, res, next) {
        return vkApi.getPosts(req.query).then(function (data) {
            return res.json(data);
        }).catch(next);
    });

    router.get('/redefine', function (req, res, next) {
        return mongo.Anek.remove({}).then(function () {
            return vkApi.getPosts({offset: 0, count: 0})
        }).then(function (counter) {
            var requests = [],
                last = counter.response[0],
                step = 100;

            do {
                last = Math.max(last - step, 0);
                requests.push(vkApi.getPosts({offset: last, count: step}));
            } while (last > 0);

            return require('q').all(requests);
        }).then(function (responses) {
            //console.log(responses);
            responses.forEach(function (response) {
                for (var i = response.response.length - 1; i > 0; i--) {
                    var /*attachments = (response.response[i].attachments || []).map(function (attachment) {
                            return new mongo.Attachment({
                                type: attachment.type,
                                attachment_id: attachment.id,
                                date: attachment.date,
                                owner_id: attachment.owner_id
                            }).save();
                        }),
                        comments = (response.response[i].comments || []).map(function (comment) {
                            return new mongo.Comment({
                                comment_id: comment.id,
                                from_id: comment.from_id,
                                date: comment.date,
                                text: comment.text,
                                likes: comment.likes.count
                            })
                        }),*/
                        anek = new mongo.Anek({
                            //attachments: attachments,
                            comments: response.response[i].comments.count,
                            date: response.response[i].date,
                            from_id: response.response[i].from_id,
                            post_id: response.response[i].post_id,
                            owner_id: response.response[i].owner_id,
                            signer_id: response.response[i].signer_id,
                            is_pinned: response.response[i].is_pinned,
                            likes: response.response[i].likes.count,
                            post_type: response.response[i].post_type,
                            reposts: response.response[i].reposts.count,
                            text: response.response[i].text
                        });
                    anek.save();
                    console.log(anek);
                }
            })
        }).then(function (response) {
            return res.json(response);
        }).catch(next);
        /*return vkApi.getPosts().then(function (data) {
            return res.json(data);
        }).catch(next);*/
    });

    router.get('/comment', function (req, res, next) {
        return vkApi.getComments({post_id: req.query.post, need_likes: 1}).then(function (data) {
            return res.json('success');
        }).catch(next);
    });

    return {
        endPoint: '/bot',
        router: router
    };
};