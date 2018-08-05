/**
 * Created by energizer on 13.06.17.
 */
const config = require('config');

function SmartQueue() {
  this.params = config.get('queue') ||
    {
      rules: {
        individual: {
          rate: 1,
          limit: 1,
          priority: 1
        },
        group: {
          rate: 20,
          limit: 60,
          priority: 2
        },
        common: {
          rate: 30,
          limit: 1,
          priority: 3
        },
        vk: {
          rate: 1000,
          limit: 1,
          priority: 4
        }
      },
      defaultRule: 'common',
      defaultKey: 'common',
      overallRate: 30,
      backOffTime: 300,
      backOffTimeout: 900,
      overallLimit: 1,
      ignoreOverheat: true
    };
  this.queue = {};
  this.overheat = 0;
  this.pending = false;
  this.heatPart = this.params.overallLimit * 1000 / this.params.overallRate;
}

SmartQueue.prototype.createQueue = function (queueName, request, callback, rule) {
  var key = queueName;

  if (!this.queue[key]) {
    this.queue[key] = {
      cooldown: 0,
      key: queueName,
      data: [],
      rule: this.params.rules[rule]
    };

    this.queue[key].ruleName = rule;
  }

  this.queue[key].data.push({
    request,
    callback
  });

  return this.queue[key];
};

SmartQueue.prototype.addBackoff = function (item, delay) {
  setTimeout(() => {
    return this.add(item.item.request, item.item.callback, item.queue.key, item.queue.ruleName);
  }, delay * 1000);
};

SmartQueue.prototype.add = function (request, callback, key, rule) {
  var queue = this.createQueue(key || this.params.defaultKey, request, callback, rule || this.params.defaultRule);

  if (!this.pending) {
    this.execute();
  }

  return queue;
};

SmartQueue.prototype.remove = function (key) {
  delete this.queue[key];
};

SmartQueue.prototype.delay = function (time) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      return resolve();
    }, time || 0);
  });
};

SmartQueue.prototype.getTotalLength = function () {
  var count = 0;
  Object.keys(this.queue).forEach(function (key) {
    count += this.queue[key].data.length;
  }, this);

  return count;
};

SmartQueue.prototype.heat = function () {
  if (this.params.ignoreOverheat) {
    return false;
  }

  this.overheat = this.heatPart;
  setTimeout(() => {
    this.overheat = 0;
  }, this.heatPart);
};

SmartQueue.prototype.execute = function () {
  this.pending = true;

  var backoffState = false,
    backoffTimer = 0,
    backoffFn = function (delay) {
      backoffState = true;
      backoffTimer = delay || self.params.backOffTime;
    };

  return this.shift().then((nextItem) => {
    if (!nextItem.item) {
      return false;
    }

    this.heat();

    return nextItem.item.request.call(nextItem.item.request, backoffFn).then((data) => {
      if (backoffState) {
        console.log('backing off request in', backoffTimer);
        this.addBackoff(nextItem, backoffTimer);
      } else {
        if (data) {
          nextItem.item.callback.call(nextItem.item.callback, null, data);
        }
      }

      return this.execute();
    }).catch((error) => {
      nextItem.item.callback.call(nextItem.item.callback, error);
      return this.execute();
    });
  });
};

SmartQueue.prototype.setCooldown = function (queue) {
  var ruleData = this.params.rules[queue.ruleName],
    cooldown = ruleData.limit * 1000 / ruleData.rate;
  queue.cooldown = cooldown;
  setTimeout(() => {
    queue.cooldown = 0;

    if (!queue.data.length) {
      this.remove(queue.key);
    }
  }, cooldown);
};

SmartQueue.prototype.isCool = function (queue) {
  var cooldown = this.queue[queue].rule.limit * 1000 / this.queue[queue].rule.rate;
  return this.queue[queue].cooldown < cooldown;
};

SmartQueue.prototype.isOverheated = function () {
  return this.overheat > 0;
};

