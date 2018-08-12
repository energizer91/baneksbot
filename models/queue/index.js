/**
 * Created by energizer on 13.06.17.
 */
const config = require('config');

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
      defaultRule: 'common',
      defaultKey: 'common',
      defaultRate: 30,
      defaultLimit: 1,
      overallRate: 30,
      overallLimit: 1,
      backOffTime: 300,
      backOffTimeout: 900,
      ignoreOverallOverheat: true
    }, config.get('queue'));

    this.queue = {};
    this.overheat = 0;
    this.pending = false;
    this.heatPart = this.params.overallLimit * 1000 / this.params.overallRate;
  }

  createQueue (queueName, request, callback, rule) {
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
      rate: this.params.defaultRate,
      limit: this.params.defaultLimit,
      priority: 3
    }, params);

    return this.params.rules[name];
  }

  addBackoff (item, delay) {
    setTimeout(() => {
      return this.add(item.item.request, item.item.callback, item.queue.key, item.queue.ruleName);
    }, delay * 1000);
  }

  add (request, callback, key, rule) {
    const queue = this.createQueue(key || this.params.defaultKey, request, callback, rule || this.params.defaultRule);

    if (!this.pending) {
      this.execute();
    }

    return queue;
  }

  execute () {
    this.pending = true;

    let backoffState = false;
    let backoffTimer = 0;
    const backoffFn = delay => {
      backoffState = true;
      backoffTimer = delay || this.params.backOffTime;
    };

    return this.shift()
      .then(nextItem => {
        if (!nextItem.item) {
          return false;
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
            nextItem.item.callback(error);
          })
          .then(() => this.execute());
      });
  }

  shift () {
    return this.findMostImportant().then((currentQueue) => {
      if (!currentQueue || !currentQueue.data.length) {
        return false;
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
      return false;
    }

    this.overheat = this.heatPart;

    setTimeout(() => {
      this.overheat = 0;
    }, this.heatPart);
  }

  findMostImportant (bestQueue) {
    if (bestQueue) {
      return Promise.resolve(bestQueue);
    }

    let maximumPriority = Infinity;
    let selectedQueue = null;
    let minimalCooldown = Infinity;

    Object.keys(this.queue).forEach(queue => {
      if (this.queue[queue].rule.priority < maximumPriority && this.queue[queue].data.length && this.isCool(queue)) {
        maximumPriority = this.queue[queue].rule.priority;
        selectedQueue = this.queue[queue];
      }

      if (this.queue[queue].cooldown < minimalCooldown) {
        minimalCooldown = this.queue[queue].cooldown;
      }
    }, this);

    if (minimalCooldown > 0 && minimalCooldown !== Infinity) {
      return this.delay(minimalCooldown)
        .then(this.findMostImportant.bind(this));
    }

    if (this.isOverheated && !this.params.ignoreOverallOverheat) {
      return this.delay(this.overheat)
        .then(this.findMostImportant.bind(this));
    }

    if (!selectedQueue && this.getTotalLength === 0) {
      this.pending = false;
    }

    return Promise.resolve(selectedQueue);
  }

  setCooldown (queue) {
    const ruleData = this.params.rules[queue.ruleName];
    const cooldown = ruleData.limit * 1000 / ruleData.rate;

    queue.cooldown = cooldown;

    setTimeout(() => {
      queue.cooldown = Math.max(queue.cooldown - cooldown, 0);

      if (!queue.data.length) {
        this.remove(queue.key);
      }
    }, cooldown);
  }

  delay (time) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        return resolve();
      }, time || 0);
    });
  }

  isCool (queue) {
    const cooldown = this.queue[queue].rule.limit * 1000 / this.queue[queue].rule.rate;
    return this.queue[queue].cooldown < cooldown;
  }

  remove (key) {
    delete this.queue[key];
  }

  request (fn, key = 'common', rule = 'common') {
    return new Promise((resolve, reject) => {
      return this.add(fn, function (error, data) {
        if (error) {
          return reject(error);
        }

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
