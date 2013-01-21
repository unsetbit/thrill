var sinon = require('sinon'),
	mocks = require('mocks'),
	path = require('path'),
	EventEmitter = require('events').EventEmitter,
	adapters = require('../../').adapters,
	mockFs = {},
	theModule = mocks.loadFile(path.resolve(path.dirname(module.filename), '../../lib/server/runner.js'),{
		'./httpServer.js': createMockHttpServer,
		'./thrill.js': createMockThrill,
		'./reporter/unifiedDot.js': createMockReporter,
		'fs': mockFs
	});

function createMockHttpServer(options){
	var mock = {};
	mock.served = ["an.html"];
	mock.serve = sinon.stub().returns(mock.served);
	process.nextTick(function(){options.callback(mock)});
	return mock;
}

function createMockManager(workforce){
	mock = {};
	var emitter = mock.emitter = new EventEmitter();
	mock.api = {};
	mock.api.on = sinon.spy(emitter.on.bind(emitter));
	mock.api.removeListener = sinon.spy(emitter.removeListener.bind(emitter));
	mock.api.id = 1;
	mock.kill = sinon.spy();
	mock.api.start = sinon.spy();
	mock.api.kill = mock.kill;
	mock.start = sinon.spy(function(){emitter.emit('start')});
	workforce.on('dead', function(){emitter.emit('dead');});
	return mock;
}

function createMockWorkforce(){
	var mock = {};
	var emitter = mock.emitter = new EventEmitter();
	mock.populate = sinon.spy();
	mock.api = sinon.spy();
	mock.api.self = mock;
	mock.api.on = sinon.spy(emitter.on.bind(emitter));
	mock.api.removeListener = sinon.spy(emitter.removeListener.bind(emitter));
	mock.api.kill = sinon.spy(function(){emitter.emit('dead')});
	mock.start = sinon.spy(function(){emitter.emit('start')});
	mock.api.start = sinon.spy(function(){emitter.emit('start')});
	mock.api.stop = sinon.spy();

	return mock;
}

function createMockThrill(options){
	var manager = createMockManager(createMockWorkforce().api);
	var mock = sinon.stub().returns(manager.api);
	mock.manager = manager;
	process.nextTick(function(){options.callback(mock)});
	return mock;
}

function createMockReporter(){
	var mock = {};
	var emitter = mock.emitter = new EventEmitter();
	mock.on = sinon.spy(emitter.on.bind(emitter));
	mock.removeListener = sinon.spy(emitter.removeListener.bind(emitter));
	return mock;
}

exports.test = {
	setUp: function(callback){
		callback();
	},
	setDefaults: function(test){
		var base = {};
		theModule.setDefaults(base,{a:1});
		test.equals(base.a, 1, "Default is not setting");

		theModule.setDefaults(base,{a:2});
		test.equals(base.a, 1, "Default is overriding actual setting");
		
		test.done();
	},
	disableStream: function(test){
		var run = "http://www.google.com";
		run = theModule.disableStream(run);
		test.equals(run, "http://www.google.com?disableStream=true", "Disable stream query string not added");

		run = "http://www.google.com?param";
		run = theModule.disableStream(run);
		test.equals(run, "http://www.google.com?param&disableStream=true", "Disable stream query string not added");

		run = ["http://www.google.com"];
		run = theModule.disableStream(run);

		// We can't do a real check because of how mock modules are imported
		test.equal(run.length, 2, "Disable stream file not added");

		test.done();
	},
	autoAdaptFileList: function(test){
		// Empty case
		var fileList = theModule.autoAdaptFileList([]);
		var expected = [];
		test.deepEqual(fileList, expected, "Empty file list should not be adapted");
		
		// Basic case
		fileList = theModule.autoAdaptFileList(["qunit.js"]);
		expected = ["qunit.js", adapters.qunit];
		test.deepEqual(fileList, expected, "Adapter added");

		// No dupe test
		fileList = ["qunit.js", "qunit.js", "qunit.min.js"];
		expected = ["qunit.js", adapters.qunit, "qunit.js", "qunit.min.js"];
		fileList = theModule.autoAdaptFileList(fileList);
		test.deepEqual(fileList, expected, "Empty file list should not be adapted");

		// Multiple adapt
		fileList = ["qunit.js", "mocha.js", "qunit.min.js"];
		expected = ["qunit.js", adapters.qunit, "mocha.js", adapters.mocha, "qunit.min.js"];
		fileList = theModule.autoAdaptFileList(fileList);
		test.deepEqual(fileList, expected, "Empty file list should not be adapted");

		// Funky characters
		fileList = ["qunit'38489- %20$.min.js?4334"];
		expected = ["qunit'38489- %20$.min.js?4334", adapters.qunit];
		fileList = theModule.autoAdaptFileList(fileList);
		test.deepEqual(fileList, expected, "Empty file list should not be adapted");

		test.done();	
	},
	runner: function(test){
		var runner = theModule.runner;

		test.throws(function(){runner();}, "Able to start without a config");

		runner({callback: function(result){
			test.ok(result, "Able to start without a run variable");
		}})
		
		test.doesNotThrow(function(){runner({run: "bob.js"} , function(){console.log(arguments)})});
		
		// This could use some more testing...
		test.done();
	}
};