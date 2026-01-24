export type Callback = (...params: any) => any | Promise<any>;

class EventEmitter {
  public events: Map<string, Callback[]> = new Map();

  public on(
    event: string,
    callback: (...params: any) => void | Promise<any>,
  ): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    this.events.get(event).push(callback);
  }

  public async emit(event: string, ...params: any): Promise<any[]> {
    if (this.events.has(event)) {
      return Promise.all(
        this.events.get(event).map((callback: Callback) => callback(...params)),
      );
    }

    return [];
  }
}

export default EventEmitter;
