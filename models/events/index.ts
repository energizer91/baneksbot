import debugFactory from '../../helpers/debug';

const debugError = debugFactory('baneks-node:events:error', true);

export type Callback = (...params: any) => any | Promise<any>;

class EventEmitter {
  public events: Map<string, Callback[]> = new Map();

  public on(event: string, callback: (...params: any) => void | Promise<any>): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    this.events.get(event).push(callback);
  }

  public async emit(event: string, ...params: any): Promise<any[]> {
    if (this.events.has(event)) {
      return Promise.all(this.events.get(event).map((callback: Callback) =>
        callback(...params))
      )
        .catch((e) => {
          debugError('Executing event "' + event + '" error', e, params);

          return null;
        });
    }

    return [];
  }
}

export default EventEmitter;
