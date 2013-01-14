var createTester = require('./tester.js').create,
	precondition = require('precondition'),
	EventEmitter = require('events').EventEmitter,
	utils = require('../utils.js');

var create = exports.create = function(workforce, options){
	options = options || {};

	var test = new Test(workforce);

	if(options.logger) test.log = options.logger;

	return test;
};

var getApi = function(test){
	var api = {};
	api.on = test.emitter.on.bind(test.emitter);
	api.removeListener = test.emitter.removeListener.bind(test.emitter);
	api.start = test.start.bind(test);
	
	Object.defineProperty(api, "hasFailure", {
		get: function(){return test.hasFailure;},
		enumarable: true
	});
	
	Object.defineProperty(api, "started", {
		get: function(){return test.started;},
		enumarable: true
	});
	
	Object.defineProperty(api, "dead", {
		get: function(){return test.dead;},
		enumarable: true
	});

	Object.defineProperty(api, "testerCount", {
		get: function(){return test.testerCount;},
		enumarable: true
	});

	return api;
};

var Test = exports.Test = function(workforce){
	precondition.checkDefined(workforce, "Workforce required");

	this.emitter = new EventEmitter();
	
	this.workforce = workforce;

	this.hasFailure = false;
	this.dead = false;
	this.started = false;

	this.testers = {};
	this.testerCount = 0;

	this.kill = utils.once(this.kill.bind(this));

	workforce.on('dead', this.workforceDeadHandler.bind(this));

	this.api = Object.freeze(getApi(this));
};

Test.prototype.log = utils.noop;

Test.prototype.start = function(){
	if(this.dead || this.started) return;
	this.started = true;

	this.workforce.on("worker", this.workerHandler.bind(this));
	this.workforce.start();

	this.emitter.emit("start");
};

Test.prototype.kill = function(){
	if(this.dead) return;
	this.dead = true;
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
			this.started = false;
			this.emitter.emit("stop");
		}
	}
};

Test.prototype.workforceDeadHandler = function(){
	if(this.started){
		this.started = false;
		this.emitter.emit("stop");
	}

	this.kill();
};
