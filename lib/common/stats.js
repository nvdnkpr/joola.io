/**
 *  @title joola.io/lib/common/stats
 *  @overview Provides system usage statistics for the management portal
 *  @description
 *  The `stats` object emits stats taken from redis regarding the usage of the joola.io framework.
 *
 * - [statsEvents](#statsEvents)
 * - [incr](#incr)
 *
 *  @copyright (c) Joola Smart Solutions, Ltd. <info@joo.la>
 *  @license GPL-3.0+ <http://spdx.org/licenses/GPL-3.0+>. Some rights reserved. See LICENSE, AUTHORS
 **/


var
  async = require('async'),
  _ = require('underscore'),
  cluster = require('cluster'),
  EventEmitter2 = require('eventemitter2').EventEmitter2;

var twix = require('twix');
var moment = require('moment');

var stats = new EventEmitter2({wildcard: true, newListener: true});
stats._id = 'stats';

module.exports = exports = stats;

stats.emitInterval = 1000; //1 second
stats.ttl = 1000 * 60 * 60; //1 hour

stats.queries = {};
stats.queries.usage = {
  current: {
    name: 'usage-current',
    collection: 'usage',
    factor: 1,
    before: function (callback) {
      var $match = this[0].$match;
      var _date = new Date();
      _date.setSeconds(_date.getSeconds() - 5);
      $match.timestamp.$gt = _date;
      return callback();
    },
    query: [
      {$match: {timestamp: {$gt: 'LASTMINUTE'}}},
      {$project: {second: '$timebucket.second', cpu: '$metrics.cpu.value', mem: '$metrics.mem.value'}},
      {$group: {_id: 'value', cpu: {$avg: '$cpu'}, mem: {$avg: '$mem'}}}
    ]
  },
  lasthour: {
    name: 'usage-lasthour',
    collection: 'usage',
    factor: 60,
    before: function (callback) {
      var $match = this[0].$match;
      var _date = new Date();
      _date.setMinutes(_date.getMinutes() - 1);
      $match.timestamp.$gt = _date;
      return callback();
    },
    query: [
      {$match: {timestamp: {$gt: 'ANHOURAGO'}}},
      {$project: {second: '$timebucket.second', cpu: '$metrics.cpu.value', mem: '$metrics.mem.value'}},
      {$group: {_id: '$second', cpu: {$avg: '$cpu'}, mem: {$avg: '$mem'}}},
      {$sort: {_id: -1}}
    ]
  }
};
stats.queries.eventloop = {
  current: {
    name: 'eventlooplocks-current',
    collection: 'eventlooplocks',
    factor: 1,
    before: function (callback) {
      var $match = this[0].$match;
      var _date = new Date();
      _date.setMinutes(_date.getMinutes() - 1);
      _date.setSeconds(_date.getSeconds() - 1);
      $match.timestamp.$gt = _date;
      return callback();
    },
    query: [
      {$match: {timestamp: {$gt: 'LASTMINUTE'}}},
      {$project: {second: '$timebucket.second', eventlooplocks: '$metrics.eventlooplocks.value'}},
      {$group: {_id: 'value', eventlooplocks: {$sum: '$eventlooplocks'}}}
    ]
  },
  lasthour: {
    name: 'eventlooplocks-lasthour',
    collection: 'eventlooplocks',
    factor: 60,
    before: function (callback) {
      var $match = this[0].$match;
      var _date = new Date();
      _date.setMinutes(_date.getMinutes() - 1);
      $match.timestamp.$gt = _date;
      return callback();
    },
    query: [
      {$match: {timestamp: {$gt: 'ANHOURAGO'}}},
      {$project: {minute: '$timebucket.second', eventlooplocks: '$metrics.eventlooplocks.value'}},
      {$group: {_id: '$minute', eventlooplocks: {$sum: '$eventlooplocks'}}},
      {$sort: {_id: -1}}
    ]
  }
};
stats.queries.events = {
  current: {
    name: 'events-current',
    collection: 'events',
    factor: 1,
    before: function (callback) {
      var $match = this[0].$match;
      var _date = new Date();
      _date.setSeconds(_date.getSeconds() - 5);
      $match.timestamp.$gt = _date;
      return callback();
    },
    query: [
      {$match: {timestamp: {$gt: 'LASTMINUTE'}}},
      {$project: {second: '$timebucket.second', events: '$metrics.events.value'}},
      {$group: {_id: 'value', events: {$sum: '$events'}}}
    ],
    after: function (value, callback) {
      if (value[0])
        value[0].events = Math.round(value[0].events / 5 * 10) / 10;

      return callback(null, value);
    }
  },
  lasthour: {
    name: 'events-lasthour',
    collection: 'events',
    factor: 60,
    before: function (callback) {
      var $match = this[0].$match;
      var _date = new Date();
      _date.setMinutes(_date.getMinutes() - 1);
      _date.setSeconds(_date.getSeconds() - 1);
      $match.timestamp.$gt = _date;
      return callback();
    },
    query: [
      {$match: {timestamp: {$gt: 'ANHOURAGO'}}},
      {$project: {minute: '$timebucket.second', events: '$metrics.events.value'}},
      {$group: {_id: '$minute', events: {$sum: '$events'}}},
      {$sort: {_id: -1}}
    ]
  },
  fulfillment: {
    name: 'fulfillment-current',
    collection: 'events',
    factor: 1,
    before: function (callback) {
      var $match = this[0].$match;
      var _date = new Date();
      _date.setSeconds(_date.getSeconds() - 5);
      $match.timestamp.$gt = _date;
      return callback();
    },
    query: [
      {$match: {timestamp: {$gt: 'LASTMINUTE'}}},
      {$project: {second: '$timebucket.second', events: '$metrics.events.value', fulfilled: '$metrics.fulfilled.value'}},
      {$group: {_id: 'value', events: {$sum: '$events'}, fulfilled: {$sum: '$fulfilled'}}}
    ],
    after: function (value, callback) {
      if (value[0]) {
        if (value[0].events > 0)
          value[0].fulfillment = Math.round((value[0].events / value[0].fulfilled * 100) * 10) / 10;
        else
          value[0].fulfillment = 100;
      }/*
      else{
        value = [{}];
        value[0].fulfillment = 100;
      }*/

      return callback(null, value);
    }
  },
  fulfillmenttime: {
    name: 'fulfillment-time',
    collection: 'events',
    factor: 1,
    before: function (callback) {
      var $match = this[0].$match;
      var _date = new Date();
      _date.setSeconds(_date.getSeconds() - 5);
      $match.timestamp.$gt = _date;
      return callback();
    },
    query: [
      {$match: {timestamp: {$gt: 'LASTMINUTE'}}},
      {$project: {second: '$timebucket.second', fulfilledtime: '$metrics.fulfilledtime.value'}},
      {$group: {_id: 'value', fulfilledtime: {$avg: '$fulfilledtime'}}}
    ]
  }
};
stats.queries.nodecount = {
  current: {
    name: 'nodecount-current',
    collection: 'node-count',
    factor: 1,
    query: [
      //{$match: {timestamp: {$gt: 'LASTMINUTE'}}},
      {$sort: {timestamp: -1}},
      {$limit: 1},
      {$group: {_id: 'value', nodes: {$sum: '$metrics.nodes.value'}}}
    ]
  },
  lasthour: {
    name: 'nodecount-lasthour',
    collection: 'node-count',
    factor: 60,
    before: function (callback) {
      var $match = this[0].$match;
      var _date = new Date();
      _date.setMinutes(_date.getMinutes() - 1);
      $match.timestamp.$gt = _date;
      return callback();
    },
    query: [
      {$match: {timestamp: {$gt: 'ANHOURAGO'}}},
      {$project: {second: '$timebucket.second', nodes: '$metrics.nodes.value'}},
      {$group: {_id: '$second', nodes: {$sum: '$nodes'}}},
      {$sort: {_id: -1}}
    ]
  }
};
stats.queries.roundtrip = {
  current: {
    name: 'roundtrip-current',
    collection: 'roundtrip',
    factor: 1,
    before: function (callback) {
      var $match = this[0].$match;
      var _date = new Date();
      _date.setSeconds(_date.getSeconds() - 5);
      $match.timestamp.$gt = _date;
      return callback();
    },
    query: [
      {$match: {timestamp: {$gt: 'LASTMINUTE'}}},
      {$sort: {timestamp: -1}},
      {$limit: 1},
      {$group: {_id: 'value', roundtrip: {$avg: '$metrics.roundtrip.value'}}}
    ]
  }
};

