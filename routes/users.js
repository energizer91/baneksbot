/**
 * Created by Александр on 13.12.2015.
 */
module.exports = function (express, mongo) {
    var router = express.Router();

    return {
        endPoint: '/users',
        router: router
    };
};