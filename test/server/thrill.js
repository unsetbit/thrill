var sinon = require('sinon'),
	mocks = require('mocks'),
	path = require('path'),
	EventEmitter = require('events').EventEmitter,
	theModule = mocks.loadFile(path.resolve(path.dirname(module.filename), '../../lib/server/thrill.js'), {
		'./test.js': { create: createMockTest }
	});

function createMockTest(workforce){
	mock = {};
	var emitter = mock.emitter = new EventEmitter();
	mock.api = {};
	mock.api.on = sinon.spy(emitter.on.bind(emitter));
	mock.api.removeListener = sinon.spy(emitter.removeListener.bind(emitter));
	mock.api.id = 1;
	mock.kill = sinon.spy();
	mock.api.kill = mock.kill;
	mock.start = sinon.spy(function(){emitter.emit('start')});
	workforce.on('dead', function(){emitter.emit('dead');});
	return mock;
}

var Thrill = theModule.Thrill;

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

function createMockQueen(){
	var workforce = createMockWorkforce();
	var mock = sinon.stub().returns(workforce.api);
	var emitter = mock.emitter = new EventEmitter();
	mock.on = sinon.spy(emitter.on.bind(emitter));
	mock.removeListener = sinon.spy(emitter.removeListener.bind(emitter));
	mock.kill = sinon.stub();
	mock.workerProviders = [];
	return mock;
}

exports.thrill = {
	setUp: function(callback){
		this.queen = createMockQueen();
		this.thrill = new Thrill(this.queen);
		callback();
	},
	construct: function(test){
		test.throws(function(){t = theModule.create()}, "Able to construct with missing required params");

		var t = theModule.create({queen: this.queen});
		test.ok(t, "Unable to construct");		

		test.done();
	},
	create: function(test){
		test.throws(function(){new Thrill()}, "Able to construct with missing required params");

		var t = new Thrill(this.queen);
		test.ok(t instanceof Thrill, "Unable to construct");
		test.done();
	},
	getTest: function(test){
		var spy = sinon.spy();
		this.thrill.api.on('test', spy);
		
		var t = this.thrill.getTest({run : ""});
		
		test.equals(spy.callCount, 1, "Test event not fired when test created");
		
		test.done();
	},
	killTestWhenNoWorkerProvider: function(test){
		test.expect(1);
		var spy = sinon.spy();

		var t = this.thrill.getTest({run : ""});
		t.on('dead', spy);

		
		setTimeout(function(){
			test.equals(spy.callCount, 1, "Test not killed when there were no worker providers");
			test.done();	
		},2);
	},
	dontKillTestWhenInManual: function(test){
		test.expect(1);
		var spy = sinon.spy();

		var t = this.thrill.getTest({
			run : "",
			populate: "manual"
		});
		t.on('dead', spy);
		
		setTimeout(function(){
			test.equals(spy.callCount, 0, "Test not killed when there were no worker providers");
			test.done();	
		},2);
	},
	dontKillTestWhenInContinous: function(test){
		test.expect(1);
		var spy = sinon.spy();

		var t = this.thrill.getTest({
			run : "",
			populate: "continuous"
		});
		t.on('dead', spy);
		
		setTimeout(function(){
			test.equals(spy.callCount, 0, "Test not killed when there were no worker providers");
			test.done();	
		},2);
	},
	autoStart: function(test){
		test.expect(1);
		var spy = sinon.spy();

		var t = this.thrill.getTest({
			run : ""
		});
		t.on('start', spy);
		
		setTimeout(function(){
			test.equals(spy.callCount, 1, "Test not started by default");
			test.done();	
		},2);
	},
	dontAutoStart: function(test){
		test.expect(1);
		var spy = sinon.spy();

		var t = this.thrill.getTest({
			run : "",
			autoStart: false
		});
		t.on('start', spy);
		
		setTimeout(function(){
			test.equals(spy.callCount, 0, "Test not started by default");
			test.done();	
		},2);
	},
	kill: function(test){
		var spy = sinon.spy();

		// create manual test that won't die automatically
		var t = this.thrill.getTest({
			run : "",
			populate: "manual"
		});

		this.thrill.kill();

		test.equals(t.kill.callCount, 1, "Test not killed when thrill died");
		test.equals(this.queen.kill.callCount, 1, "Queen not killed when thrill died.");

		test.done();
	}
};