/**
 *  @title joola.io/lib/dispatch/sers
 *  @overview Provides user management functionality across the framework.
 *  @description
 *  The `users` dispatch manages the entire flow relating to users, for example: listing or adding a user.
 *  The module follows the guidelines and flow defined in [Disptach Flow](dispatch-flow).
 *
 * - [list](#list)
 * - [get](#get)
 * - [add](#add)
 * - [update](#update)
 * - [delete](#delete)
 *
 *  @copyright (c) Joola Smart Solutions, Ltd. <info@joo.la>
 *  @license GPL-3.0+ <http://spdx.org/licenses/GPL-3.0+>. Some rights reserved. See LICENSE, AUTHORS
 **/
var
  router = require('../webserver/routes/index'),
  Proto = require('./prototypes/state');

/**
 * @function get
 * @param {Function} [callback] called following execution with errors and results.
 * Gets a specific user by username:
 *
 * The function calls on completion an optional `callback` with:
 * - `err` if occured, an error object, else null.
 * - `result` contains the requested user.
 *
 * Configuration elements participating: `config:authentication:users`.
 *
 * Events raised via `dispatch`: `users:get-request`, `users:get-done`
 *
 * ```js
 * joola.dispatch.users.get('tester', function(err, result) {
 *   console.log(err, result);
 * }
 * ```
 */
exports.list = {
  name: "/api/state/list",
  description: "I list the current state",
  inputs: [],
  _outputExample: {},
  _permission: ['manage_system'],
  dispatch: function () {
    var self = this;
    joola.dispatch.on('state:list-request', function () {
      joola.logger.debug('Listing state');
      self.run(function (err, value) {
        if (err)
          return joola.dispatch.emit('state:list-done', {err: err});

        joola.dispatch.emit('state:list-done', {err: null, message: value});
      });
    });
  },
  route: function (req, res) {
    joola.dispatch.emitWait('state:list-request', {}, function (err, state) {

      if (err) {
        return router.responseError(new router.ErrorTemplate('Failed to list state: ' + (typeof(err) === 'object' ? err.message : err)), req, res);
      }

      return router.responseSuccess(state, req, res);
    });
  },
  run: function (callback) {
    callback = callback || emptyfunc;
    joola.redis.get('state:initial', function (err, value) {
      if (err) {
        return callback(err);
      }

      if (typeof value === 'undefined')
        value = {};

      return callback(null, value);
    });
  }
};


exports.update = {
  name: "/api/state/update",
  description: "I update a state",
  inputs: ['state'],
  _outputExample: {},
  _permission: ['manage_system'],
  dispatch: function () {
    var self = this;
    joola.dispatch.on('state:update-request', function (channel, state) {
      joola.logger.debug('Update state request');
      self.run(state, function (err, value) {
        if (err)
          return joola.dispatch.emit('state:update-done', {err: err});

        joola.dispatch.emit('state:update-done', {err: null, message: value});
      });
    });
  },
  route: function (req, res) {
    try {
      var state = {
        reportid: req.params.state.reportid,
        dashboard: req.params.state.dashboard
      };
      
      joola.dispatch.emitWait('state:update-request', state, function (err, _state) {
        if (err)
          return router.responseError(new router.ErrorTemplate('Failed to update state: ' + (typeof(err) === 'object' ? err.message : err)), req, res);
        return router.responseSuccess(_state, req, res);
      });
    }
    catch (err) {
      return router.responseError(new router.ErrorTemplate(err), req, res);
    }
  },
  run: function (state, callback) {
    callback = callback || emptyfunc;
    try {
      state = new Proto(state);
    } catch (ex) {
      return callback(ex);
    }

    joola.redis.set('state:userid', JSON.stringify(state), function (err) {
      if (err)
        return callback(err);

      return callback(err, state);
    });

  }
};