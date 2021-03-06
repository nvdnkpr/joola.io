/**
 *  joola.io
 *
 *  Copyright Joola Smart Solutions, Ltd. <info@joo.la>
 *
 *  Licensed under GNU General Public License 3.0 or later.
 *  Some rights reserved. See LICENSE, AUTHORS.
 *
 *  @license GPL-3.0+ <http://spdx.org/licenses/GPL-3.0+>
 */

var
	Browser = require('zombie');

describe('browser-analytics-index', function () {

	xit('should load the index page', function (done) {
		var browser = new Browser({silent: true});
		browser.visit("http://localhost:" + joola.config.interfaces.webserver.port + '/analytics/index', function () {
			expect(browser.text("title")).to.equal('joola.io Management Portal');
			done();
		});
	});

	xit('should load the 404 page', function (done) {
		var browser = new Browser({silent: true});
		browser.visit("http://localhost:" + joola.config.interfaces.webserver.port + '/analytics/index2', function (err) {
			expect(browser.text("title")).to.equal('Page not found');
			done();
		});
	});

	xit('should load system offline page', function (done) {
		var browser = new Browser({silent: true});
		joola.state.set('core', 'offline', 'test in progress');
		setTimeout(function () {
			browser.visit("http://localhost:" + joola.config.interfaces.webserver.port + '/analytics/index', function () {
				joola.state.set('core', 'online', 'init complete');
				setTimeout(function () {
					expect(browser.text("title")).to.equal('Server Offline');
					done();
				}, 3000);
			});
		}, 3000);
	});

	xit('check that we have a valid username', function (done) {
		var browser = new Browser({silent: true});
		browser.visit("http://localhost:" + joola.config.interfaces.webserver.port + '/analytics/index', function () {
			var expected = 'USERNAME';
			var actual = browser.text('.btn.dropdown-toggle');
			//expect(actual).to.equal(expected);
			done();
		});
	});
});