SmartQueue.prototype.findMostImportant = function (bestQueue) {
  if (bestQueue) {
    return Promise.resolve(bestQueue);
  }

  var maximumPriority = Infinity,
    selectedQueue = null,
    minimalCooldown = Infinity,
    coolestQueue = null;

  Object.keys(this.queue).forEach(function (queue) {
    if (this.queue[queue].rule.priority < maximumPriority && this.queue[queue].data.length && this.isCool(queue)) {
      maximumPriority = this.queue[queue].rule.priority;
      selectedQueue = this.queue[queue];
    }
    if (this.queue[queue].cooldown < minimalCooldown) {
      minimalCooldown = this.queue[queue].cooldown;
      coolestQueue = this.queue[queue];
    }
  }, this);

  if (minimalCooldown > 0 && minimalCooldown !== Infinity) {
    //console.log('everything is in cooldown');
    return this.delay(minimalCooldown).then(this.findMostImportant.bind(this));
  }

  if (this.isOverheated() && !this.params.ignoreOverheat) {
    //console.log('queue is overheated');
    return this.delay(this.overheat).then(this.findMostImportant.bind(this));
  }

  if (!selectedQueue && this.getTotalLength() === 0) {
    //console.log('queue is empty');
    this.pending = false;
  }

  return Promise.resolve(selectedQueue);

};

SmartQueue.prototype.shift = function () {
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

SmartQueue.prototype.request = function (fn, key, rule) {
  return new Promise((resolve, reject) => {
    return this.add(fn, function (error, data) {
      if (error) {
        return reject(error);
      }

      return resolve(data);
    }, key, rule);
  });
};

module.exports = SmartQueue;

/*let counter = 0;

var queue = new SmartQueue(),
    request = function (data) {
        return new Promise(function (resolve, reject) {
            console.warn('request    ', new Date(),  data);
            setTimeout(function () {
                counter++;
                if (counter >= 3) {
                    counter = 0;
                    return reject({ok: false, delay: 10});
                }

                return resolve({ok: true, data});
            }, 10);
        });
    };

for (let i = 0; i < 10; i++) {
    queue.request(function (backoff) {
        return request({chat_id: 1, message: 'individual ' + i}).catch(function (error) {
            return backoff(error.delay);
        });
    }, 1, 'individual').then(function (data) {
        console.log('individual response', data);
    });
}

for (let i = 0; i < 100; i++) {
    //queue.add(request.bind(this, {chat_id: 1, message: 'broadcast ' + i}), i, 'common');
    queue.request(function (backoff) {
        return request({chat_id: 1, message: 'broadcast ' + i}).catch(function (error) {
            return backoff(error.delay);
        });
    }, i, 'common').then(function (data) {
        console.log('broadcast response', data);
    });
}

for (let i = 0; i < 100; i++) {
    //queue.add(request.bind(this, {chat_id: 1000, message: 'group ' + i}), 1000, 'group');
    queue.request(function (backoff) {
        return request({chat_id: 1000, message: 'group ' + i}).catch(function (error) {
            return backoff(error.delay);
        });
    }, 1000, 'group');
}

for (let i = 0; i < 100; i++) {
    //queue.add(request.bind(this, {chat_id: 1, message: 'common ' + i}), 3, 'common');
    queue.request(function (backoff) {
        return request({chat_id: 1, message: 'common ' + i}).catch(function (error) {
            return backoff(error.delay);
        });
    }, 3, 'common');
}

setTimeout(function () {
    for (let i = 2; i < 100; i++) {
        //queue.add(request.bind(this, {chat_id: i, message: 'broadcast2 ' + i}), i, 'common');
        queue.request(function (backoff) {
            return request({chat_id: 1, message: 'broadcast2 ' + i}).catch(function (error) {
                return backoff(error.delay);
            });
        }, i, 'common');
    }
}, 5000);*/