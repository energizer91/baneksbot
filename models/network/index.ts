import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import * as FormData from "form-data";
import createLogger from "../../helpers/logger";
import EventEmitter from "../events";
import Queue, { RetryFunction } from "../queue";

const logger = createLogger("baneks-node:network");

export enum Methods {
  GET = "GET",
  POST = "POST",
}

export type RequestConfig = {
  url: string;
  method: Methods;
};

export type RequestParams = {
  _key?: string;
  _rule?: string;
  _getBackoff?: (error: AxiosError) => number;
  _stream?: boolean;
};

const queue = new Queue();

class NetworkModel extends EventEmitter {
  public queue: Queue = queue;

  public makeRequest<R>(
    config: RequestConfig,
    params: RequestParams,
  ): Promise<R> {
    if (!config) {
      throw new Error("Config not specified");
    }

    logger.debug("Sending request", config, params);

    let data: AxiosRequestConfig;
    const {
      _key: key,
      _rule: rule,
      _getBackoff,
      _stream,
      ...httpParams
    } = params;

    if (config.method === Methods.GET) {
      data = { ...config, params: httpParams };
    } else if (_stream) {
      const formData = new FormData();

      Object.keys(httpParams).forEach((param) =>
        // @ts-ignore
        formData.append(param, httpParams[param]),
      );

      data = { ...config, data: formData, headers: formData.getHeaders() };
    } else {
      data = { ...config, data: httpParams };
    }

    return this.queue.request(
      (backoff: RetryFunction) =>
        axios(data)
          .then((response: AxiosResponse<R>) => {
            logger.debug("Returning response", response.data);

            return response.data;
          })
          .catch((error: AxiosError) => {
            if (!error || !error.response) {
              throw new Error("Unknown error");
            }

            if (
              typeof backoff === "function" &&
              error.response.status === 429
            ) {
              logger.warn("Back off request", error.response.data.parameters);
              backoff(_getBackoff ? _getBackoff(error) : 300);

              return error;
            }

            if (error.response.status >= 400 && error.response.status <= 600) {
              logger.error(
                "An error occurred with code " + error.response.status,
                error.response.data,
              );
              throw error.response.data;
            }

            logger.warn("Returning empty response");

            return {};
          }),
      key,
      rule,
    );
  }

  public async fulfillAll<T>(requests: Array<Promise<T>>): Promise<T[]> {
    const results: T[] = [];

    if (!requests.length) {
      return [];
    }

    return requests
      .reduce(
        (acc, request: Promise<T | void>) =>
          acc
            .then((result: T | void) => {
              if (result) {
                results.push(result);
              }

              return request;
            })
            .catch((error: Error) => {
              logger.error({ err: error }, "single fulfillment error");

              return {};
            }),
        Promise.resolve(),
      )
      .then((lastResponse: T | void) => {
        if (lastResponse) {
          results.push(lastResponse);
        }

        return results;
      })
      .catch((error: Error) => {
        logger.error({ err: error }, "fulfillment error");

        return results;
      });
  }
}

export default NetworkModel;
