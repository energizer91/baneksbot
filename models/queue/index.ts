/**
 * Created by energizer on 13.06.17.
 */
import * as config from 'config';
import * as uuid from 'uuid/v1';

import debugFactory from '../../helpers/debug';

const debug = debugFactory('baneks-node:queue');
const debugError = debugFactory('baneks-nod:error:queue', true);

type Rule = {
  rate: number,
  limit: number,
  priority: number
};

export type BackOffFunction = (delay: number) => void;
export type QueueRequest = (BackOffFunction: BackOffFunction) => Promise<any>;
export type Callback = (error: Error | null, data?: any) => void;

type QueueItemData = {
  id: string,
  request: QueueRequest,
  callback: Callback
};

type QueueItem = {
  id: string,
  cooldown: number,
  key: string,
  data: QueueItemData[],
  rule: Rule,
  ruleName: string
};

type ShiftItemStructure = {
  queue: QueueItem,
  item: QueueItemData
};

type Params = {
  rules: {
    [key: string]: Rule
  },
  default: {
    rule: string,
    key: string
  } & Rule,
  overall: Rule,
  backOffTime: number,
  ignoreOverallOverheat: boolean
};

type QueueMap = Map<string, QueueItem>;

// tslint:disable object-literal-sort-keys
const defaultParams: Params = {
  default: {
    rule: 'common',
    key: 'common',
    rate: 30,
    limit: 1,
    priority: 3
  },
  rules: {
    common: {
      rate: 30,
      limit: 1,
      priority: 3
    }
  },
  overall: {
    rate: 30,
    limit: 1,
    priority: 1
  },
  backOffTime: 300,
  ignoreOverallOverheat: true
};
// tslint:enable object-literal-sort-keys

class Queue {
  public params: Params;
  public queue: QueueMap = new Map();
  public overheat = 0;
  public pending = false;
  public heatPart = 0;

  constructor(params?: Params) {
    this.params = Object.assign(defaultParams, config.get('queue') as Params, params);

    this.heatPart = this.params.overall.limit * 1000 / this.params.overall.rate;
  }

  public add(request: QueueRequest, callback: Callback, key: string = this.params.default.key, rule: string = this.params.default.rule): void {
    const queue = this.createQueue(key, request, callback, rule);

    debug('Adding request to the queue', queue.id);

    if (!this.pending) {
      this.execute(queue);
    }
  }

  public request(fn: QueueRequest, key = 'common', rule = 'common'): Promise<any> {
    debug('Adding queue request', key, rule);

    return new Promise((resolve, reject) => {
      this.add(fn, (error, data) => {
        if (error) {
          debugError('Request resolving error', key, rule, error);

          return reject(error);
        }

        debug('Resolving queue request', key, rule);

        return resolve(data);
      }, key, rule);
    });
  }

  public get isOverheated(): boolean {
    return this.overheat > 0;
  }

  public get totalLength(): number {
    return Object.values(this.queue).reduce((acc: number, queue: QueueItem) => acc + queue.data.length, 0);
  }

  private createQueue(queueName: string, request: QueueRequest, callback: Callback, rule: string): QueueItem {
    const id = uuid();

    debug('Creating queue', id, queueName, rule);

    if (!this.queue.has(queueName)) {
      this.queue.set(queueName, {
        cooldown: 0,
        data: [],
        id,
        key: queueName,
        rule: this.getRule(rule),
        ruleName: rule
      });
    }

    this.queue.get(queueName).data.push({
      callback,
      id,
      request
    });

    return this.queue.get(queueName);
  }

  private getRule(name: string, params = {}): Rule {
    if (this.params.rules[name]) {
      return this.params.rules[name];
    }

    this.params.rules[name] = Object.assign({
      limit: this.params.default.limit,
      priority: this.params.default.priority,
      rate: this.params.default.rate
    }, params);

    return this.params.rules[name];
  }

  private addBackoff(item: ShiftItemStructure, delay: number): void {
    debug('Adding backoff', item.queue.id, delay);

    this.delay(delay * 1000)
      .then(() => {
        this.add(item.item.request, item.item.callback, item.queue.key, item.queue.ruleName);
      });
  }

