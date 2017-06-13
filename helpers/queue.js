/**
 * Created by energizer on 13.06.17.
 */

var Q = require('q');

function SmartQueue (params) {
    this.params = params ||
        {
            rules: {
                individual: {
                    rate: 1,
                    limit: 1,
                    backOffTime: 300,
                    backOffTimeout: 900,
                    priority: 1
                },
                group: {
                    rate: 20,
                    limit: 60,
                    backOffTime: 300,
                    backOffTimeout: 900,
                    priority: 2
                },
                common: {
                    rate: 30,
                    limit: 1,
                    backOffTime: 300,
                    backOffTimeout: 900,
                    priority: 3
                }
            },
            defaultRule: 'common',
            defaultKey: 'common',
            overallRate: 30,
            overallLimit: 1
        };
    this.queue = {};
    this.overheat = 0;
    this.pending = false;
    this.heatPart = this.params.overallLimit / this.params.overallRate;
    this.heatInterval = setInterval((function () {
        this.overheat -= this.heatPart;
        if (this.overheat < 0) {
            this.overheat = 0;
        }
    }).bind(this), this.heatPart * 1000);
}

SmartQueue.prototype.createQueue = function (queueName, request, rule) {
    var requestObject = {
            cooldown: 0,
            key: queueName,
            data: [],
            rule: this.params.rules[rule]
        },
        key = queueName;

    requestObject.ruleName = rule;

    if (!this.queue[key]) {
        this.queue[key] = requestObject;
    }

    this.queue[key].data.push(request);

    return this.queue[key];
};

SmartQueue.prototype.add = function (request, key, rule) {
    var queue = this.createQueue(key || this.params.defaultKey, request, rule || this.params.defaultRule);

    if (!this.pending) {
        this.execute();
    }

    return queue;
};

SmartQueue.prototype.remove = function (key) {
    delete this.queue[key];
};

SmartQueue.prototype.delay = function (time) {
    return new Q.Promise(function (resolve) {
        setTimeout(function () {
            return resolve();
        }, time || 0);
    })
};

SmartQueue.prototype.getTotalLength = function () {
    var count = 0;
    Object.keys(this.queue).forEach(function (key) {
        count += this.queue[key].data.length;
    }, this);

    return count;
};

SmartQueue.prototype.heat = function () {
    this.overheat += this.heatPart;
};

SmartQueue.prototype.execute = function () {
    this.pending = true;

    return this.shift().then((function (nextItem) {
        this.heat();

        return nextItem.call(this).then((function () {
            return this.execute();
        }).bind(this));
    }).bind(this));
};

SmartQueue.prototype.setCooldown = function (queue) {
    var ruleData = this.params.rules[queue.ruleName],
        cooldown = ruleData.limit * 1000 / ruleData.rate;
    queue.cooldown = cooldown;
    setTimeout((function () {
        queue.cooldown = 0;

        if (!queue.data.length) {
            this.remove(queue.key);
        }
    }).bind(this), cooldown);
};

SmartQueue.prototype.isCool = function (queue) {
    var cooldown = this.queue[queue].rule.limit * 1000 / this.queue[queue].rule.rate;
    return this.queue[queue].cooldown < cooldown;
};

SmartQueue.prototype.isOverheated = function () {
    return this.overheat >= this.params.overallLimit / this.params.overallRate;
};

SmartQueue.prototype.findMostImportant = function () {
    var maximumPriority = Infinity,
        selectedQueue = '';
    Object.keys(this.queue).forEach(function (queue) {
        if (this.queue[queue].rule.priority <= maximumPriority && this.isCool(queue) ) {
            maximumPriority = this.queue[queue].rule.priority;
            selectedQueue = queue;
        }
    }, this);

    if (!this.queue[selectedQueue] && this.getTotalLength() > 0 && !this.isOverheated()) {
        //console.log('everything is overheated');
        return this.delay(this.heatPart * 1000).then(this.findMostImportant.bind(this));
    }

    return new Q.Promise.resolve(this.queue[selectedQueue]);

};

SmartQueue.prototype.shift = function () {
    return this.findMostImportant().then((function (currentQueue) {
        this.setCooldown(currentQueue);
        //console.log('shift      ', currentQueue.cooldown, this.overheat);
        return currentQueue.data.shift();
    }).bind(this));
};

module.exports = function () {
    return SmartQueue;
};

var queue = new SmartQueue(),
    request = function (data) {
        return Q.Promise(function (resolve) {
            console.log('request    ', data);
            setTimeout(function () {
                return resolve({ok: true});
            }, 130);
        });
    };

for (var i = 0; i < 100; i++) {
    queue.add(request.bind(this, {chat_id: 1, message: 'individual ' + i}), 1, 'individual');
}

for (var i = 0; i < 100; i++) {
    queue.add(request.bind(this, {chat_id: 1, message: 'broadcast ' + i}), i, 'common');
}

for (var i = 0; i < 100; i++) {
    queue.add(request.bind(this, {chat_id: 1, message: 'group ' + i}), 1000, 'group');
}

for (var i = 0; i < 100; i++) {
    queue.add(request.bind(this, {chat_id: 1, message: 'common ' + i}), 3, 'common');
}