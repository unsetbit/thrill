var createTester = require('./tester.js').create,
	precondition = require('precondition'),
	EventEmitter = require('events').EventEmitter,
	utils = require('../utils.js');

var create = exports.create = function(workforce, options){
	options = options || {};

	var manager = new Manager(workforce);

	if(options.logger) manager.log = options.logger;

	return manager;
};

var getApi = function(manager){
	var api = {};
	api.on = manager.emitter.on.bind(manager.emitter);
	api.removeListener = manager.emitter.removeListener.bind(manager.emitter);
	api.start = manager.start.bind(manager);
	
	Object.defineProperty(api, "hasFailure", {
		get: function(){return manager.hasFailure;},
		enumarable: true
	});
	
	Object.defineProperty(api, "started", {
		get: function(){return manager.started;},
		enumarable: true
	});
	
	Object.defineProperty(api, "dead", {
		get: function(){return manager.dead;},
		enumarable: true
	});

	Object.defineProperty(api, "testerCount", {
		get: function(){return manager.testerCount;},
		enumarable: true
	});

	return api;
};

var Manager = exports.Manager = function(workforce){
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

Manager.prototype.log = utils.noop;

Manager.prototype.start = function(){
	if(this.dead || this.started) return;
	this.started = true;

	this.workforce.on("worker", this.workerHandler.bind(this));
	this.workforce.start();

	this.emitter.emit("start");
};

Manager.prototype.kill = function(){
	if(this.dead) return;
	this.dead = true;
	this.workforce.kill();
	this.emitter.emit("dead");
	this.emitter.removeAllListeners();
};

Manager.prototype.workerHandler = function(worker){
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

Manager.prototype.removeTester = function(tester){
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

Manager.prototype.workforceDeadHandler = function(){
	if(this.started){
		this.started = false;
		this.emitter.emit("stop");
	}

	this.kill();
};
