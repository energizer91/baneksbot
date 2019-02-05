type Callback = (...params: any) => any | Promise<any>

class EventEmitter {
  events: Map<string, Callback[]> = new Map();

  on (event: string, callback: () => void) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    this.events.get(event).push(callback);
  }

  emit (event: string, ...params: any) {
    if (this.events.has(event)) {
      return Promise.all(this.events.get(event).map((callback: Callback) => callback(...params))); // eslint-disable-line standard/no-callback-literal
    }

    return Promise.resolve([]);
  }
}

export default EventEmitter;
