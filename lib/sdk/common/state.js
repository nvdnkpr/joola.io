/**
 *  @title joola.io
 *  @overview the open-source data analytics framework
 *  @copyright Joola Smart Solutions, Ltd. <info@joo.la>
 *  @license GPL-3.0+ <http://spdx.org/licenses/GPL-3.0+>
 *
 *  Licensed under GNU General Public License 3.0 or later.
 *  Some rights reserved. See LICENSE, AUTHORS.
 **/


var stately = require('stately.js');

var currentState = {
  "uuid": null,
  "dashboard": 1,
  "reportid": 1
};

var state = new stately({
  'EMPTY': {
    'loadInitial': function (callback) {
      var self = this;

      joolaio.dispatch.state.list(function (err, keys) {
        console.log('keys', keys);
        currentState = JSON.parse(keys);
        self.setMachineState(self.LOADEDINITIAL);
        return callback(null);
      });
    }
  },
  'LOADEDINITIAL': {
    'update': function (uuid, state, callback) {
      var self = this;
      joolaio.dispatch.state.update(state, function (err, res) {
        console.log('update==', err, res);
        currentState = state;
        self.setMachineState(self.SAVED);
        return callback();
      });
    }
  },
  'SAVED': {
    //New state saved
    'save': function (callback) {
      joolaio.dispatch.state.update(currentState, function (err, state) {
        return callback(err, state);
      })
    }
  }
});


state.initial = function () {
  console.log('in initial');
  state.loadInitial(function (err) {
  });
};

state.updateState = function (newState) {

  var uuid = state.generateUUID();

  state.update(newState, function () {
    console.log('in update func');
    state.save(function () {
      console.log('State saved', newState);
    });
  });
}


state.generateUUID = function () {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

state.hashToState = function (hash) {
  var newState = {};
  hash = hash.replace('#', '');
  var h = hash.split('/');
  for (var i = 1; i <= h.length; i++) {
    if (i % 2) {
      newState[h[i - 1]] = h[i];
    }
  }
  return newState;
}

module.exports = exports = state;