/**
 *  @title joola.io
 *  @overview the open-source data analytics framework
 *  @copyright Joola Smart Solutions, Ltd. <info@joo.la>
 *  @license GPL-3.0+ <http://spdx.org/licenses/GPL-3.0+>
 *
 *  Licensed under GNU General Public License 3.0 or later.
 *  Some rights reserved. See LICENSE, AUTHORS.
 **/
var async = require('async');

describe("sdk-users", function () {
	var _bypassToken, _store;

	before(function (done) {

		_bypassToken = joola.config.authentication.bypassToken;
		_store = joola.config.authentication.store;

		_sdk.TOKEN = '123';

		joola.config.set('authentication:store', 'bypass');
		joola.config.set('authentication:bypassToken', '123');

		var calls = [];

		var call = function (callback) {
			joola.config.clear('authentication:users:tester', callback);
		};
		calls.push(call);
		call = function (callback) {
			joola.config.clear('authentication:users:tester1', callback);
		};
		calls.push(call);
		call = function (callback) {
			joola.config.clear('authentication:users:tester-org', callback);
		};
		calls.push(call);
		call = function (callback) {
			joola.config.clear('authentication:users:tester-password', callback);
		};
		calls.push(call);
    call = function (callback) {
      joola.config.clear('authentication:users:tester-sdk-by-token', callback);
    };
    calls.push(call);
		call = function (callback) {
			_sdk.dispatch.organizations.delete({name: 'test-org'}, function () {
				_sdk.dispatch.organizations.add({name: 'test-org'}, callback);
			});
		};
		calls.push(call);
		async.parallel(calls, done);
	});

	it("should have a valid users dispatch", function (done) {
		expect(_sdk.dispatch.users).to.be.ok;
		return done();
	});

	it("should list all available users", function (done) {
		_sdk.dispatch.users.list(function (err, users) {
			return done(err);
		});
	});

	it("should fail adding a user with incomplete details", function (done) {
		var user = {
			username: 'tester2'
		};
		_sdk.dispatch.users.add(user, function (err, user) {
			if (err)
				return done();

			return done(new Error('This should fail'));
		});
	});

	it("should add a user", function (done) {
		var user = {
			username: 'tester',
			displayName: 'tester user',
			_password: '1234',
			_roles: ['user'],
			_filter: '',
			organization: 'test-org'
		};
		_sdk.dispatch.users.add(user, function (err, user) {
			if (err)
				return done(err);
			expect(user.username).to.equal('tester');
			return done();
		});
	});

	it("should encrypt a user password", function (done) {
		var user = {
			username: 'tester-password',
			displayName: 'tester user',
			_password: '1234',
			_roles: ['user'],
			_filter: '',
			organization: 'test-org'
		};
		_sdk.dispatch.users.add(user, function (err, user) {
			if (err)
				return done(err);

			expect(user._password).to.not.equal('1234');
			return done();
		});
	});

	it("should get a user by username", function (done) {
		var username = 'tester';
		_sdk.dispatch.users.get(username, function (err, user) {
			if (err)
				return done(err);
			expect(user).to.be.ok;
			expect(user.username).to.equal('tester');
			return done();
		});
	});

  it("should authenticate users with correct credentials", function (done) {
    _sdk.dispatch.users.authenticate('tester', '1234', function (err, user) {
      if (err)
        return done(err);
      if (!user)
        return done(new Error('We should have a valid user'));
      return done();
    });
  });

  it("should not authenticate users with incorrect credentials", function (done) {
    _sdk.dispatch.users.authenticate('tester', '12345', function (err, user) {
      if (err)
        return done();
      if (!user)
        return done();
      return done(new Error('This should fail'));
    });
  });

  it("should fail adding a user with an already existing username", function (done) {
		var user = {
			username: 'tester',
			displayName: 'tester user',
			_password: '1234',
			_roles: ['user'],
			_filter: '',
			organization: 'test-org'
		};
		_sdk.dispatch.users.add(user, function (err, user) {
			if (err)
				return done();
			return done(new Error('This should fail.'));
		});
	});

	it("should update a user", function (done) {
		var user = {
			username: 'tester',
			displayName: 'testing user',
			_password: '1234',
			_roles: ['user'],
			_filter: '',
			organization: 'test-org'
		};
		_sdk.dispatch.users.add(user, function (err, _user) {
			user.displayName = 'testing user with change';
			_sdk.dispatch.users.update(user, function (err, user) {
				if (err)
					return done(err);

				_sdk.dispatch.users.get(user.username, function (err, _user) {
					if (err)
						return done(err);
					expect(_user).to.be.ok;
					expect(_user.displayName).to.equal('testing user with change');
					return done();
				});
			});
		});
	});

	it("should apply filter on user level", function (done) {
		var user = {
			username: 'tester-org',
			displayName: 'tester user',
			_password: '1234',
			_roles: ['user'],
			_filter: 'test1=test2',
			organization: 'test-org'
		};
		_sdk.dispatch.users.add(user, function (err, user) {
			if (err)
				return done(err);
			expect(user._filter).to.equal('test1=test2');
			return done(err);
		});
	});

	it("should fail updating a non existing user", function (done) {
		var user = {
			username: 'tester2',
			displayName: 'testing user',
			_password: '1234',
			_roles: ['user'],
			_filter: '',
			organization: 'test-org'
		};
		_sdk.dispatch.users.update(user, function (err, user) {
			if (err)
				return done();

			return done(new Error('This should fail'));
		});
	});

	it("should delete a user", function (done) {
		var user = {
			username: 'tester'
		};
		_sdk.dispatch.users.delete(user, function (err, user) {
			if (err)
				return done(err);
			_sdk.dispatch.users.list(function (err, users) {
				if (users[user.username])
					return done('This should fail');
				else
					return done(err);
			});
		});
	});

  it("should get a userby token", function (done) {
    var user = {
      username: 'tester-sdk-by-token',
      displayName: 'tester user',
      _password: '1234',
      _roles: ['user'],
      _filter: '',
      organization: 'test-org'
    };
    _sdk.dispatch.users.add(user, function (err, user) {
      joola.auth.generateToken(user, function (err, token) {
        if (err)
          return done(err);

        _sdk.dispatch.users.getByToken(token._, function (err, _user) {
          if (err)
            return done(err);

          expect(_user.username).to.equal(user.username);
          done(null);
        });
      });
    });
  });

	after(function (done) {
		joola.config.set('authentication:store', _store);
		joola.config.set('authentication:bypassToken', _bypassToken);
		done();
	});
});