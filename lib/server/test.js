var createTester = require('./tester.js').create,
	EventEmitter = require('events').EventEmitter,
	utils = require('../utils.js');

var create = exports.create = function(workforce, options){
	var options = options || {},
		test = new Test(workforce);

	if(options.logger) test.log = options.logger;

	return test;
};

var getApi = function(test){
	var api = {};
	api.on = test.emitter.on.bind(test.emitter);
	api.removeListener = test.emitter.removeListener.bind(test.emitter);
	api.start = test.start.bind(test);
	
	Object.defineProperty(api, "passed", {
		get: function(){return test.passed;},
		enumarable: true
	});
	return api;
};

exports.Test = Test = function(workforce){
	this.emitter = new EventEmitter();
	
	this.workforce = workforce;

	this.hasFailure = false;
	this.testers = {};
	this.testerCount = 0;

	this.kill = utils.once(this.kill.bind(this));

	workforce.on('dead', this.workforceDeadHandler.bind(this));

	this.api = Object.freeze(getApi(this));
};

Test.prototype.log = utils.noop;

Test.prototype.start = function(){
	if(this.started) return;
	this.started = true;

	this.workforce.on("worker", this.workerHandler.bind(this));
	this.workforce.start();

	this.emitter.emit("start");
};

Test.prototype.kill = function(){
	this.workforce.kill();
	this.emitter.emit("dead");
	this.emitter.removeAllListeners();
};

Test.prototype.workerHandler = function(worker){
	var self = this,
		tester = createTester(worker),
		testers = this.testers;

	tester.on("dead", function(){
		self.removeTester(tester);	
	});

	testers[tester.id] = tester;
	this.testerCount++;
	this.emitter.emit("tester", tester);
};

Test.prototype.removeTester = function(tester){
	var testers = this.testers;
	
	if(testers[tester.id] !== void 0){
		delete testers[tester.id];
		this.testerCount--;
		
		if(!tester.passed){
			this.hasFailure = true;
		}
		
		if(this.testerCount === 0){
			this.emitter.emit("stop");
		}
	}
};

Test.prototype.workforceDeadHandler = function(){
	if(this.testerCount !== 0){
		this.emitter.emit("stop");
	}
	
	this.kill();
};
