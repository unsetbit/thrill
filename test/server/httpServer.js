var sinon = require('sinon'),
	mocks = require('mocks'),
	path = require('path'),
	theModule = mocks.loadFile(path.resolve(path.dirname(module.filename), '../../lib/server/runner.js'));

exports.test = {
	setUp: function(callback){
		callback();
	},
	construct: function(test){
		test.ok(true);
		test.done();
	}
};