stats.queries.waittime = {
  current: {
    name: 'waittime-current',
    collection: 'waittime',
    factor: 1,
    before: function (callback) {
      var $match = this[0].$match;
      var _date = new Date();
      _date.setSeconds(_date.getSeconds() - 5);
      $match.timestamp.$gt = _date;
      return callback();
    },
    query: [
      {$match: {timestamp: {$gt: 'LASTMINUTE'}}},
      {$sort: {timestamp: -1}},
      {$limit: 1},
      {$group: {_id: 'value', waittime: {$avg: '$metrics.waittime.value'}}}
    ]
  },
  lasthour: {
    name: 'waittime-lasthour',
    collection: 'waittime',
    factor: 60,
    before: function (callback) {
      var $match = this[0].$match;
      var _date = new Date();
      _date.setMinutes(_date.getMinutes() - 1);
      $match.timestamp.$gt = _date;
      return callback();
    },
    query: [
      {$match: {timestamp: {$gt: 'ANHOURAGO'}}},
      {$project: {second: '$timebucket.second', waittime: '$metrics.waittime.value'}},
      {$group: {_id: '$second', nodes: {$avg: '$waittime'}}},
      {$sort: {_id: -1}}
    ]
  }
};

stats.queries.exceptions = {
  current: {
    name: 'exceptions-current',
    collection: 'exceptions',
    factor: 1,
    before: function (callback) {
      var $match = this[0].$match;
      var _date = new Date();
      _date.setSeconds(_date.getSeconds() - 5);
      $match.timestamp.$gt = _date;
      return callback();
    },
    query: [
      {$match: {timestamp: {$gt: 'LASTMINUTE'}}},
      {$sort: {timestamp: -1}},
      {$group: {_id: 'value', exceptions: {$sum: '$metrics.exceptions.value'}}}
    ]
  },
  lasthour: {
    name: 'exceptions-lasthour',
    collection: 'exceptions',
    factor: 60,
    before: function (callback) {
      var $match = this[0].$match;
      var _date = new Date();
      _date.setMinutes(_date.getMinutes() - 1);
      $match.timestamp.$gt = _date;
      return callback();
    },
    query: [
      {$match: {timestamp: {$gt: 'ANHOURAGO'}}},
      {$project: {second: '$timebucket.second', exceptions: '$metrics.exceptions.value'}},
      {$group: {_id: '$second', exceptions: {$avg: '$exceptions'}}},
      {$sort: {_id: -1}}
    ]
  }
};

