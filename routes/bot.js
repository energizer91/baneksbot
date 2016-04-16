/**
 * Created by Александр on 13.12.2015.
 */
module.exports = function (app, express, mysql) {
    var router = express.Router(),
        vkApi = require('../helpers/vk');

    router.get('/', function(req, res, next) {
        return res.send('hello fot Telegram bot api');
        //res.render('index', { title: 'Express' });
    });

    router.route('/webhook')
        .post(function (req, res, next) {
            console.log(req.body);
            return res.send('200 OK');
        })
        .get(function (req, res, next) {
            res.send('just a simple hook for telegram bot');
        })
        .put(function (req, res, next) {
            res.send('just a simple PUT hook for telegram bot');
        });

    router.get('/bot', function (req, res, next) {
        vkApi.executeCommand('wall.get', {owner_id: -45491419}).then(function (data) {
            res.json(data);
        }).catch(next).done();
    });

    return {
        endPoint: '/bot',
        router: router
    };
};