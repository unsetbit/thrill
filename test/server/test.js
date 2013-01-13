var sinon = require('sinon'),
	mocks = require('mocks'),
	path = require('path'),
	EventEmitter = require('events').EventEmitter,
	theModule = mocks.loadFile(path.resolve(path.dirname(module.filename), '../../lib/server/test.js'),
		{
			'./tester.js': { create: createMockTester }
		}
	);

var Test = theModule.Test;

function createMockTester(worker){
	mock = {};
	var emitter = mock.emitter = new EventEmitter();
	mock.on = sinon.spy(emitter.on.bind(emitter));
	mock.removeListener = sinon.spy(emitter.removeListener.bind(emitter));
	mock.passed = false;

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

exports.test = {
	setUp: function(callback){
		this.workforce = createMockWorkforce();
		this.t = new Test(this.workforce.api);
		callback();
	},
	construct: function(test){
		
		test.throws(function(){t = theModule.create()}, "Able to construct with missing required params");

		var t = theModule.create(createMockWorkforce().api);
		test.ok(t instanceof Test, "Unable to construct");		

		test.done();
	},
	create: function(test){
		test.throws(function(){new Test()}, "Able to construct with missing required params");

		var t = new Test(createMockWorkforce().api);
		test.ok(t instanceof Test, "Unable to construct");
		test.done();
	},
	workforceDeath: function(test){
		var spy = sinon.spy();
		this.t.api.on('dead', spy);
		this.workforce.emitter.emit('dead');

		test.equals(spy.callCount, 1, "Test not killed when workforce died");
		test.done();
	},
	stopOnWorkforceDeath: function(test){
		var spy = sinon.spy();
	
		this.t.api.on('stop', spy);
		this.t.started = true;
		this.workforce.emitter.emit('dead');

		test.equals(spy.callCount, 1, "Test not stopped when workforce died");	
		test.done();
	},
	start: function(test){
		var spy = sinon.spy();
	
		this.t.api.on('start', spy);

		this.t.start();

		test.equals(spy.callCount, 1, "Start event not fired");
		test.equals(this.workforce.api.start.callCount, 1, "Workforce not started");

		this.t.start();
		test.equals(spy.callCount, 1, "Start event fired more than once");
		test.equals(this.workforce.api.start.callCount, 1, "Workforce started more than once");
		test.done();
	},
	deadEvent: function(test){
		var spy = sinon.spy();

		this.t.api.on('dead', spy);
		this.t.kill();
		test.equals(spy.callCount, 1, "Dead event not fired");

		this.t.kill();
		test.equals(spy.callCount, 1, "Dead event fired multiple times");
		test.done();
	},
	handleWorkers: function(test){
		this.t.workerHandler = sinon.spy();
		this.t.start();
		this.workforce.emitter.emit('worker', {});

		test.equals(this.t.workerHandler.callCount, 1, "Worker handler not called");
		test.done();
	},
	workerHandler: function(test){
		var spy = sinon.spy();

		this.t.api.on('tester', spy);
		this.t.workerHandler({});

		test.equals(spy.callCount, 1, "Tester event not fired");
		test.equals(this.t.testerCount, 1, "Tester count not correct");
		test.done();
	},
	testerDead: function(test){
		var tester;
		this.t.api.on('tester', function(t){tester = t});

		this.t.workerHandler({});
		
		this.t.removeTester = sinon.spy();
		tester.emitter.emit('dead');
		test.equals(this.t.removeTester.callCount, 1, "Remove tester not called");
		test.done();
	},
	removeTester: function(test){
		var tester,
			spy = sinon.spy();

		this.t.api.on('stop', spy);
		this.t.api.on('tester', function(t){tester = t});

		this.t.workerHandler({});
		tester.emitter.emit('dead');
		test.equals(this.t.testerCount, 0, "Tester count not correct");
		test.equals(spy.callCount, 1, "Stop not called");
		test.done();
	}
};