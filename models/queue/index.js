/**
 * Created by energizer on 13.06.17.
 */
const config = require('config');
const debug = require('debug')('baneks-node:queue');
const debugError = require('debug')('baneks-nod:error:queue');

class Queue {
  constructor () {
    this.params = Object.assign({
      rules: {
        common: {
          rate: 30,
          limit: 1,
          priority: 3
        }
      },
      default: {
        rule: 'common',
        key: 'common',
        rate: 30,
        limit: 1,
        priority: 3
      },
      overall: {
        rate: 30,
        limit: 1
      },
      backOffTime: 300,
      backOffTimeout: 900,
      ignoreOverallOverheat: true
    }, config.get('queue'));

    this.queue = {};
    this.overheat = 0;
    this.pending = false;
    this.heatPart = this.params.overall.limit * 1000 / this.params.overall.rate;
  }

  createQueue (queueName, request, callback, rule) {
    debug('Creating queue', queueName, rule);

    if (!this.queue[queueName]) {
      this.queue[queueName] = {
        cooldown: 0,
        key: queueName,
        data: [],
        rule: this.getRule(rule)
      };

      this.queue[queueName].ruleName = rule;
    }

    this.queue[queueName].data.push({
      request,
      callback
    });

    return this.queue[queueName];
  }

  getRule (name, params = {}) {
    if (this.params.rules[name]) {
      return this.params.rules[name];
    }

    this.params.rules[name] = Object.assign({
      rate: this.params.default.rate,
      limit: this.params.default.limit,
      priority: this.params.default.priority
    }, params);

    return this.params.rules[name];
  }

  addBackoff (item, delay) {
    return this.delay(delay * 1000)
      .then(() => this.add(item.item.request, item.item.callback, item.queue.key, item.queue.rule));
  }

  add (request, callback, key = this.params.default.key, rule = this.params.default.rule) {
    debug('Adding request to the queue', key, rule);

    const queue = this.createQueue(key, request, callback, rule);

    if (!this.pending) {
      return this.execute(queue);
    }

    return queue;
  }

  execute (queue) {
    debug('Executing queue', queue);

    this.pending = true;

    let backoffState = false;
    let backoffTimer = 0;
    const backoffFn = delay => {
      backoffState = true;
      backoffTimer = delay || this.params.backOffTime;
    };

    return this.shift(queue)
      .then(nextItem => {
        if (!nextItem || !nextItem.item) {
          return;
        }

        this.heat();

        return nextItem.item.request(backoffFn)
          .then(data => {
            if (backoffState) {
              this.addBackoff(nextItem, backoffTimer);
            } else {
              if (data) {
                nextItem.item.callback(null, data);
              }
            }
          })
          .catch(error => {
            debugError('Queue request error', error);

            nextItem.item.callback(error);
          })
          .then(() => this.execute());
      });
  }

  shift (queue) {
    return this.findMostImportant(queue)
      .then((currentQueue) => {
        if (!currentQueue || !currentQueue.data.length) {
          return;
        }

        this.setCooldown(currentQueue);

        return {
          queue: currentQueue,
          item: currentQueue.data.shift()
        };
      });
  };

  heat () {
    if (this.params.ignoreOverallOverheat) {
      return;
    }

    this.overheat += this.heatPart;

    debug('Heating queue', this.overheat);

    setTimeout(() => {
      this.overheat = Math.max(this.overheat - this.heatPart, 0);

      debug('Cooling down heat', this.overheat);
    }, this.heatPart);
  }

  async findMostImportant (bestQueue) {
    debug('Finding most important queue');

    if (bestQueue) {
      debug('Providing best queue', bestQueue.rule, bestQueue.key);

      return bestQueue;
    }

    let maximumPriority = Infinity;
    let selectedQueue = null;
    let minimalCooldown = Infinity;

    Object.values(this.queue).forEach(queue => {
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
        .then(queue => this.findMostImportant(queue));
    }

    if (this.isOverheated && !this.params.ignoreOverallOverheat) {
      debug('Everything is overheated');

      return this.delay(this.overheat)
        .then(queue => this.findMostImportant(queue));
    }

    if (!selectedQueue && this.getTotalLength === 0) {
      debug('Stopping queue');

      this.pending = false;

      return;
    }

    debug('Finding best queue', selectedQueue);

    return selectedQueue;
  }

  setCooldown (queue) {
    const ruleData = this.params.rules[queue.ruleName];
    const cooldown = ruleData.limit * 1000 / ruleData.rate;

    queue.cooldown = cooldown;

    debug('Setting cooldown', ruleData, cooldown);

    setTimeout(() => {
      queue.cooldown = Math.max(queue.cooldown - cooldown, 0);

      debug('Removing cooldown', ruleData, cooldown);

      if (!queue.data.length) {
        this.remove(queue.key);
      }
    }, cooldown);
  }

  delay (time = 0) {
    return new Promise(resolve => setTimeout(resolve, time));
  }

  isCool (queue) {
    const cooldown = queue.rule.limit * 1000 / queue.rule.rate;

    return queue.cooldown < cooldown;
  }

  remove (key) {
    delete this.queue[key];
  }

  request (fn, key = 'common', rule = 'common') {
    return new Promise((resolve, reject) => {
      return this.add(fn, (error, data) => {
        if (error) {
          debugError('Queue fulfilling error', error);

          return reject(error);
        }

        debug('Resolving queue request', key, rule);

        return resolve(data);
      }, key, rule);
    });
  }

  get isOverheated () {
    return this.overheat > 0;
  }

  get getTotalLength () {
    return Object.keys(this.queue).reduce((acc, key) => acc + this.queue[key].data.length, 0);
  }
}

module.exports = Queue;
