/**
 * Created by Александр on 13.12.2015.
 */
module.exports = function (express, mongo) {
    var router = express.Router();

    router.get('/', function(req, res, next) {
        /*return mysql.makeRequest('SELECT * FROM aneks').then(function (aneks) {
            return res.json(aneks);
        }).catch(next);*/
        //res.render('index', { title: 'Express' });
    });

    return {
        endPoint: '/aneks',
        router: router
    };
};