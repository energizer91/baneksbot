import Queue, {BackOffFunction} from '../queue';
import axios, {AxiosError, AxiosRequestConfig, AxiosResponse} from 'axios';
import {RequestParams} from './index';
import EventEmitter from '../events';

const debugError = require('debug')('baneks-node:network:error');

export type RequestConfig = {
    url: string,
    method: 'get' | 'post'
}

export type RequestParams = {
    _key?: string,
    _rule?: string,
    _getBackoff: (error: AxiosError) => number
}

const queue = new Queue();

class NetworkModel extends EventEmitter {
  queue: Queue = queue;

  makeRequest (config: RequestConfig, params: RequestParams) {
    if (!config) {
      throw new Error('Config not specified');
    }

    let data: AxiosRequestConfig;
    const {_key: key, _rule: rule, _getBackoff, ...httpParams} = params;

    if (config.method === 'get') {
      data = {...config, params: httpParams};
    } else {
      data = {...config, data: httpParams};
    }

    return this.queue.request((backoff: BackOffFunction) => axios(data)
      .then((response: AxiosResponse) => response.data)
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

  async fulfillAll<T> (requests: Promise<T>[]): Promise<T[]> {
    const results: T[] = [];

    if (!requests.length) {
      return [];
    }

    return requests.reduce((p, request) => {
      return p
        .then(result => {
          if (result) {
            results.push(result);
          }

          return request;
        })
        .catch(error => {
          debugError('single fulfillment error', error);

          return {};
        })
    }, Promise.resolve())
      .then(lastResponse => {
        results.push(lastResponse);

        return results;
      })
      .catch((error: Error) => {
        debugError('fulfillment error', error);

        return results;
      });
  }
}

export default NetworkModel;
