import EventEmitter = require('../events');
import Queue = require('../queue');

type RequestConfig = {
    url: string,
    method: 'get' | 'post'
}

declare namespace NetworkModel {
    type RequestParams = {
        _key?: string,
        _rule?: string,
    }
}

declare class NetworkModel extends EventEmitter {
    queue: Queue;
    constructor();
    makeRequest(config: RequestConfig, params: NetworkModel.RequestParams): Promise<any>;

    fulfillAll<T>(requests: Promise<T>[]): Promise<T[]>;
}

export = NetworkModel;

export as namespace NetworkTypes;
