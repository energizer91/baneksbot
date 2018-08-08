class EventEmitter {
  constructor () {
    this.events = {};
  }

  on (event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }

    this.events[event].push(callback);
  }

  emit (event, ...params) {
    if (this.events[event]) {
      return Promise.all(this.events[event].map(callback => callback(...params))); // eslint-disable-line standard/no-callback-literal
    }

    return Promise.resolve([]);
  }
}

module.exports = EventEmitter;