stats.queries.tokens = {
  current: {
    name: 'tokens-current',
    collection: 'token-count',
    factor: 1,
    query: [
      //{$match: {timestamp: {$gt: 'LASTMINUTE'}}},
      {$sort: {timestamp: -1}},
      {$limit: 1},
      {$group: {_id: 'value', tokens: {$avg: '$metrics.tokens.value'}}}
    ]
  },
  lasthour: {
    name: 'tokens-lasthour',
    collection: 'token-count',
    factor: 60,
    before: function (callback) {
      var $match = this[0].$match;
      var _date = new Date();
      _date.setMinutes(_date.getMinutes() - 1);
      $match.timestamp.$gt = _date;
      return callback();
    },
    query: [
      {$match: {timestamp: {$gt: 'ANHOURAGO'}}},
      {$project: {second: '$timebucket.second', tokens: '$metrics.tokens.value'}},
      {$group: {_id: '$second', nodes: {$avg: '$tokens'}}},
      {$sort: {_id: -1}}
    ]
  }
};
/**
 * Lists all stat events from redis
 *
 * Configuration elements participating: `config:datasources`.
 *
 * Events raised via `stats`: `stats:events`
 *
 * ```js
 * joola.stats.statsEvents();
 * ```
 */
stats.statsEvents = function () {
  if (!joola.io) {
    setTimeout(stats.statsEvents, stats.emitInterval);
    return;
  }

  Object.keys(stats.queries).forEach(function (group) {
    group = stats.queries[group];
    Object.keys(group).forEach(function (query) {
      query = group[query];
      if (query.query) {
        var endDate = new Date();
        endDate.setSeconds(endDate.getSeconds() - 1);
        var startDate = new Date(endDate);
        startDate.setMilliseconds(0);
        startDate.setSeconds(startDate.getSeconds() - (query.factor - 1));
        //startDate.setMinutes(startDate.getMinutes() - (query.factor - 1));
        endDate.setMilliseconds(0);
        var itr = moment.twix(startDate, endDate).iterate("second");
        var range = [];
        while (itr.hasNext()) {
          var value = itr.next()._d;
          range.push([value.getTime(), null]);
        }
        var execute = function () {
          joola.mongo.aggregate('stats', query.collection, query.query, {}, function (err, result) {
            if (err) {
              return;
            }
            var message;

            var processResults = function (result) {
              if (query.factor > 1) {
                var _range = range.clone();
                for (var i = 0; i < _range.length; i++) {
                  /*jshint -W083 */
                  var exist = _.filter(result, function (row) {
                    var _ts = new Date(row._id).getTime();
                    return _ts == _range[i][0];
                  });

                  if (exist && exist.length > 0) {
                    _range[i] = exist;
                  }
                  else {
                    var _ts = _range[i][0];
                    _range[i] = {
                      _id: _ts
                    };
                  }
                }
                message = {
                  id: 'stats:' + query.name,
                  data: _range
                };
              }
              else {
                message = {
                  id: 'stats:' + query.name,
                  data: result
                };
              }

              joola.io.sockets.emit('stats', message);
            };

            if (query.after) {
              query.after(result, function (err, result) {
                processResults(result);
              });
            }
            else {
              processResults(result);
            }

          });
        };
        if (query.before) {
          query.before.apply(query.query, [function () {
            execute();
          }]);
        }
        else
          execute();
      }
      else if (query.run) {
        query.run.apply(query, [function (err, result) {
          if (err)
            return;

          joola.io.sockets.emit('stats', result);
        }]);
      }
    });
  });

  setTimeout(stats.statsEvents, stats.emitInterval);
};

