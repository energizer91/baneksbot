/**
 * Created by Александр on 13.12.2015.
 */
module.exports = function (express) {
    var router = express.Router();

    router.get('/', function(req, res, next) {
        res.render('index', { title: 'Express' });
    });

    return router;
};