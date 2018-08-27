const debug = require('debug');

const logInstance = instance => {
  const debugInstance = debug(instance);

  debugInstance.log = console.log.bind(console);

  return debugInstance;
};

module.exports = logInstance;
