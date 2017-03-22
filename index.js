/**
 * Created by Александр on 13.12.2015.
 */
module.exports = function (express) {
    var router = express.Router(),
        path = require('path');

    router.get('/*', function (req, res) {
        res.sendFile(path.join(__dirname, 'bundle', 'index.html'));
    });

    return router;
};