  private execute(queue?: QueueItem): void {
    if (queue) {
      debug('Executing queue', queue.id);
    }

    this.pending = true;

    let backoffState = false;
    let backoffTimer = 0;
    const backoffFn = (delay: number) => {
      backoffState = true;
      backoffTimer = delay || this.params.backOffTime;
    };

    this.shift(queue)
      .then((nextItem: ShiftItemStructure) => {
        if (!nextItem || !nextItem.item) {
          return;
        }

        this.heat();

        debug('Executing queue item', nextItem.item.id);

        nextItem.item.request(backoffFn)
          .then((data) => {
            if (backoffState) {
              this.addBackoff(nextItem, backoffTimer);

              return;
            }

            if (data) {
              debug('Queue item executed successfully', nextItem.item.id);

              nextItem.item.callback(null, data);
            }
          })
          .catch((error) => {
            debugError('Queue item request error', error);

            nextItem.item.callback(error);
          })
          .then(() => this.execute());
      });
  }

  private shift(queue?: QueueItem): Promise<ShiftItemStructure | void> {
    return this.findMostImportant(queue)
      .then((currentQueue?: QueueItem) => {
        if (!currentQueue || !currentQueue.data.length) {
          return;
        }

        this.setCooldown(currentQueue);

        return {
          item: currentQueue.data.shift(),
          queue: currentQueue
        };
      });
  }

  private heat(): void {
    if (this.params.ignoreOverallOverheat) {
      return;
    }

    this.overheat += this.heatPart;

    debug('Heating overall queue', this.overheat);

    setTimeout(() => {
      this.overheat = Math.max(this.overheat - this.heatPart, 0);

      debug('Cooling down overall heat', this.overheat);
    }, this.heatPart);
  }

  private async findMostImportant(bestQueue?: QueueItem): Promise<QueueItem | void> {
    if (bestQueue) {
      debug('Providing best queue', bestQueue.id);

      return bestQueue;
    }

    let maximumPriority = Infinity;
    let selectedQueue: QueueItem = null;
    let minimalCooldown = Infinity;

    this.queue.forEach((queue: QueueItem) => {
      if (queue.rule.priority < maximumPriority && queue.data.length && this.isCool(queue)) {
        maximumPriority = queue.rule.priority;
        selectedQueue = queue;
      }

      if (queue.cooldown < minimalCooldown) {
        minimalCooldown = queue.cooldown;
      }
    });

    if (minimalCooldown > 0 && minimalCooldown !== Infinity) {
      debug('Waiting for cooldown', minimalCooldown);

      return this.delay(minimalCooldown)
        .then(() => this.findMostImportant());
    }

    if (this.isOverheated && !this.params.ignoreOverallOverheat) {
      debug('Everything is overheated');

      return this.delay(this.overheat)
        .then(() => this.findMostImportant());
    }

    if (!selectedQueue && this.totalLength === 0) {
      debug('No queues available. Stopping queue');

      this.pending = false;

      return;
    }

    debug('Finding best queue', selectedQueue && selectedQueue.id);

    return selectedQueue;
  }

  private setCooldown(queue: QueueItem): void {
    const ruleData = this.params.rules[queue.ruleName];
    const cooldown = ruleData.limit * 1000 / ruleData.rate;

    queue.cooldown = cooldown;

    debug('Setting cooldown', queue.id, cooldown);

    setTimeout(() => {
      queue.cooldown = Math.max(queue.cooldown - cooldown, 0);

      debug('Removing cooldown', queue.id, cooldown);

      if (!queue.data.length) {
        this.remove(queue.key);
      }
    }, cooldown);
  }

  private delay(time = 0): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, time));
  }

  private isCool(queue: QueueItem): boolean {
    const cooldown = queue.rule.limit * 1000 / queue.rule.rate;

    return queue.cooldown < cooldown;
  }

  private remove(key: string) {
    this.queue.delete(key);
  }
}

export default Queue;
