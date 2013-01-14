var sinon = require('sinon'),
	mocks = require('mocks'),
	path = require('path'),
	EventEmitter = require('events').EventEmitter,
	theModule = mocks.loadFile(path.resolve(path.dirname(module.filename), '../../lib/server/tester.js'));

var Tester = theModule.Tester;

function createMockWorker(){
	var mock = {};
	var emitter = mock.emitter = new EventEmitter();
	mock.on = sinon.spy(emitter.on.bind(emitter));
	mock.removeListener = sinon.spy(emitter.removeListener.bind(emitter));
	mock.id = 1;
	mock.provider = {};
	mock.kill = sinon.spy();
	return mock;
}

exports.test = {
	setUp: function(callback){
		this.worker = createMockWorker();
		this.tester = new Tester(this.worker);
		callback();
	},
	construct: function(test){
		test.throws(function(){t = theModule.create()}, "Able to construct with missing required params");

		var t = theModule.create(this.worker);
		test.ok(t, "Unable to construct");		

		test.done();
	},
	create: function(test){
		test.throws(function(){new Tester()}, "Able to construct with missing required params");

		var t = new Tester(this.worker);
		test.ok(t instanceof Tester, "Unable to construct");
		test.done();
	},
	passed: function(test){
		test.equals(this.tester.passed, false, "Tester should not be passed if it wasn't started");
		this.tester.end({passed: true});
		test.equals(this.tester.passed, true, "Tester not passed when ended with passing flag");
		test.done();
	},
	kill: function(test){
		var spy = sinon.spy();
		this.tester.api.on('dead', spy);

		this.tester.kill();
		test.equals(spy.callCount, 1, "Tester death not emitted");

		this.tester.kill();
		test.equals(spy.callCount, 1, "Tester death emitted twice");
		test.done();	
	},
	end: function(test){
		this.tester.end();
		test.equals(this.worker.kill.callCount, 1, "Tester ended but worker not killed");
		test.done();		
	},
	workerDeath: function(test){
		this.worker.kill();
		
		var spy = sinon.spy();
		this.tester.api.on('dead', spy);
		this.worker.emitter.emit('dead');
		test.equals(spy.callCount, 1, "Tester not killed when worker died");
		test.done();
	},
	batch: function(test){
		this.tester.messageHandler = sinon.spy();
		this.tester.batch([1,2,3]);
		test.equals(this.tester.messageHandler.callCount, 3, "Message handler not passed the batch message");
		test.done();
	},
	messageHandler: function(test){
		this.tester.batch = sinon.spy();
		this.tester.messageHandler([theModule.MESSAGE_TYPE['batch'], []]);
		test.equals(this.tester.batch.callCount, 1, "Message handler not relaying messages");
		test.done();	
	}
};