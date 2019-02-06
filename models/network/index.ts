import axios, {AxiosError, AxiosRequestConfig, AxiosResponse} from 'axios';
import * as debugFactory from 'debug';
import EventEmitter from '../events';
import Queue, {BackOffFunction} from '../queue';
import {RequestParams} from './index';

const debugError = debugFactory('baneks-node:network:error');

export enum Methods {
  GET = 'GET',
  POST = 'POST'
}

export type RequestConfig = {
    url: string,
    method: Methods
};

export type RequestParams = {
    _key?: string,
    _rule?: string,
    _getBackoff?: (error: AxiosError) => number
};

const queue = new Queue();

class NetworkModel extends EventEmitter {
  public queue: Queue = queue;

  public makeRequest<R>(config: RequestConfig, params: RequestParams): Promise<R> {
    if (!config) {
      throw new Error('Config not specified');
    }

    let data: AxiosRequestConfig;
    const {_key: key, _rule: rule, _getBackoff, ...httpParams} = params;

    if (config.method === Methods.GET) {
      data = {...config, params: httpParams};
    } else {
      data = {...config, data: httpParams};
    }

    return this.queue.request((backoff: BackOffFunction) => axios(data)
      .then((response: AxiosResponse<R>) => response.data)
      .catch((error: AxiosError) => {
        if (!error || !error.response) {
          throw error;
        }

        if (typeof backoff === 'function' && error.response.status === 429) {
          debugError('Back off request', error.response.data.parameters);
          backoff(_getBackoff ? _getBackoff(error) : 300);

          return error;
        }

        if (error.response.status >= 400 && error.response.status <= 600) {
          debugError('An error occurred with code ' + error.response.status, error.response.data);
          throw error.response.data;
        }

        return {};
      }), key, rule);
  }

  public async fulfillAll<T>(requests: Array<Promise<T>>): Promise<T[]> {
    const results: T[] = [];

    if (!requests.length) {
      return [];
    }

    return requests.reduce((p, request: Promise<T | void>) => {
      return p
        .then((result: T | void) => {
          if (result) {
            results.push(result);
          }

          return request;
        })
        .catch((error: Error) => {
          debugError('single fulfillment error', error);

          return {};
        });
    }, Promise.resolve())
      .then((lastResponse: T | void) => {
        if (lastResponse) {
          results.push(lastResponse);
        }

        return results;
      })
      .catch((error: Error) => {
        debugError('fulfillment error', error);

        return results;
      });
  }
}

export default NetworkModel;
