/**
 *  @title joola.io
 *  @overview the open-source data analytics framework
 *  @copyright Joola Smart Solutions, Ltd. <info@joo.la>
 *  @license GPL-3.0+ <http://spdx.org/licenses/GPL-3.0+>
 *
 *  Licensed under GNU General Public License 3.0 or later.
 *  Some rights reserved. See LICENSE, AUTHORS.
 **/

var
  crypto = require('crypto');

var proto = {
  "_id": "state",
  "reportid": {
    "name": "reportid",
    "description": "The reportid",
    "type": "string",
    "required": true
  },
  "dashboard": {
    "name": "dashboard",
    "description": "The dashboard",
    "type": "string",
    "required": true
  }

};
var State = module.exports = function (options) {
  this._proto = proto;
  this._super = {};
  for (var x in require('./base')) {
    this[x] = require('./base')[x];
    this._super[x] = require('./base')[x];
  }
  var validationErrors = this.validate(options);
  if (validationErrors.length > 0)
    throw new Error('Failed to verify new user, fields: [' + validationErrors.join(',') + ']');

  //options._password = hashPassword(options._password );
  return options;
};

State.proto = proto;