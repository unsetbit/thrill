var path = require('path');
var dirname = path.dirname(module.filename);

exports.adapterScripts = {
	'qunit': path.resolve(dirname, './dist/thrill-qunit-adapter.js'),
	'mocha': path.resolve(dirname, './dist/thrill-mocha-adapter.js'),
	'jasmine': path.resolve(dirname, './dist/thrill-jasmine-adapter.js')
};

exports.adaptedLibraries = {
	'qunit': path.resolve(dirname, './dist/thrill-qunit.js'),
	'mocha': path.resolve(dirname, './dist/thrill-mocha.js'),
	'jasmine': path.resolve(dirname, './dist/thrill-jasmine.js')
};

exports.thrill = require('./lib/server/thrill.js');
exports.runner = require('./lib/server/runner.js');

