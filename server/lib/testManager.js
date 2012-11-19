var createTester = require('./tester.js').create,
	EventEmitter = require('events').EventEmitter,
	_ = require('underscore'),
	uuid = require('node-uuid');

exports.create = create = function(workforce, workerConfig, options){
	var options = options || {},
		testManager = new TestManager(workforce, workerConfig);

	if(options.logger){
		testManager.setLogger(options.logger);
	}

	return testManager;
};

exports.TestManager = TestManager = function(workforce, workerConfig, timeout){
	this._id = uuid.v4();
	this._emitter = new EventEmitter();
	
	this._workforce = workforce;

	this._workerConfig = workerConfig;
	this._timeout = timeout;
	this._passed = false;
	this._testers = {};
	this._testerCount = 0;
	
	_.bindAll(this, "_testerDeadHandler", 
					"_newWorkerHandler",
					"_workforceDeadHandler");

	workforce.on('dead', this._workforceDeadHandler);
};

TestManager.prototype.getId = function(){
	return this._id;
};

TestManager.prototype.start = function(){
	var self = this,
		workforce = this._workforce;
	
	if(this._started) return; // already started;
	this._started = true;

	workforce.on("newWorker", this._newWorkerHandler);
	workforce.start();

	this._emit("start");
};

TestManager.prototype.passed = function(){
	return this._passed;
};

TestManager.prototype.kill = function(){
	if(this._isDead) return;
	this._isDead = true;

	this._workforce.kill();
	this._emit("dead");
	this._emitter.removeAllListeners();
};

TestManager.prototype._newWorkerHandler = function(worker){
	this._addTester(worker);
};

TestManager.prototype._addTester = function(worker){
	var self = this,
		tester = createTester(worker),
		testers = this._testers,
		testerId = tester.getId();

	tester.on("dead", this._testerDeadHandler);

	testers[testerId] = tester;
	this._testerCount += 1;
	this._emit("newTester", tester);
};

TestManager.prototype._testerDeadHandler = function(tester){
	this._removeTester(tester);
};

TestManager.prototype._removeTester = function(tester){
	var testerId = tester.getId(),
		testers = this._testers;
	
	if(testers[testerId] !== void 0){
		delete testers[testerId];
		this._testerCount -= 1;
		
		if(!tester.passed()){
			this._passed = false;
		}
		
		if(this._testerCount === 0){
			this._emit("stop");
		}
	}
};

TestManager.prototype._workforceDeadHandler = function(){
	this._emit("stop");
	this.kill();
};

// Event Handlers
TestManager.prototype.on = function(event, callback){
	this._emitter.on(event, callback);
};

TestManager.prototype.removeListener = function(event, callback){
	this._emitter.removeListener(event, callback);
};

TestManager.prototype._emit = function(event, data){
	this._emitter.emit(event, data);
};

TestManager.prototype.eventsToLog = [
	["info", "start", "Started"],
	["info", "stop", "Stopped"],
	["info", "newTester", "New tester"],
	["info", "dead", "Dead"]
];

TestManager.prototype.setLogger = function(logger){
	if(this._logger === logger){
		return; // same as existing one
	}
	
	var prefix = "[TestManager-" + this.getId().substr(0,4) + "] ";
	
	if(this._logger !== void 0){
		stopLoggingEvents(this, this._loggingFunctions);
	};

	this._logger = logger;

	if(this._logger !== void 0){
		this._loggingFunctions = logEvents(logger, this, prefix, this.eventsToLog);
	};
};