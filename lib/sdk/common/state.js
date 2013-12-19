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

var currentState = {};

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
    'update': function (state, callback) {
      var self = this;
      currentState = state;
      self.setMachineState(self.SAVED);
      return callback();
    }
  },
  'SAVED': {
    //New state saved
    'save': function (callback) {
      console.log('in save');
      joolaio.dispatch.state.update(currentState, function(err, state) {
        console.log('running update');
        return callback(err,state);
      })
    }
  },

  'LOADED': {
    'update': function (stateObj) {
      currentState = stateObj;
    }
  },
  'UPDATE': {
    'save': function () {
      //save state to redis and change state to saved
    }
  }
});


state.initial = function () {
  console.log('in initial');
  state.loadInitial(function (err) {    
  });
};

state.updateState = function(newState) {
  state.update(newState, function () {
    state.save(function () {
      console.log('State saved', newState);
    });
  });
}

state.hashToState = function(hash) {
  var newState = {};
  hash = hash.replace('#','');
  var h = hash.split('/');
  for (var i=1; i <= h.length; i++) {
    if (i % 2) {
      newState[h[i-1]] = h[i];
    }
  }
  return newState;
}

module.exports = exports = state;