/**
 * Increments a redis stats key
 * @param {String} [key] The key that will be incremented
 * @param {Function} [callback] called following execution with results.
 *
 * ```js
 * joola.stats.incr(key, function(value) {
 *  console.log(value);
 * });
 * ```
 */
stats.incr = function (key, value, callback) {
  callback = callback || emptyfunc;

  var query;
  var document = {};
  var update = {};
  var _date = new Date();
  var bucket = {};
  _date.setMilliseconds(0);
  document.timestamp = new Date(_date);
  bucket.second = new Date(_date);
  _date.setSeconds(0);
  bucket.minute = new Date(_date);
  _date.setMinutes(0);
  bucket.hour = new Date(_date);
  _date.setUTCHours(0, 0, 0, 0);
  bucket.day = new Date(_date);
  _date.setDate(1);
  bucket.month = new Date(_date);
  _date.setMonth(1);
  bucket.year = new Date(_date);
  document.timebucket = bucket;
  document.node = joola.UID;
  document.key = key;
  document.lookup = document.timestamp.getTime().toString() + document.node + document.key;

  document.metrics = {};
  Object.keys(value).forEach(function (key) {
    var cleanKey = key.substring(0, key.indexOf('$'));
    var agg = key.substring(key.indexOf('$') + 1);
    if (!agg || agg === '')
      agg = 'sum';
    document.metrics[cleanKey] = {};
    document.metrics[cleanKey].key = cleanKey;
    document.metrics[cleanKey].agg = agg;
    document.metrics[cleanKey].value = value[key];
  });
  update = {$inc: {}};
  Object.keys(value).forEach(function (key) {
    var cleanKey = key.substring(0, key.indexOf('$'));
    update.$inc['metrics.' + cleanKey + '.value'] = value[key];
  });

  joola.mongo.insert('stats', key, document, {w: 1}, function (err, count, details) {
    return callback(err);
  });
};

stats.incrby = function (key, incrby, callback) {
  callback = callback || emptyfunc;

  var ts = new Date().getTime();
  joola.redis.hincrby('stats:events:' + key, ts, incrby, function (err, value) {
    joola.redis.expire('stats:events:' + key, stats.ttl, function (err) {
      return callback(err, value);
    });
  });
};

stats.set = function (key, value, callback) {
  callback = callback || emptyfunc;

  var document = {};
  var _date = new Date();
  document.timestamp = new Date(_date);
  var bucket = {};
  _date.setMilliseconds(0);
  bucket.second = new Date(_date);
  _date.setSeconds(0);
  bucket.minute = new Date(_date);
  _date.setMinutes(0);
  bucket.hour = new Date(_date);
  _date.setUTCHours(0, 0, 0, 0);
  bucket.day = new Date(_date);
  _date.setDate(1);
  bucket.month = new Date(_date);
  _date.setMonth(1);
  bucket.year = new Date(_date);
  document.timebucket = bucket;
  document.node = joola.UID;
  document.key = key;
  document.metrics = {};
  Object.keys(value).forEach(function (key) {
    var cleanKey = key.substring(0, key.indexOf('$'));
    var agg = key.substring(key.indexOf('$') + 1);
    if (!agg || agg === '')
      agg = 'sum';
    document.metrics[cleanKey] = {};
    document.metrics[cleanKey].key = cleanKey;
    document.metrics[cleanKey].agg = agg;
    document.metrics[cleanKey].value = value[key];
  });

  joola.mongo.insert('stats', key, document, {}, function (err) {
    return callback(err);
  });

  /*
   var ts = new Date().getTime();
   joola.redis.hmset('stats:events:' + key, ts, value, function (err, value) {
   joola.redis.expire('stats:events:' + key, stats.ttl, function (err) {
   return callback(err, value);
   });
   });*/
};

joola.events.on('init:done', function () {
  if (cluster.worker && cluster.worker.id == 1)
    setTimeout(stats.statsEvents, stats.emitInterval);
  else if (!cluster.worker)
    setTimeout(stats.statsEvents, stats.emitInterval);
});