var createTestWorker = require('./testWorker.js').create;
var EventEmitter = require('events').EventEmitter;
var _ = require('underscore'),
	uuid = require('node-uuid');

exports.create = create = function(options){
	var options = options || {},
		emitter = options.emitter || new EventEmitter(),
		testManager = new TestManager(emitter);

	if(options.logger){
		testManager.setLogger(options.logger);
	}

	if(options.scripts){
		testManager.setScripts(options.scripts);
	}

	if(options.workerFilters){
		testManager.setWorkerFilters(options.workerFilters);
	}

	if(options.continuous !== true){
		testManager.on("waiting", function(){
			testManager.kill();
		});
	}

	return testManager;
};

exports.TestManager = TestManager = function(emitter){
	this._id = uuid.v4();
	this._emitter = emitter;
	this._started = false;
	
	this._scripts = void 0;
	
	this._hasPassed = void 0;
	this._results = [];
	this._workerFilters = void 0;
	
	this._workforces = [];
	this._workers = {};
	this._workerCount = 0;
	
	this._logger = void 0;
	this._loggingFunctions = void 0;

	_.bindAll(this, "_workerDoneHandler", "_workerStartedHandler");
};

TestManager.prototype.getId = function(){
	return this._id;
};

TestManager.prototype.setWorkerFilters = function(workerFilters){
	this._workerFilters = workerFilters;
};

TestManager.prototype.getWorkerFilters = function(workerFilters){
	return this._workerFilters;
};

TestManager.prototype.eventsToLog = [
	["info", "started", "Started"],
	["info", "stop", "Stopping"],
	["debug", "stopped", "Stopped"],
	["debug", "running", "Running"]
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


TestManager.prototype.getFiles = function(){
	return this._files;
};

TestManager.prototype.addWorkforce = function(workforce){
	this._workforces.push(workforce);
	workforce.on("workerStarted", this._workerStartedHandler);

	if(this._started){
		this._startWorkforce(workforce);
	}
};

TestManager.prototype._startWorkforce = function(workforce){
	workforce.start();
};

TestManager.prototype._workerStartedHandler = function(data){
	var provider = data.provider,
		socket = data.socket;

	this.addWorker(provider, socket);
};

TestManager.prototype.addWorker = function(provider, socket){
	var self = this,
		worker = createTestWorker(provider, socket),
		workerId = worker.getId();

	this._workers[workerId] = worker;
	this._workerCount += 1;
	if(this._workerCount === 1){
		this._emit("running");
	}

	worker.on("end", this._workerDoneHandler);
	socket.on("done", function(){
		self.removeWorker(workerId);
	});

	this._emit("newWorker", worker);
};

TestManager.prototype.removeWorker = function(workerId){
	if(this._workers[workerId] === void 0){
		return;
	}

	delete this._workers[workerId];
	this._workerCount -= 1;
	if(this._workerCount === 0){
		this._emit("stopped");
		this._emit("waiting");
	}
};

TestManager.prototype._workerDoneHandler = function(worker){
	var result,
		workerHasPassed = worker.hasPassed();

	// If this is the first worker to be done, set status to worker's status
	if(this._hasPassed === void 0){
		this._hasPassed = workerHasPassed;
	} else if(!workerHasPassed){
		this._hasPassed = false;
	}

	result = {
		attributes: worker.getAttributes(),
		details: worker.getDetails(),
		passed: worker.hasPassed()
	}

	this._results.push(result);
	this._emit("result", result);
};

TestManager.prototype.kill = function(){
	this._workforces.forEach(function(workforce){
		workforce.kill();
	});

	this._emit("dead");
};

TestManager.prototype.start = function(){
	var self = this;
	this._started = true;

	this._workforces.forEach(function(workforce){
		self._startWorkforce(workforce);
	});
	this._emit("started");
};

TestManager.prototype.getResults = function(){
	return {
		passed: this._hasPassed,
		results: this._results
	};
};

TestManager.prototype.on = function(event, callback){
	this._emitter.on(event, callback);
};


TestManager.prototype.once = function(event, callback){
	this._emitter.once(event, callback);
};

TestManager.prototype.removeListener = function(event, callback){
	this._emitter.removeListener(event, callback);
};

TestManager.prototype._emit = function(event, data){
	this._emitter.emit(event, data);
};
