declare class EventEmitter {
    on(event: string, callback: (...params: any[]) => any | Promise<any>): void;

    emit(event: string, ...params: any[]): Promise<any[]>;
}

export = EventEmitter;
