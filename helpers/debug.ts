import * as debug from 'debug';

const logInstance = (instance: string, error: boolean = false): debug.IDebugger => {
  const debugInstance = debug(instance);

  if (!error) {
    // eslint:disable-next-line
    debugInstance.log = console.log.bind(console);
  }

  return debugInstance;
};

export default logInstance;
