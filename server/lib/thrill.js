var _ = require("underscore"),
	createTestManager = require('./testManager.js').create,
	path = require('path'),
	uuid = require('node-uuid'),
	EventEmitter = require('events').EventEmitter,
	fs = require('fs');

exports.create = create = function(workforceProvider, options){
	var options = options || {},
		thrill = new Thrill(workforceProvider);

	if(options.logger){
		thrill.setLogger(options.logger);
	}

	return thrill;
};

exports.Thrill = Thrill = function(workforceProvider, emitter){
	this._id = uuid.v4();
	this._emitter = new EventEmitter();
	
	this._workforceProvider = workforceProvider;
	this._testManagers = [];
	
	this._logger = void 0;
	this._loggingFunctions = void 0;
};

Thrill.prototype.getId = function(){
	return this._id;
};

Thrill.prototype.kill = function(){
	if(this._isDead) return;
	this._isDead = true;
	
	this._testManagers.forEach(function(testManager){
		testManager.kill();
	});
	this._emit("dead");
};

Thrill.prototype.getTestManager = function(workerConfig, options){
	var testManager, 
		options = options || {},
		timeout = options.timeout,
		workforce;

	options.logger = options.logger || this._logger,
	
	workforce = this._workforceProvider.getWorkforce(workerConfig, {
		workerFilters: options.workerFilters,
		timeout: timeout
	});

	testManager = createTestManager(workforce, workerConfig, options);
	
	this._attachTestManager(testManager);
	this._emit("newTestManager", testManager);
	return testManager;
};

Thrill.prototype.run = function(workerConfig, options){
	var testManager = this.getTestManager(workerConfig, options);
	testManager.start();
	return testManager;
};

Thrill.prototype._attachTestManager = function(testManager){
	var self = this,
		index = _.indexOf(this._testManagers, testManager);
	if(index === -1){
		this._testManagers.push(testManager);	
		testManager.on("dead", function(){
			self._detachTestManager(testManager);
		});
	}
};

Thrill.prototype._detachTestManager = function(testManager){
	var index = _.indexOf(this._testManagers, testManager);

	if(index > -1){
		this._testManagers.splice(index, 1);
	}
};


// Event Handlers
Thrill.prototype.on = function(event, callback){
	this._emitter.on(event, callback);
};

Thrill.prototype.removeListener = function(event, callback){
	this._emitter.removeListener(event, callback);
};

Thrill.prototype._emit = function(event, data){
	this._emitter.emit(event, data);
};

// Loggers
Thrill.prototype.eventsToLog = [
	["info", "started", "Started"],
	["debug", "dead", "Dead"]
];

Thrill.prototype.setLogger = function(logger){
	if(this._logger === logger){
		return; // same as existing one
	}
	
	var prefix = "[Thrill-" + this.getId().substr(0,4) + "] ";
	
	if(this._logger !== void 0){
		stopLoggingEvents(this, this._loggingFunctions);
	};

	this._logger = logger;

	if(this._logger !== void 0){
		this._loggingFunctions = logEvents(logger, this, prefix, this.eventsToLog);
	};
};

