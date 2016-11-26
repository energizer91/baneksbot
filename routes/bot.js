/**
 * Created by Александр on 13.12.2015.
 */
module.exports = function (express) {
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
            //console.log(req.body);
            return botApi.performWebHook(req.body).then(function (response) {
                //console.log(response);
                return res.json(response);
            });
            //return res.send('200 OK');
        })
        .get(function (req, res, next) {
            res.send('just a simple hook for telegram bot');
        })
        .put(function (req, res, next) {
            res.send('just a simple PUT hook for telegram bot');
        });

    router.get('/bot', function (req, res, next) {
        return vkApi.getPosts().then(function (data) {
            return res.json(data);
        }).catch(next);
    });

    return {
        endPoint: '/bot',
        router: router
    };
};