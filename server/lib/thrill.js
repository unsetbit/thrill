var _ = require("underscore"),
	createTestManager = require('./testManager.js').create,
	createThrillServer = require('./thrillServer.js').create,
	path = require('path'),
	uuid = require('node-uuid'),
	EventEmitter = require('events').EventEmitter,
	fs = require('fs');

exports.create = create = function(options){
	var options = options || {},
		emitter = options.emitter || new EventEmitter(),
		server = options.server,
		thrill = new Thrill(server, emitter);

	if(options.logger){
		thrill.setLogger(options.logger);
	}

	if(options.workforceProvider){
		thrill.attachWorkforceProvider(options.workforceProvider);
	}

	return thrill;
};

exports.Thrill = Thrill = function(server, emitter){
	this._id = uuid.v4();
	
	this._testManagers = [];
	this._workforceProviders = [];
	this._server = void 0;
	this._emitter = emitter;

	this._logger = void 0;
	this._loggingFunctions = void 0;

	_.bindAll(this, 'run');

	this._setServer(server);
};

Thrill.prototype._setServer = function(server){
	if(this._server !== void 0){
		this._server.removeListener('run', this.run);
	}

	this._server = server;

	if(this._server !== void 0){
		this._server.on('run', this.run);	
	}
}

Thrill.prototype.eventsToLog = [
	["info", "started", "Started"],
	["debug", "dead", "Dead"]
];

Thrill.prototype.getId = function(){
	return this._id;
};

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

Thrill.prototype.attachWorkforceProvider = function(workforceProvider){
	this._workforceProviders.push(workforceProvider);

	this._testManagers.forEach(function(testManager){
		var workforce = workforceProvider.createWorkforce({
			workerFilters: testManager.getWorkerFilters()
		});
		
		testManager.addWorkforce(workforce);
	});
};

Thrill.prototype.detachWorkforceProvider = function(workforceProvider){
	var index = _.indexOf(this._workforceProviders, workforceProvider);

	if(index > -1){
		this._workforceProviders.splice(index, 1);
	}
};

Thrill.prototype.createTestManager = function(settings){
	var self = this,
		servedFiles,
		testManager;

	settings.logger = settings.logger || this._logger,
	servedFiles = this._server.startServing(settings.scripts),
	settings.scripts = servedFiles.urls;
	testManager = createTestManager(settings);

	this._workforceProviders.forEach(function(workforceProvider){
		var workforce = workforceProvider.createWorkforce({
			workerFilters: settings.workerFilters
		});
		testManager.addWorkforce(workforce);
	});

	testManager.on("dead", function(){
		self._server.stopServing(servedFiles.id);
	});
	
	this.attachTestManager(testManager);
	this._emit("newTestManager", testManager);
	return testManager;
};

Thrill.prototype.attachTestManager = function(testManager){
	var self = this,
		index = _.indexOf(this._testManagers, testManager);
	if(index === -1){
		this._testManagers.push(testManager);	
		testManager.on("dead", function(){
			self.detachTestManager(testManager);
		});
	}
};

Thrill.prototype.detachTestManager = function(testManager){
	var index = _.indexOf(this._testManagers, testManager);

	if(index > -1){
		this._testManagers.splice(index, 1);
	}
};

Thrill.prototype.kill = function(){
	this._testManagers.forEach(function(testManager){
		testManager.kill();
	});
	this._emit("dead");
};

Thrill.prototype.run = function(settings){
	var testManager = this.createTestManager(settings);
	testManager.start();
	return testManager;
};

Thrill.prototype.on = function(event, callback){
	this._emitter.on(event, callback);
};

Thrill.prototype.once = function(event, callback){
	this._emitter.once(event, callback);
};

Thrill.prototype.removeListener = function(event, callback){
	this._emitter.removeListener(event, callback);
};

Thrill.prototype._emit = function(event, data){
	this._emitter.emit(event, data);
};
