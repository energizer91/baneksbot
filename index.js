/**
 * Created by Александр on 13.12.2015.
 */
const path = require('path');
module.exports = function (express) {
  const router = express.Router();

  router.get('/*', function (req, res) {
    res.sendFile(path.join(__dirname, 'bundle', 'index.html'));
  });

  return router;
};
