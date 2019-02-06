export type Callback = (...params: any) => any | Promise<any>;

class EventEmitter {
  public events: Map<string, Callback[]> = new Map();

  public on(event: string, callback: () => void | Promise<any>): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    this.events.get(event).push(callback);
  }

  public emit(event: string, ...params: any): Promise<any[]> {
    if (this.events.has(event)) {
      return Promise.all(this.events.get(event).map((callback: Callback) => callback(...params))); // eslint-disable-line standard/no-callback-literal
    }

    return Promise.resolve([]);
  }
}

export default EventEmitter;
