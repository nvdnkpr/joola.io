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
        console.log('keys',keys);
        currentState = JSON.parse(keys);
        self.setMachineState(self.LOADEDINITIAL);
        return callback();
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
      //joola.redis.set('state:current', JSON.stringify(currentState), function() {
      //  return callback();
      //})
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
  state.loadInitial(function () {
    console.log('in loadinitial');
    currentState.reportid = 55;
    state.update(currentState, function () {
      console.log('in update');
      state.save(function () {
        console.log('done', JSON.stringify(currentState));
      });
    });
  });
}

module.exports = exports = state;